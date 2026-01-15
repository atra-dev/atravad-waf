# ModSecurity Core Engine Integration

This document describes the ModSecurity integration in ATRAVAD WAF.

## Overview

ATRAVAD WAF uses **ModSecurity** as its core Web Application Firewall engine. ModSecurity is an open-source, cross-platform WAF module that provides powerful rule-based protection against web application attacks.

## Architecture

### Core Components

1. **ModSecurity Engine Library** (`src/lib/modsecurity.js`)
   - Comprehensive rule generation
   - OWASP CRS integration
   - Configuration validation
   - Rule parsing and evaluation utilities

2. **Policy API** (`src/app/api/policies/route.js`)
   - Policy creation with ModSecurity config generation
   - Configuration validation
   - Version management

3. **Request Testing API** (`src/app/api/modsecurity/test/route.js`)
   - HTTP request evaluation against ModSecurity rules
   - Rule matching detection
   - Blocking decision simulation

## ModSecurity Configuration Generation

### Basic Usage

```javascript
import { generateModSecurityConfig } from '@/lib/modsecurity';

const policy = {
  sqlInjection: true,
  xss: true,
  fileUpload: true,
  pathTraversal: true,
  rce: true,
  rateLimiting: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    burstSize: 10,
  },
};

const config = generateModSecurityConfig(policy, {
  includeOWASPCRS: true,
  ruleIdBase: 100000,
  mode: 'detection', // or 'prevention'
});
```

### Generated Configuration Structure

The generated configuration includes:

1. **Basic ModSecurity Setup**
   - Rule engine configuration
   - Request/response body handling
   - Limits and thresholds

2. **OWASP CRS Integration** (optional)
   - CRS initialization
   - Rule set includes
   - Anomaly scoring setup

3. **Protection Rules**
   - SQL Injection detection (multiple rules)
   - XSS protection (script tags, event handlers)
   - File upload restrictions
   - Path traversal prevention
   - RCE detection
   - Rate limiting

4. **Logging Configuration**
   - Audit log settings
   - Relevant status codes
   - Log parts configuration

## Protection Types

### SQL Injection Protection

Generates multiple layers of SQL injection detection:

- Primary detection using `@detectSQLi` operator
- Request body scanning
- SQL keyword pattern matching
- Union-based attack detection

**Example Rule:**
```apache
SecRule ARGS "@detectSQLi" \
  "id:100000,phase:2,block,msg:'SQL Injection Attack Detected',\
  severity:'CRITICAL',\
  tag:'attack-sqli',\
  tag:'OWASP_CRS'"
```

### XSS Protection

Comprehensive XSS detection including:

- Script tag detection
- JavaScript/VBScript protocol detection
- Event handler detection
- Inline script blocking

**Example Rule:**
```apache
SecRule ARGS "@detectXSS" \
  "id:100100,phase:2,block,msg:'XSS Attack Detected',\
  severity:'CRITICAL',\
  tag:'attack-xss'"
```

### File Upload Protection

Protects against dangerous file uploads:

- Dangerous extension blocking (PHP, EXE, etc.)
- File count limits
- Content type validation

**Example Rule:**
```apache
SecRule FILES_TMPNAMES "@rx \\.(?:php|exe|sh|bat)$" \
  "id:100200,phase:2,block,msg:'Dangerous File Upload Detected',\
  severity:'CRITICAL'"
```

### Path Traversal Protection

Prevents directory traversal attacks:

- `../` pattern detection
- Encoded path traversal detection
- Windows path traversal detection

### Remote Code Execution (RCE) Protection

Detects command injection attempts:

- System command keywords
- Code execution functions
- Script execution patterns

### Rate Limiting

Configurable request rate limiting:

- Requests per minute
- Requests per hour
- Burst size configuration

## OWASP Core Rule Set (CRS) Integration

The platform supports full OWASP CRS 3.3.0 integration. When enabled, the generated configuration includes:

```apache
# OWASP Core Rule Set (CRS) Integration
Include /etc/modsecurity/crs-setup.conf
Include /etc/modsecurity/rules/*.conf
```

### CRS Rule Sets Included

