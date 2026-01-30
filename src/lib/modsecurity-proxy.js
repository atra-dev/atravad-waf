/**
 * ModSecurity Integration for Proxy WAF
 *
 * Uses libmodsecurity v3 via Node bindings (modsecurity npm).
 * - Request inspection (Phase 1–2) with full body
 * - Response inspection (Phase 4) when enabled
 * - Fallback to pattern-based stub if native bindings are unavailable
 */

import { createRequire } from 'module';
import { getStandaloneConfigForProxy, generateModSecurityConfig } from './modsecurity.js';
import { adminDb } from './firebase-admin';

const requireMod = createRequire(import.meta.url);
let ModSecurityNapi = null;
let RulesNapi = null;
let TransactionNapi = null;
try {
  const mod = requireMod('modsecurity');
  ModSecurityNapi = mod.ModSecurity;
  RulesNapi = mod.Rules;
  TransactionNapi = mod.Transaction;
} catch {
  ModSecurityNapi = null;
  RulesNapi = null;
  TransactionNapi = null;
}

const useNativeModSecurity = Boolean(ModSecurityNapi && RulesNapi && TransactionNapi);

function interventionToMatchedRules(intervention) {
  const matchedRules = [];
  if (!intervention || typeof intervention !== 'object') return matchedRules;
  if (intervention.log && typeof intervention.log === 'string') {
    matchedRules.push({
      id: 0,
      message: intervention.log,
      severity: intervention.status >= 400 ? 'CRITICAL' : 'WARNING',
      matchedData: null,
      matchedVar: null,
    });
  }
  if (intervention.status) {
    matchedRules.push({
      id: 0,
      message: `ModSecurity intervention: ${intervention.status}`,
      severity: intervention.status >= 400 ? 'CRITICAL' : 'WARNING',
      matchedData: null,
      matchedVar: null,
    });
  }
  return matchedRules;
}

function runFallbackInspectRequest(req, _policyId, bodyBuffer = null) {
  const url = req.url || '';
  const headers = req.headers || {};
  const body = (bodyBuffer && Buffer.isBuffer(bodyBuffer))
    ? bodyBuffer.toString('utf8', 0, 65536)
    : ((req.body && Buffer.isBuffer(req.body)) ? req.body.toString('utf8', 0, 65536) : '');

  const sqlPatterns = [
    /\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/i,
    /'|(\\)|;|(\|)|(\*)|(%)/,
    /\bOR\s*=\s*/i,
  ];
  const matchedRules = [];
  let blocked = false;

  for (const pattern of sqlPatterns) {
    if (pattern.test(url) || pattern.test(body)) {
      matchedRules.push({
        id: 100000,
        message: 'SQL Injection pattern detected (fallback)',
        severity: 'CRITICAL',
        matchedData: (url.match(pattern) || body.match(pattern))?.[0],
        matchedVar: 'REQUEST_URI/REQUEST_BODY',
      });
      blocked = true;
      break;
    }
  }
  const ua = (headers['user-agent'] || '').toLowerCase();
  if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('nmap')) {
    matchedRules.push({
      id: 100002,
      message: 'Suspicious User-Agent detected',
      severity: 'WARNING',
      matchedData: headers['user-agent'],
      matchedVar: 'REQUEST_HEADERS:User-Agent',
    });
  }
  return {
    allowed: !blocked,
    blocked,
    matchedRules,
    severity: blocked ? 'CRITICAL' : (matchedRules.length ? 'WARNING' : 'INFO'),
    engine: 'fallback',
  };
}

export class ModSecurityProxy {
  constructor(options = {}) {
    this.policies = new Map();
    this.rulesCache = new Map(); // policyId -> { modsec, rules }
    this.modsec = null;
    this.bodyLimit = options.bodyLimit ?? 13107200;
    this.responseBodyLimit = options.responseBodyLimit ?? 524288;
    this.inspectionTimeout = options.inspectionTimeout ?? 5000;
    this.failOpen = options.failOpen !== false;
    this.responseInspectionEnabled = options.responseInspectionEnabled !== false;
    if (useNativeModSecurity) {
      try {
        this.modsec = new ModSecurityNapi();
        this.modsec.setLogCallback && this.modsec.setLogCallback(() => {});
      } catch {
        this.modsec = null;
      }
    }
  }

