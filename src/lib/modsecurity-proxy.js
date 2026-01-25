/**
 * ModSecurity Integration for Proxy WAF
 * 
 * Integrates ModSecurity v3 with the proxy server for request/response inspection.
 * 
 * Note: This requires ModSecurity v3 (libmodsecurity) to be installed.
 * For Node.js, we can use:
 * 1. Native bindings (if available)
 * 2. Child process execution
 * 3. HTTP API to ModSecurity service
 * 
 * This implementation uses a hybrid approach with fallbacks.
 */

import { spawn } from 'child_process';
import { adminDb } from './firebase-admin';

/**
 * ModSecurity Proxy Integration
 */
export class ModSecurityProxy {
  constructor(options = {}) {
    this.policies = new Map(); // policyId -> ModSecurity config
    this.modSecurityPath = options.modSecurityPath || '/usr/local/bin/modsec-rules-checker';
    this.useStandalone = options.useStandalone !== false; // Use standalone ModSecurity
    this.cacheSize = options.cacheSize || 1000;
    this.defaultMode = options.defaultMode || 'prevention';
  }

  /**
   * Load policy configuration
   */
  async loadPolicy(policyId) {
    try {
      if (!adminDb) {
        console.warn('Firebase Admin not initialized');
        return null;
      }

      const policyDoc = await adminDb.collection('policies').doc(policyId).get();
      
      if (!policyDoc.exists) {
        return null;
      }

      const policy = policyDoc.data();
      this.policies.set(policyId, policy);
      
      return policy;
    } catch (error) {
      console.error('Error loading policy:', error);
      return null;
    }
  }

  /**
   * Lightweight rule evaluation to approximate ModSecurity behaviour when
   * libmodsecurity is unavailable. This keeps request flow testable in
   * environments without native bindings.
   */
  evaluateRequestFallback(req, policy) {
    const url = req.url || '';
    const method = req.method || 'GET';
    const headers = req.headers || {};
    const ua = (headers['user-agent'] || '').toLowerCase();
    const host = headers.host || '';
    const bodyLength = Number(headers['content-length'] || 0);

    const rules = [];
    const addRule = (id, message, matchedVar, matchedData, severity = 'CRITICAL') => {
      rules.push({ id, message, severity, matchedVar, matchedData });
    };

    // SQLi detection
    if (policy?.sqlInjection !== false) {
      const sqlPatterns = [
        /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(\bOR\b.+\=.+)/i,
        /(--|#|;)/,
      ];
      if (sqlPatterns.some((p) => p.test(url))) {
        addRule(100000, 'SQL Injection pattern detected in URL', 'REQUEST_URI', url.match(sqlPatterns.find((p) => p.test(url)))?.[0]);
      }
      if (sqlPatterns.some((p) => p.test(host))) {
        addRule(100001, 'SQL Injection pattern detected in Host', 'REQUEST_HEADERS:Host', host);
      }
    }

    // XSS detection
    if (policy?.xss !== false) {
      const xssPatterns = [
        /<\s*script/gi,
        /javascript:/i,
        /on\w+\s*=/i,
      ];
      if (xssPatterns.some((p) => p.test(url))) {
        addRule(100100, 'XSS pattern detected in URL', 'REQUEST_URI', url.match(xssPatterns.find((p) => p.test(url)))?.[0], 'CRITICAL');
      }
    }

    // Path traversal
    if (policy?.pathTraversal !== false && /\.\.\//.test(url)) {
      addRule(100200, 'Path traversal detected', 'REQUEST_URI', '../');
    }

    // RCE / dangerous commands
    if (policy?.rce !== false) {
      const rcePatterns = [/(\b(wget|curl|bash|sh|powershell)\b)/i, /(\b(eval|exec|system|passthru)\b)/i];
      if (rcePatterns.some((p) => p.test(url))) {
        addRule(100300, 'Remote code execution pattern detected', 'REQUEST_URI', url.match(rcePatterns.find((p) => p.test(url)))?.[0]);
      }
    }

    // User-Agent probes
    if (ua.includes('sqlmap') || ua.includes('nikto') || ua.includes('nmap')) {
      addRule(100400, 'Suspicious scanner User-Agent', 'REQUEST_HEADERS:User-Agent', headers['user-agent'], 'WARNING');
    }

    // Basic request size guard (aligns with body buffering limits)
    if (policy?.maxBodyBytes && bodyLength > policy.maxBodyBytes) {
      addRule(100500, `Request body exceeds limit (${bodyLength} > ${policy.maxBodyBytes})`, 'REQUEST_HEADERS:Content-Length', String(bodyLength));
    }

    const blocked = rules.some((r) => r.severity === 'CRITICAL');
    return { matchedRules: rules, blocked };
  }

  /**
   * Inspect request using ModSecurity
   * 
   * This is a simplified implementation. In production, you would:
   * 1. Use libmodsecurity Node.js bindings (if available)
   * 2. Or use ModSecurity standalone with proper request formatting
   * 3. Or use a ModSecurity HTTP API service
   */
  async inspectRequest(req, policyId, overrideMode) {
    // Ensure policy is loaded
    if (!this.policies.has(policyId)) {
      await this.loadPolicy(policyId);
    }
    
    const policy = this.policies.get(policyId);
    
    if (!policy) {
      // No policy found, allow request
      return { allowed: true, matchedRules: [] };
    }

    // Fallback evaluator if native ModSecurity is unavailable
    const result = this.evaluateRequestFallback(req, policy);
    const mode = overrideMode || policy.mode || this.defaultMode;
    const blocked = mode === 'prevention' ? result.blocked : false;

    return {
      allowed: !blocked,
      blocked,
      matchedRules: result.matchedRules,
      severity: blocked ? 'CRITICAL' : (result.matchedRules.length > 0 ? 'WARNING' : 'INFO'),
      mode,
    };
  }

  /**
   * Inspect response using ModSecurity (Phase 4)
   */
  async inspectResponse(res, req, policyId) {
    const policy = this.policies.get(policyId);
    
    if (!policy || !policy.modSecurityConfig) {
      return { allowed: true, matchedRules: [] };
    }

    // Response inspection would check for:
    // - Data leakage (credit cards, SSNs, etc.)
    // - Sensitive information exposure
    // - Security headers presence
    
    // For now, return basic inspection
    // TODO: Implement actual ModSecurity response inspection
    
    return {
      allowed: true,
      matchedRules: [],
    };
  }

  /**
   * Format request for ModSecurity standalone
   */
  formatRequestForModSecurity(req) {
    // Format request in ModSecurity audit log format
    // This is a simplified version
    const lines = [];
    
    lines.push(`[${new Date().toISOString()}] ${req.method} ${req.url} HTTP/1.1`);
    lines.push(`Host: ${req.headers.host || ''}`);
    
    // Add other headers
    Object.entries(req.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'host') {
        lines.push(`${key}: ${value}`);
      }
    });
    
    return lines.join('\n');
  }

  /**
   * Execute ModSecurity standalone (if available)
   */
  async executeModSecurityStandalone(requestData, configPath) {
    return new Promise((resolve, reject) => {
      // This would execute modsec-rules-checker or similar
      // For now, return a mock result
      resolve({
        allowed: true,
        matchedRules: [],
      });
    });
  }
}

/**
 * Create ModSecurity proxy instance
 */
export function createModSecurityProxy(options = {}) {
  return new ModSecurityProxy(options);
}
