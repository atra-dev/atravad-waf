# OWASP Core Rule Set (CRS) Guide

## Overview

ATRAVAD WAF uses **OWASP ModSecurity Core Rule Set (CRS) 3.3.0** as the foundation for all web application protection. This document explains how OWASP CRS works with custom policies.

## What is OWASP CRS?

OWASP CRS is a set of generic attack detection rules for ModSecurity. It provides comprehensive protection against:

- **SQL Injection (SQLi)**: Detects SQL injection attempts in all input vectors
- **Cross-Site Scripting (XSS)**: Prevents XSS attacks through multiple detection methods
- **Local File Inclusion (LFI)**: Blocks attempts to access local files
- **Remote File Inclusion (RFI)**: Prevents inclusion of remote files
- **Remote Code Execution (RCE)**: Detects command injection and code execution attempts
- **Protocol Violations**: Validates HTTP protocol compliance
- **Data Leakage**: Prevents sensitive information from being exposed in responses
- **And many more attack vectors**

## How OWASP CRS Works in ATRAVAD WAF

### Automatic Inclusion

**OWASP CRS is automatically enabled for all policies** by default. When you create a policy, the generated ModSecurity configuration includes:

```apache
# OWASP Core Rule Set (CRS) Integration
Include /etc/modsecurity/crs-setup.conf
Include /etc/modsecurity/rules/*.conf
```

This means:
- ✅ **You get full protection even with an empty policy**
- ✅ **No need to enable individual protection types**
- ✅ **OWASP CRS handles the heavy lifting**

### Policy Customizations

Policies in ATRAVAD WAF are **customizations on top of OWASP CRS**, not replacements. They allow you to:

1. **Add Enhanced Rules**: Additional detection rules for specific attack patterns
2. **Configure Rate Limiting**: Custom rate limiting per application
3. **Add Custom Rules**: Application-specific security rules
4. **Fine-tune Protection**: Adjust sensitivity for your specific use case

## When to Create a Policy

### You DON'T Need a Policy If:

- ✅ You want standard OWASP CRS protection (which covers most threats)
- ✅ Your application follows standard web practices
- ✅ You don't need application-specific rules

**Solution**: Create a policy with just a name. OWASP CRS will provide full protection.

### You SHOULD Create a Policy If:

- 🔧 You need custom rate limiting for your application
- 🔧 You have application-specific security requirements
- 🔧 You want to add custom ModSecurity rules
- 🔧 You need to fine-tune protection for specific endpoints
- 🔧 You want to add additional file upload restrictions

## Policy Structure

### Minimal Policy (OWASP CRS Only)

```json
{
  "name": "Standard Protection",
  "sqlInjection": false,
  "xss": false,
  "fileUpload": false,
  "includeOWASPCRS": true
}
```

This policy provides **full OWASP CRS protection** with no additional custom rules.

### Enhanced Policy (OWASP CRS + Custom Rules)

```json
{
  "name": "Enhanced Protection",
  "sqlInjection": true,      // Additional SQL injection rules
  "xss": true,                // Additional XSS rules
  "fileUpload": true,          // Additional file upload restrictions
  "rateLimiting": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000
  },
  "includeOWASPCRS": true      // OWASP CRS still enabled
}
```

This policy provides **OWASP CRS protection PLUS** additional custom rules.

## OWASP CRS Rule Sets

OWASP CRS includes the following rule sets (all enabled by default):

### Request Rules

- **REQUEST-901-INITIALIZATION**: CRS setup and initialization
- **REQUEST-905-COMMON-EXCEPTIONS**: Common exception rules
- **REQUEST-910-IP-REPUTATION**: IP reputation checking
- **REQUEST-911-METHOD-ENFORCEMENT**: HTTP method validation
- **REQUEST-912-DOS-PROTECTION**: Denial of Service protection
- **REQUEST-913-SCANNER-DETECTION**: Security scanner detection
- **REQUEST-920-PROTOCOL-ENFORCEMENT**: HTTP protocol validation
- **REQUEST-921-PROTOCOL-ATTACK**: Protocol-level attack detection
- **REQUEST-930-APPLICATION-ATTACK-LFI**: Local File Inclusion protection
- **REQUEST-931-APPLICATION-ATTACK-RFI**: Remote File Inclusion protection
- **REQUEST-932-APPLICATION-ATTACK-RCE**: Remote Code Execution protection
- **REQUEST-933-APPLICATION-ATTACK-PHP**: PHP-specific attack detection
- **REQUEST-934-APPLICATION-ATTACK-NODEJS**: Node.js-specific attack detection
- **REQUEST-941-APPLICATION-ATTACK-XSS**: XSS attack detection
- **REQUEST-942-APPLICATION-ATTACK-SQLI**: SQL injection detection
- **REQUEST-943-APPLICATION-ATTACK-SESSION-FIXATION**: Session fixation protection
- **REQUEST-944-APPLICATION-ATTACK-JAVA**: Java-specific attack detection
- **REQUEST-949-BLOCKING-EVALUATION**: Blocking decision evaluation

### Response Rules

- **RESPONSE-950-DATA-LEAKAGES**: Data leakage prevention
- **RESPONSE-951-DATA-LEAKAGES-SQL**: SQL error message detection
- **RESPONSE-952-DATA-LEAKAGES-JAVA**: Java error message detection
- **RESPONSE-953-DATA-LEAKAGES-PHP**: PHP error message detection
- **RESPONSE-954-DATA-LEAKAGES-IIS**: IIS error message detection
- **RESPONSE-959-BLOCKING-EVALUATION**: Response blocking evaluation
- **RESPONSE-980-CORRELATION**: Attack correlation and scoring

## Rule ID Ranges

- **OWASP CRS Rules**: IDs 900000-999999
- **Custom Policy Rules**: IDs 100000+ (configurable)

This ensures no conflicts between OWASP CRS and custom rules.

## Best Practices

1. **Start with OWASP CRS Only**: Create a minimal policy first and test
2. **Add Custom Rules Gradually**: Only add custom rules when needed
3. **Test Thoroughly**: Use the request testing endpoint before deployment
4. **Monitor Logs**: Review ModSecurity audit logs for false positives
5. **Update Regularly**: Keep OWASP CRS updated to the latest version

## Disabling OWASP CRS (Not Recommended)

While you can disable OWASP CRS by setting `includeOWASPCRS: false`, this is **strongly discouraged** unless you have a specific reason. OWASP CRS provides industry-standard protection that has been tested and proven effective.

## Summary

- ✅ **OWASP CRS is enabled by default** - you get protection automatically
- ✅ **Policies are optional** - use them for customizations, not basic protection
- ✅ **Minimal policy = Full OWASP CRS protection**
- ✅ **Enhanced policy = OWASP CRS + Custom rules**

You don't need to create complex policies to get comprehensive web application protection. OWASP CRS handles that for you!