  async loadPolicy(policyId) {
    try {
      if (!adminDb) return null;
      const policyDoc = await adminDb.collection('policies').doc(policyId).get();
      if (!policyDoc.exists) return null;
      const policy = policyDoc.data();
      // Generate ModSecurity config from policy flags if not stored (e.g. legacy policies)
      if (!policy.modSecurityConfig && (policy.policy || policy.sqlInjection !== undefined)) {
        policy.modSecurityConfig = generateModSecurityConfig(policy.policy || policy, {
          includeOWASPCRS: policy.includeOWASPCRS !== false,
          mode: policy.mode || 'detection',
        });
      }
      this.policies.set(policyId, policy);

      if (useNativeModSecurity && this.modsec && policy.modSecurityConfig) {
        const standalone = getStandaloneConfigForProxy(policy.modSecurityConfig);
        if (standalone) {
          try {
            const rules = new RulesNapi();
            const ok = rules.add(standalone);
            if (ok) {
              this.rulesCache.set(policyId, { modsec: this.modsec, rules });
            }
          } catch (err) {
            console.warn('ModSecurity rules load failed for policy', policyId, err.message);
          }
        }
      }
      return policy;
    } catch (err) {
      console.error('loadPolicy error:', err);
      return null;
    }
  }

  _getRules(policyId) {
    return this.rulesCache.get(policyId) || null;
  }

