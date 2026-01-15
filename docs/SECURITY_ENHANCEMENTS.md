# Security Policy Enhancements - ModSecurity & OWASP Integration

## Overview

This document describes the comprehensive security policy enhancements made to align ATRAVAD WAF with ModSecurity and OWASP best practices. These enhancements provide enterprise-grade protection against the OWASP Top 10 and additional security threats.

## Enhanced ModSecurity Configuration

### Base Configuration Improvements

1. **Enhanced OWASP CRS Integration**
   - Explicit inclusion of all OWASP CRS 3.3.0 rule sets
   - Individual rule set includes for better control and visibility
   - Proper rule ordering and dependency management

2. **Improved Logging Configuration**
   - Enhanced audit log settings with proper directory permissions
   - File mode and directory mode configuration
   - Log rotation and storage management

3. **Better Error Handling**
   - Mode-aware default actions (detection vs prevention)
   - Proper HTTP status codes (403 for prevention mode)
   - Comprehensive audit logging

### OWASP CRS Rule Sets Included

All OWASP CRS 3.3.0 rule sets are now explicitly included:

**Request Rules:**
- REQUEST-901-INITIALIZATION
- REQUEST-905-COMMON-EXCEPTIONS
- REQUEST-910-IP-REPUTATION
- REQUEST-911-METHOD-ENFORCEMENT
- REQUEST-912-DOS-PROTECTION
- REQUEST-913-SCANNER-DETECTION
- REQUEST-920-PROTOCOL-ENFORCEMENT
- REQUEST-921-PROTOCOL-ATTACK
- REQUEST-930-APPLICATION-ATTACK-LFI
- REQUEST-931-APPLICATION-ATTACK-RFI
- REQUEST-932-APPLICATION-ATTACK-RCE
- REQUEST-933-APPLICATION-ATTACK-PHP
- REQUEST-934-APPLICATION-ATTACK-NODEJS
- REQUEST-941-APPLICATION-ATTACK-XSS
- REQUEST-942-APPLICATION-ATTACK-SQLI
- REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION
- REQUEST-944-APPLICATION-ATTACK-JAVA
- REQUEST-949-BLOCKING-EVALUATION

**Response Rules:**
- RESPONSE-950-DATA-LEAKAGES
- RESPONSE-951-DATA-LEAKAGES-SQL
- RESPONSE-952-DATA-LEAKAGES-JAVA
- RESPONSE-953-DATA-LEAKAGES-PHP
- RESPONSE-954-DATA-LEAKAGES-IIS
- RESPONSE-959-BLOCKING-EVALUATION
- RESPONSE-980-CORRELATION

## New OWASP Top 10 Protection Types

### 1. CSRF (Cross-Site Request Forgery) Protection

**Protection Features:**
- CSRF token validation for state-changing HTTP methods (POST, PUT, DELETE, PATCH)
- Origin header validation
- Referer header validation
- Automatic anomaly scoring

**Configuration:**
```javascript
{
  csrf: true
}
```

**Generated Rules:**
- Rule ID Base: 100500 (when enabled)
- Validates CSRF tokens in requests
- Checks Origin and Referer headers
- Blocks requests with missing or invalid tokens

### 2. Session Fixation Protection

**Protection Features:**
- Session ID pattern detection
- Multiple session cookie detection
- Suspicious session manipulation detection

**Configuration:**
```javascript
{
  sessionFixation: true
}
```

**Generated Rules:**
- Rule ID Base: 100600 (when enabled)
- Detects suspicious session ID patterns
- Monitors session cookie counts
- Alerts on potential session fixation attempts

### 3. SSRF (Server-Side Request Forgery) Protection

