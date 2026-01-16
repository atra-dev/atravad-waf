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
   * Inspect request using ModSecurity
   * 
   * This is a simplified implementation. In production, you would:
   * 1. Use libmodsecurity Node.js bindings (if available)
   * 2. Or use ModSecurity standalone with proper request formatting
   * 3. Or use a ModSecurity HTTP API service
   */
  async inspectRequest(req, policyId) {
    const policy = this.policies.get(policyId);
    
    if (!policy || !policy.modSecurityConfig) {
      // No policy or ModSecurity config, allow request
      return { allowed: true, matchedRules: [] };
    }

    // For now, return a basic inspection result
    // In production, this would call ModSecurity engine
    // TODO: Implement actual ModSecurity integration
    
    // Basic pattern matching as fallback
    const url = req.url || '';
    const method = req.method || 'GET';
    const headers = req.headers || {};
    
    // Check for obvious SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /('|(\\')|(;)|(\\;)|(\|)|(\\|)|(\*)|(\\*)|(%)|(\\%))/i,
      /(\bOR\b.*=.*)/i,
    ];
    
    const matchedRules = [];
    let blocked = false;
    
    // Check URL
    for (const pattern of sqlPatterns) {
      if (pattern.test(url)) {
        matchedRules.push({
          id: 100000,
          message: 'SQL Injection pattern detected in URL',
          severity: 'CRITICAL',
          matchedData: url.match(pattern)?.[0],
          matchedVar: 'REQUEST_URI',
        });
        blocked = true;
        break;
      }
    }
    
    // Check query string
    if (url.includes('?')) {
      const queryString = url.split('?')[1];
      for (const pattern of sqlPatterns) {
        if (pattern.test(queryString)) {
          matchedRules.push({
            id: 100001,
            message: 'SQL Injection pattern detected in query string',
            severity: 'CRITICAL',
            matchedData: queryString.match(pattern)?.[0],
            matchedVar: 'QUERY_STRING',
          });
          blocked = true;
          break;
        }
      }
    }
    
    // Check headers
    const userAgent = headers['user-agent'] || '';
    if (userAgent.toLowerCase().includes('sqlmap') || 
        userAgent.toLowerCase().includes('nikto') ||
        userAgent.toLowerCase().includes('nmap')) {
      matchedRules.push({
        id: 100002,
        message: 'Suspicious User-Agent detected',
        severity: 'WARNING',
        matchedData: userAgent,
        matchedVar: 'REQUEST_HEADERS:User-Agent',
      });
    }

    return {
      allowed: !blocked,
      blocked,
      matchedRules,
      severity: blocked ? 'CRITICAL' : (matchedRules.length > 0 ? 'WARNING' : 'INFO'),
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
