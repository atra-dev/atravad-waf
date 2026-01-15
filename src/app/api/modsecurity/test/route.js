import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { generateModSecurityConfig } from '@/lib/modsecurity';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';

/**
 * ModSecurity Request Testing Endpoint
 * 
 * This endpoint allows testing HTTP requests against ModSecurity rules
 * to verify policy effectiveness before deployment.
 */

/**
 * Simulate ModSecurity rule evaluation
 * This is a simplified simulation - in production, this would interface
 * with actual ModSecurity engine via bindings or API
 */
function evaluateModSecurityRules(requestData, modSecurityConfig) {
  const results = {
    allowed: true,
    blocked: false,
    matchedRules: [],
    severity: 'INFO',
    message: 'Request passed ModSecurity evaluation',
    details: [],
  };

  const { method, url, headers, body, query } = requestData;
  
  // Extract all input data for pattern matching
  const allInputs = {
    ...query,
    ...(body || {}),
  };

  // Convert config to rules array for processing
  const rules = parseModSecurityConfig(modSecurityConfig);

  // Evaluate each rule
  for (const rule of rules) {
    const match = evaluateRule(rule, allInputs, headers, url);
    if (match.matched) {
      results.matchedRules.push({
        id: rule.id,
        message: rule.message,
        severity: rule.severity || 'WARNING',
        matchedData: match.matchedData,
        matchedVar: match.matchedVar,
      });

      if (rule.action === 'block' || rule.action === 'deny') {
        results.blocked = true;
        results.allowed = false;
        results.severity = rule.severity || 'CRITICAL';
        results.message = `Request blocked by rule ${rule.id}: ${rule.message}`;
        break; // Stop evaluation on first block
      }
    }
  }

  return results;
}

/**
 * Parse ModSecurity configuration into rule objects
 */
function parseModSecurityConfig(config) {
  const rules = [];
  const lines = config.split('\n');
  
  let currentRule = null;
  let inRule = false;
  let ruleContent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('SecRule')) {
      // Start of a new rule
      if (currentRule) {
        rules.push(parseRule(currentRule, ruleContent));
      }
      currentRule = trimmed;
      ruleContent = '';
      inRule = true;
    } else if (inRule && trimmed.endsWith('"')) {
      // End of rule
      ruleContent += ' ' + trimmed;
      rules.push(parseRule(currentRule, ruleContent));
      currentRule = null;
      ruleContent = '';
      inRule = false;
    } else if (inRule) {
      ruleContent += ' ' + trimmed;
    }
  }

  if (currentRule) {
    rules.push(parseRule(currentRule, ruleContent));
  }

  return rules;
}

/**
 * Parse a single ModSecurity rule
 */
function parseRule(ruleLine, continuation = '') {
  const fullRule = ruleLine + continuation;
  
  // Extract rule ID
  const idMatch = fullRule.match(/"id:(\d+)/);
  const id = idMatch ? parseInt(idMatch[1], 10) : null;

  // Extract message
  const msgMatch = fullRule.match(/msg:'([^']+)'/);
  const message = msgMatch ? msgMatch[1] : 'Rule triggered';

  // Extract action
  const actionMatch = fullRule.match(/(block|deny|pass|allow)/);
  const action = actionMatch ? actionMatch[1] : 'pass';

  // Extract severity
  const severityMatch = fullRule.match(/severity:'([^']+)'/);
  const severity = severityMatch ? severityMatch[1] : 'WARNING';

  // Extract pattern (simplified - in production would parse full regex)
  const patternMatch = fullRule.match(/@(?:detectSQLi|detectXSS|rx\s+([^"]+))/);
  const pattern = patternMatch ? patternMatch[1] || patternMatch[0] : null;

  // Extract variables
  const varsMatch = fullRule.match(/SecRule\s+([^\s@]+)/);
  const variables = varsMatch ? varsMatch[1] : 'ARGS';

  return {
    id,
    message,
    action,
    severity,
    pattern,
    variables,
    fullRule,
  };
}

/**
 * Evaluate a single rule against request data
 */
function evaluateRule(rule, inputs, headers, url) {
  if (!rule.pattern) {
    return { matched: false };
  }

  // Check all inputs
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      // SQL Injection detection (simplified)
      if (rule.pattern.includes('detectSQLi') || rule.pattern.includes('@detectSQLi')) {
        if (detectSQLInjection(value)) {
          return {
            matched: true,
            matchedData: value,
            matchedVar: key,
          };
        }
      }

      // XSS detection (simplified)
      if (rule.pattern.includes('detectXSS') || rule.pattern.includes('@detectXSS')) {
        if (detectXSS(value)) {
          return {
            matched: true,
            matchedData: value,
            matchedVar: key,
          };
        }
      }

      // Regex pattern matching
      if (rule.pattern.startsWith('(') || rule.pattern.includes('\\b')) {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(value)) {
            return {
              matched: true,
              matchedData: value,
              matchedVar: key,
            };
          }
        } catch (e) {
          // Invalid regex, skip
        }
      }
    }
  }

  // Check URL
  if (url && rule.pattern) {
    try {
      const regex = new RegExp(rule.pattern, 'i');
      if (regex.test(url)) {
        return {
          matched: true,
          matchedData: url,
          matchedVar: 'REQUEST_URI',
        };
      }
    } catch (e) {
      // Invalid regex, skip
    }
  }

  return { matched: false };
}

/**
 * Simplified SQL Injection detection
 */
function detectSQLInjection(input) {
  if (typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)/i,
    /('|(\\')|(;)|(--)|(\/\*)|(\*\/)|(\+)|(\%)|(\=))/i,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Simplified XSS detection
 */
function detectXSS(input) {
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe[^>]*>/i,
    /<img[^>]*onerror/i,
    /<svg[^>]*onload/i,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      policyId, 
      testRequest 
    } = body;

    if (!policyId || !testRequest) {
      return NextResponse.json(
        { error: 'policyId and testRequest are required' },
        { status: 400 }
      );
    }

    // Fetch the policy
    const policyDoc = await adminDb.collection('policies').doc(policyId).get();
    if (!policyDoc.exists) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    const policyData = policyDoc.data();
    if (policyData.tenantName !== tenantName) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get ModSecurity config (generate if not stored)
    let modSecurityConfig = policyData.modSecurityConfig;
    if (!modSecurityConfig) {
      modSecurityConfig = generateModSecurityConfig(policyData.policy || {});
    }

    // Evaluate the test request
    const evaluationResult = evaluateModSecurityRules(testRequest, modSecurityConfig);

    return NextResponse.json({
      policyId,
      policyName: policyData.name,
      policyVersion: policyData.version,
      evaluation: evaluationResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error testing ModSecurity rules:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