- **REQUEST-901-INITIALIZATION**: CRS setup and initialization
- **REQUEST-905-COMMON-EXCEPTIONS**: Common exception rules
- **REQUEST-910-IP-REPUTATION**: IP reputation checking
- **REQUEST-920-PROTOCOL-ENFORCEMENT**: HTTP protocol validation
- **REQUEST-921-PROTOCOL-ATTACK**: Protocol-level attack detection
- **REQUEST-930-APPLICATION-ATTACK-LFI**: Local File Inclusion
- **REQUEST-931-APPLICATION-ATTACK-RFI**: Remote File Inclusion
- **REQUEST-932-APPLICATION-ATTACK-RCE**: Remote Code Execution
- **REQUEST-941-APPLICATION-ATTACK-XSS**: XSS attacks
- **REQUEST-942-APPLICATION-ATTACK-SQLI**: SQL injection
- **REQUEST-949-BLOCKING-EVALUATION**: Blocking decisions
- **RESPONSE-950-DATA-LEAKAGES**: Data leakage prevention
- **RESPONSE-980-CORRELATION**: Attack correlation

## Request Testing

### Testing Endpoint

Test HTTP requests against ModSecurity rules:

```bash
POST /api/modsecurity/test
Content-Type: application/json
Authorization: Bearer <token>

{
  "policyId": "policy-id-here",
  "testRequest": {
    "method": "GET",
    "url": "/api/users",
    "headers": {
      "User-Agent": "Mozilla/5.0"
    },
    "query": {
      "id": "1' OR '1'='1"
    },
    "body": {}
  }
}
```

### Response Format

```json
{
  "policyId": "policy-id",
  "policyName": "My Policy",
  "policyVersion": 1,
  "evaluation": {
    "allowed": false,
    "blocked": true,
    "matchedRules": [
      {
        "id": 100000,
        "message": "SQL Injection Attack Detected",
        "severity": "CRITICAL",
        "matchedData": "1' OR '1'='1",
        "matchedVar": "id"
      }
    ],
    "severity": "CRITICAL",
    "message": "Request blocked by rule 100000: SQL Injection Attack Detected"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuration Validation

The platform validates generated ModSecurity configurations:

```javascript
import { validateModSecurityConfig } from '@/lib/modsecurity';

const validation = validateModSecurityConfig(config);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

### Validation Checks

- Rule ID presence
- Phase parameter validation
- Action parameter validation
- Basic syntax checking

## Rule ID Management

Rule IDs are automatically assigned starting from a base ID (default: 100000). This ensures:

- No conflicts with OWASP CRS rules (which use lower IDs)
- Consistent ID assignment across policy versions
- Easy identification of custom rules

### Extracting Rule IDs

```javascript
import { extractRuleIds } from '@/lib/modsecurity';

const ruleIds = extractRuleIds(config);
// Returns: [100000, 100001, 100002, ...]
```

## Custom Rules

Support for custom ModSecurity rules:

```javascript
const policy = {
  // ... other protections
  customRules: [
    {
      phase: 2,
      action: 'block',
      msg: 'Custom Attack Detected',
      severity: 'CRITICAL',
      variables: 'ARGS',
      pattern: '(?i)(malicious|pattern)',
      transformations: 't:none,t:lowercase',
    },
  ],
};
```

## Deployment

### Apache ModSecurity

1. Install ModSecurity module for Apache
2. Copy generated configuration to `/etc/modsecurity/`
3. Include in Apache configuration:

```apache
LoadModule security2_module modules/mod_security2.so
<IfModule mod_security2.c>
    Include /etc/modsecurity/modsecurity.conf
    Include /etc/modsecurity/custom-rules.conf
</IfModule>
```

### Nginx ModSecurity

1. Install ModSecurity module for Nginx
2. Configure in Nginx:

```nginx
load_module modules/ngx_http_modsecurity_module.so;

http {
    modsecurity on;
    modsecurity_rules_file /etc/modsecurity/custom-rules.conf;
}
```

### Standalone ModSecurity

Use ModSecurity standalone mode with the generated configuration.

## Best Practices

1. **Always test policies** using the request testing endpoint before deployment
2. **Enable OWASP CRS** for comprehensive protection
3. **Start in detection mode** before switching to prevention
4. **Monitor logs** regularly for false positives
5. **Version control** all policy changes
6. **Use custom rules** sparingly and test thoroughly

## Troubleshooting

### Common Issues

1. **Rules not matching**: Check rule patterns and transformations
2. **False positives**: Adjust rule severity or add exceptions
3. **Performance impact**: Optimize rule order and use phases effectively
4. **Configuration errors**: Use validation utilities before deployment

### Debug Mode

Enable detailed logging in ModSecurity configuration:

```apache
SecDebugLog /var/log/modsec_debug.log
SecDebugLogLevel 9
```

## References

- [ModSecurity Documentation](https://github.com/SpiderLabs/ModSecurity/wiki)
- [OWASP ModSecurity Core Rule Set](https://github.com/coreruleset/coreruleset)
- [ModSecurity Reference Manual](https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual)