**Protection Features:**
- Internal IP address detection (127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x)
- Dangerous URL scheme detection (file://, gopher://, dict://, etc.)
- Cloud metadata endpoint detection (AWS, Azure, GCP)

**Configuration:**
```javascript
{
  ssrf: true
}
```

**Generated Rules:**
- Rule ID Base: 100700 (when enabled)
- Blocks internal IP addresses in requests
- Prevents dangerous URL schemes
- Protects against cloud metadata endpoint access

### 4. XXE (XML External Entity) Protection

**Protection Features:**
- External entity declaration detection
- External entity reference detection
- Suspicious XML processing instruction detection

**Configuration:**
```javascript
{
  xxe: true
}
```

**Generated Rules:**
- Rule ID Base: 100800 (when enabled)
- Detects XML external entity declarations
- Blocks external entity references
- Monitors XML processing instructions

### 5. Authentication Bypass Protection

**Protection Features:**
- SQL injection in authentication parameters
- Common authentication bypass patterns
- Weak password pattern detection

**Configuration:**
```javascript
{
  authBypass: true
}
```

**Generated Rules:**
- Rule ID Base: 100900 (when enabled)
- Detects SQL injection in auth parameters
- Blocks common bypass patterns (admin'--, 'OR '1'='1, etc.)
- Alerts on weak password patterns

### 6. IDOR (Insecure Direct Object Reference) Protection

**Protection Features:**
- Sequential ID detection
- System file access attempt detection
- Privileged endpoint access monitoring

**Configuration:**
```javascript
{
  idor: true
}
```

**Generated Rules:**
- Rule ID Base: 101000 (when enabled)
- Monitors direct object references
- Blocks system file access attempts
- Tracks privileged endpoint access

### 7. Security Misconfiguration Detection

**Protection Features:**
- Exposed configuration file detection (.git, .env, .config, etc.)
- Default credentials detection
- Debug/development endpoint detection

**Configuration:**
```javascript
{
  securityMisconfig: true
}
```

**Generated Rules:**
- Rule ID Base: 101100 (when enabled)
- Blocks access to configuration files
- Detects default credential usage
- Prevents access to debug endpoints

### 8. Sensitive Data Exposure Protection

**Protection Features:**
- Credit card number detection in responses
- SSN detection in responses
- API keys and tokens detection in responses
- Database connection string detection

**Configuration:**
```javascript
{
  sensitiveDataExposure: true
}
```

**Generated Rules:**
- Rule ID Base: 101200 (when enabled)
- Monitors response bodies for sensitive data
- Blocks responses containing credit card numbers
- Detects API keys and tokens in responses
- Prevents database connection string exposure

### 9. Broken Access Control Protection

**Protection Features:**
- Privileged endpoint access detection
- Unauthorized HTTP method detection
- Privilege escalation attempt detection

**Configuration:**
```javascript
{
  brokenAccessControl: true
}
```

**Generated Rules:**
- Rule ID Base: 101300 (when enabled)
- Monitors admin/privileged endpoint access
- Blocks unauthorized HTTP methods (TRACE, TRACK, CONNECT, OPTIONS)
- Detects privilege escalation attempts

### 10. Security Headers Enforcement

**Protection Features:**
- X-Frame-Options header monitoring
- X-Content-Type-Options header monitoring
- Security header presence validation

**Configuration:**
```javascript
{
  securityHeaders: true
}
```

**Generated Rules:**
- Rule ID Base: 101400 (when enabled)
- Monitors security header presence
- Alerts on missing security headers
- Documents recommended security headers

## Enhanced Existing Protections

### SQL Injection Protection (Enhanced)

**Improvements:**
- Enhanced SQL keyword detection patterns
- SQL comment detection (--, #, /* */)
- Better transformation chains
- Improved OWASP CRS alignment

**New Rules:**
- SQL comment detection with chain rules
- Enhanced boolean-based SQL injection detection
- Better union-based attack detection

### XSS Protection (Enhanced)

**Improvements:**
- Better script tag detection
- Enhanced event handler detection
- Improved transformation chains
- Better OWASP CRS alignment

### Rate Limiting (Enhanced)

**Improvements:**
- Proper ModSecurity collection usage
- Per-minute, per-hour, and burst rate limiting
- Automatic collection expiration
- Better logging and anomaly scoring

**Features:**
- Uses ModSecurity IP collections
- Automatic expiration of rate limit counters
- Separate tracking for minute, hour, and burst limits
- Enhanced logging with IP addresses and counts

## Policy API Updates

The policy API now supports all new protection types:

```javascript
POST /api/policies
{
  "name": "Enhanced Security Policy",
  "sqlInjection": true,
  "xss": true,
  "fileUpload": true,
  "pathTraversal": true,
  "rce": true,
  "csrf": true,
  "sessionFixation": true,
  "ssrf": true,
  "xxe": true,
  "authBypass": true,
  "idor": true,
  "securityMisconfig": true,
  "sensitiveDataExposure": true,
  "brokenAccessControl": true,
  "securityHeaders": true,
  "rateLimiting": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000,
    "burstSize": 10
  },
  "includeOWASPCRS": true,
  "mode": "prevention"
}
```

## Rule ID Ranges

- **OWASP CRS Rules**: 900000-999999
- **Custom Policy Rules**: 100000+ (configurable)
  - SQL Injection: 100000-100099
  - XSS: 100100-100199
  - File Upload: 100200-100299
  - Path Traversal: 100300-100399
  - RCE: 100400-100499
  - CSRF: 100500-100599
  - Session Fixation: 100600-100699
  - SSRF: 100700-100799
  - XXE: 100800-100899
  - Auth Bypass: 100900-100999
  - IDOR: 101000-101099
  - Security Misconfig: 101100-101199
  - Sensitive Data Exposure: 101200-101299
  - Broken Access Control: 101300-101399
  - Security Headers: 101400-101499
  - Rate Limiting: 101500-101599

## Best Practices

1. **Start with OWASP CRS**: Always enable `includeOWASPCRS: true` for comprehensive baseline protection

2. **Use Detection Mode First**: Start with `mode: "detection"` to identify false positives before switching to `mode: "prevention"`

3. **Enable Protection Types Gradually**: Enable protection types one at a time and monitor for false positives

4. **Monitor Logs**: Regularly review ModSecurity audit logs for blocked requests and adjust rules as needed

5. **Test Policies**: Use the request testing endpoint (`/api/modsecurity/test`) before deploying policies

6. **Version Control**: All policy changes create new versions, allowing easy rollback if needed

## Migration Guide

### For Existing Policies

Existing policies will continue to work. To take advantage of new protections:

1. Update your policy creation requests to include new protection types
2. Existing policies can be updated by creating new versions with enhanced protections
3. Test new policies in detection mode before enabling prevention mode

### Example Migration

**Before:**
```javascript
{
  "name": "My Policy",
  "sqlInjection": true,
  "xss": true,
  "includeOWASPCRS": true
}
```

**After (Enhanced):**
```javascript
{
  "name": "My Policy",
  "sqlInjection": true,
  "xss": true,
  "csrf": true,
  "ssrf": true,
  "xxe": true,
  "authBypass": true,
  "securityMisconfig": true,
  "sensitiveDataExposure": true,
  "includeOWASPCRS": true,
  "mode": "prevention"
}
```

## Performance Considerations

1. **Rule Ordering**: Rules are ordered for optimal performance (OWASP CRS first, then custom rules)

2. **Transformation Chains**: Efficient transformation chains reduce processing overhead

3. **Collection Usage**: Rate limiting uses ModSecurity collections for efficient memory usage

4. **Phase Selection**: Rules are placed in appropriate phases (1, 2, 3, 4) for optimal performance

## Security Considerations

1. **Anomaly Scoring**: All rules contribute to anomaly scoring, allowing correlation of attacks

2. **Tagging**: Comprehensive tagging allows filtering and analysis of specific attack types

3. **Logging**: Enhanced logging provides detailed information for security analysis

4. **Mode Selection**: Detection mode allows monitoring without blocking, prevention mode blocks attacks

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP ModSecurity Core Rule Set](https://github.com/coreruleset/coreruleset)
- [ModSecurity Reference Manual](https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual)
- [ModSecurity Documentation](https://github.com/SpiderLabs/ModSecurity/wiki)