  async inspectRequest(req, policyId, bodyBuffer = null) {
    if (!this.policies.has(policyId)) await this.loadPolicy(policyId);
    const policy = this.policies.get(policyId);
    if (!policy || !policy.modSecurityConfig) {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    if (useNativeModSecurity && this.modsec) {
      const cached = this._getRules(policyId);
      if (!cached) await this.loadPolicy(policyId);
      const { rules } = this._getRules(policyId) || {};
      if (!rules) return runFallbackInspectRequest(req, policyId, bodyBuffer);

      const run = () => {
        const tx = new TransactionNapi(this.modsec, rules);
        const remoteAddr = req.socket?.remoteAddress || '127.0.0.1';
        const remotePort = req.socket?.remotePort || 0;
        const localAddr = req.socket?.localAddress || '127.0.0.1';
        const localPort = req.socket?.localPort || 0;

        let res = tx.processConnection(remoteAddr, remotePort, localAddr, localPort);
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
        }

        res = tx.processURI(req.url || '/', req.method || 'GET', req.httpVersion || '1.1');
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
        }

        const raw = req.rawHeaders || [];
        for (let i = 0; i < raw.length; i += 2) {
          tx.addRequestHeader(raw[i], raw[i + 1] ?? '');
        }
        res = tx.processRequestHeaders();
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
        }

        if (bodyBuffer && bodyBuffer.length > 0) {
          res = tx.appendRequestBody(bodyBuffer);
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
          }
          res = tx.processRequestBody();
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
          }
        }

        tx.processLogging && tx.processLogging();
        return { allowed: true, blocked: false, matchedRules: [], engine: 'libmodsecurity' };
      };

      try {
        return await Promise.race([
          Promise.resolve(run()),
          new Promise((_, rej) => setTimeout(() => rej(new Error('inspection timeout')), this.inspectionTimeout)),
        ]);
      } catch (err) {
        if (this.failOpen) {
          console.warn('ModSecurity inspectRequest failed, fail-open:', err.message);
          return { allowed: true, blocked: false, matchedRules: [], engine: 'fail-open' };
        }
        console.warn('ModSecurity inspectRequest failed, fail-closed:', err.message);
        return {
          allowed: false,
          blocked: true,
          matchedRules: [{ id: 0, message: err.message, severity: 'WARNING', matchedData: null, matchedVar: null }],
          engine: 'fail-closed',
        };
      }
    }

    return runFallbackInspectRequest(req, policyId, bodyBuffer);
  }

  /**
   * Inspect a request using an arbitrary ModSecurity config (e.g. for policy test API).
   * Uses native libmodsecurity when available; otherwise fallback pattern-based engine.
   * @param {object} req - Node IncomingMessage (url, method, rawHeaders, socket)
   * @param {string} modSecurityConfig - Full or standalone ModSecurity config text
   * @param {Buffer|null} bodyBuffer - Request body
   * @returns {Promise<{allowed: boolean, blocked: boolean, matchedRules: array, engine: string}>}
   */
  async inspectRequestWithConfig(req, modSecurityConfig, bodyBuffer = null) {
    if (!modSecurityConfig || typeof modSecurityConfig !== 'string') {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    if (useNativeModSecurity && this.modsec) {
      const standalone = getStandaloneConfigForProxy(modSecurityConfig);
      if (!standalone) return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
      try {
        const rules = new RulesNapi();
        const ok = rules.add(standalone);
        if (!ok) return runFallbackInspectRequest(req, null, bodyBuffer);

        const run = () => {
          const tx = new TransactionNapi(this.modsec, rules);
          const remoteAddr = req.socket?.remoteAddress || '127.0.0.1';
          const remotePort = req.socket?.remotePort || 0;
          const localAddr = req.socket?.localAddress || '127.0.0.1';
          const localPort = req.socket?.localPort || 0;

          let res = tx.processConnection(remoteAddr, remotePort, localAddr, localPort);
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
          }
          res = tx.processURI(req.url || '/', req.method || 'GET', req.httpVersion || '1.1');
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
          }
          const raw = req.rawHeaders || [];
          for (let i = 0; i < raw.length; i += 2) {
            tx.addRequestHeader(raw[i], raw[i + 1] ?? '');
          }
          res = tx.processRequestHeaders();
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
          }
          if (bodyBuffer && bodyBuffer.length > 0) {
            res = tx.appendRequestBody(bodyBuffer);
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
            }
            res = tx.processRequestBody();
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: 'libmodsecurity' };
            }
          }
          tx.processLogging && tx.processLogging();
          return { allowed: true, blocked: false, matchedRules: [], engine: 'libmodsecurity' };
        };

        return await Promise.race([
          Promise.resolve(run()),
          new Promise((_, rej) => setTimeout(() => rej(new Error('inspection timeout')), this.inspectionTimeout)),
        ]);
      } catch (err) {
        if (this.failOpen) {
          return { allowed: true, blocked: false, matchedRules: [], engine: 'fail-open' };
        }
        return {
          allowed: false,
          blocked: true,
          matchedRules: [{ id: 0, message: err.message, severity: 'WARNING', matchedData: null, matchedVar: null }],
          engine: 'fail-closed',
        };
      }
    }

    return runFallbackInspectRequest(req, null, bodyBuffer);
  }

  async inspectResponse(responseMeta, policyId) {
    if (!this.responseInspectionEnabled) return { allowed: true, matchedRules: [] };
    if (!this.policies.has(policyId)) await this.loadPolicy(policyId);
    const policy = this.policies.get(policyId);
    if (!policy || !policy.modSecurityConfig) return { allowed: true, matchedRules: [] };

    if (useNativeModSecurity && this.modsec) {
      const cached = this._getRules(policyId);
      if (!cached) return { allowed: true, matchedRules: [] };
      const { rules } = cached;
      if (!rules) return { allowed: true, matchedRules: [] };

      try {
        const tx = new TransactionNapi(this.modsec, rules);
        const status = responseMeta.statusCode ?? 200;
        const protocol = responseMeta.httpVersion || '1.1';
        const headers = responseMeta.headers || {};
        const rawHeaders = responseMeta.rawHeaders || [];
        for (let i = 0; i < rawHeaders.length; i += 2) {
          tx.addResponseHeader(rawHeaders[i], rawHeaders[i + 1] ?? '');
        }
        let res = tx.processResponseHeaders(status, protocol);
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, matchedRules: interventionToMatchedRules(res) };
        }
        const body = responseMeta.body;
        if (body && body.length > 0) {
          const chunk = body.length > this.responseBodyLimit ? body.subarray(0, this.responseBodyLimit) : body;
          res = tx.appendResponseBody(chunk);
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, matchedRules: interventionToMatchedRules(res) };
          }
          res = tx.processResponseBody();
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, matchedRules: interventionToMatchedRules(res) };
          }
        }
        tx.processLogging && tx.processLogging();
        return { allowed: true, matchedRules: [] };
      } catch {
        return { allowed: true, matchedRules: [] };
      }
    }
    return { allowed: true, matchedRules: [] };
  }

  getBodyLimit() {
    return this.bodyLimit;
  }

  getResponseBodyLimit() {
    return this.responseBodyLimit;
  }

  isNativeEngineAvailable() {
    return useNativeModSecurity && Boolean(this.modsec);
  }
}

export function createModSecurityProxy(options = {}) {
  return new ModSecurityProxy(options);
}
