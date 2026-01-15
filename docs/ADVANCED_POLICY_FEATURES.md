# Advanced Policy Features - Enterprise-Grade WAF Capabilities

## Overview

This document describes the advanced policy features that make ATRAVAD WAF a powerful, enterprise-grade Web Application Firewall. These features extend beyond basic OWASP Top 10 protections to provide sophisticated security controls, access management, and threat mitigation capabilities.

## Table of Contents

1. [IP Access Control](#ip-access-control)
2. [Geographic Blocking](#geographic-blocking)
3. [Advanced Rate Limiting](#advanced-rate-limiting)
4. [Bot Detection and Mitigation](#bot-detection-and-mitigation)
5. [Advanced File Upload Validation](#advanced-file-upload-validation)
6. [API-Specific Protections](#api-specific-protections)
7. [Exception Handling](#exception-handling)
8. [Virtual Patching](#virtual-patching)

---

## IP Access Control

### Overview

IP Access Control allows you to create whitelists and blacklists of IP addresses or CIDR blocks to control access to your applications.

### Features

- **IP Whitelisting**: Allow only specified IP addresses
- **IP Blacklisting**: Block specified IP addresses
- **CIDR Block Support**: Support for CIDR notation (e.g., 192.168.1.0/24)
- **Flexible Configuration**: Combine whitelists and blacklists

### Configuration

```javascript
{
  "ipAccessControl": {
    "whitelist": ["192.168.1.100", "10.0.0.50"],
    "blacklist": ["203.0.113.0", "198.51.100.0"],
    "whitelistCIDR": ["192.168.1.0/24", "10.0.0.0/8"],
    "blacklistCIDR": ["203.0.113.0/24"],
    "action": "block"
  }
}
```

### Use Cases

- **Internal API Access**: Whitelist only internal IPs for admin endpoints
- **Threat Mitigation**: Blacklist known malicious IPs
- **Network Segmentation**: Allow access only from specific network ranges
- **Emergency Blocking**: Quickly block IPs during active attacks

### Generated Rules

- Whitelist rules block all IPs not in the whitelist
- Blacklist rules block specified IPs
- CIDR rules support network ranges
- All rules include comprehensive logging

---

## Geographic Blocking

### Overview

Geographic Blocking allows you to restrict or allow access based on the geographic location (country) of the request origin.

### Features

- **Country Blocking**: Block requests from specific countries
- **Country Allowlisting**: Allow only requests from specific countries
- **GeoIP Integration**: Uses ModSecurity GeoIP module
- **Flexible Policies**: Combine blocking and allowlisting

### Configuration

```javascript
{
  "geoBlocking": {
    "blockedCountries": ["CN", "RU", "KP"],
    "allowedCountries": ["US", "CA", "GB"],
    "action": "block"
  }
}
```

### Use Cases

- **Compliance**: Block countries where your service cannot operate
- **Threat Mitigation**: Block countries with high attack rates
- **Licensing**: Restrict access based on licensing agreements
- **Performance**: Reduce load from regions you don't serve

### Requirements

- ModSecurity with GeoIP module installed
- GeoIP database (MaxMind GeoIP2 or similar)
- Proper GeoIP database updates

### Generated Rules

- Country code validation rules
- GeoIP lookup integration
- Comprehensive logging with country information

---

## Advanced Rate Limiting

### Overview

Advanced Rate Limiting provides sophisticated rate limiting capabilities beyond basic per-IP limits, including per-endpoint, per-user, and adaptive rate limiting.

### Features

- **Per-Endpoint Rate Limiting**: Different limits for different endpoints
- **Per-User Rate Limiting**: Rate limits based on user sessions or IDs
- **Adaptive Rate Limiting**: Automatically adjusts based on attack patterns
- **Burst Protection**: Protection against traffic bursts

### Configuration

```javascript
{
  "advancedRateLimiting": {
    "perEndpoint": {
      "/api/login": {
        "requestsPerMinute": 5,
        "requestsPerHour": 20
      },
      "/api/search": {
        "requestsPerMinute": 30,
        "requestsPerHour": 500
      }
    },
    "perUser": {
      "session": {
        "requestsPerMinute": 60
      },
      "userId": {
        "requestsPerMinute": 100
      }
    },
    "adaptive": true,
    "burstProtection": true
  }
}
```

### Use Cases

- **Login Protection**: Strict limits on authentication endpoints
- **API Throttling**: Different limits for different API endpoints
- **User-Based Limits**: Prevent individual users from abusing resources
- **Adaptive Defense**: Automatically respond to attack patterns

### Generated Rules

- Endpoint-specific rate limiting collections
- User-based rate limiting collections
- Adaptive rate limiting based on anomaly scores
- Burst protection rules

---

## Bot Detection and Mitigation

### Overview

Bot Detection and Mitigation identifies and handles automated bots, crawlers, and malicious automated traffic.

### Features

- **User-Agent Filtering**: Detect bots by User-Agent headers
- **Bot Signature Detection**: Identify bot patterns in requests
- **Crawler Blocking**: Block or restrict crawlers
- **Challenge-Response**: Require challenges for suspected bots

### Configuration

```javascript
{
  "botDetection": {
    "userAgentFiltering": true,
    "botSignatureDetection": true,
    "crawlerBlocking": false,
    "challengeResponse": true
  }
}
```

### Use Cases

- **Scraping Prevention**: Block web scrapers
- **Credential Stuffing**: Detect automated login attempts
- **Resource Protection**: Prevent bots from consuming resources
- **SEO Management**: Control search engine crawlers

### Detection Methods

- Missing User-Agent headers
- Bot-specific User-Agent patterns
- Suspicious Accept headers
- Request pattern analysis

### Generated Rules

- User-Agent validation rules
- Bot signature detection rules
- Crawler blocking rules
- Challenge-response triggers

---

## Advanced File Upload Validation

### Overview

Advanced File Upload Validation provides comprehensive file upload security beyond basic extension blocking.

### Features

- **MIME Type Validation**: Validate file content types
- **Content Scanning**: Magic bytes validation
- **File Size Limits**: Configurable size restrictions
- **Extension Control**: Granular extension allow/block lists
- **Virus Scanning Integration**: Support for virus scanning

### Configuration

```javascript
{
  "advancedFileUpload": {
    "mimeTypeValidation": true,
    "allowedMimeTypes": [
      "image/jpeg",
      "image/png",
      "application/pdf"
    ],
    "contentScanning": true,
    "maxFileSize": 10485760,
    "allowedExtensions": ["jpg", "jpeg", "png", "pdf"],
    "blockedExtensions": ["exe", "php", "sh"],
    "virusScanning": false
  }
}
```

### Use Cases

- **Secure File Uploads**: Ensure only safe files are uploaded
- **Content Validation**: Verify file types match extensions
- **Size Management**: Control storage usage
- **Malware Prevention**: Block potentially malicious files

### Validation Layers

1. **Extension Validation**: Check file extensions
2. **MIME Type Validation**: Verify Content-Type headers
3. **Content Scanning**: Validate magic bytes/file signatures
4. **Size Validation**: Enforce size limits

### Generated Rules

- File size validation rules
- MIME type validation rules
- Extension allow/block lists
- Content scanning triggers

---

## API-Specific Protections

### Overview

API-Specific Protections provide specialized security controls for API endpoints, including authentication, authorization, and API-specific attack prevention.

### Features

- **API Key Validation**: Validate API keys in requests
- **OAuth Token Validation**: Validate OAuth bearer tokens
- **JWT Validation**: Validate JSON Web Tokens
- **API Versioning**: Enforce API version requirements
- **Request Signing**: Support for signed requests

### Configuration

```javascript
{
  "apiProtection": {
    "apiKeyValidation": true,
    "apiKeyHeader": "X-API-Key",
    "validApiKeys": [
      "key-abc123",
      "key-def456"
    ],
    "oauthValidation": true,
    "jwtValidation": true,
    "apiVersioning": true,
    "allowedVersions": ["v1", "v2"],
    "requestSigning": false
  }
}
```

### Use Cases

- **API Authentication**: Enforce API key requirements
- **OAuth Protection**: Validate OAuth tokens
- **JWT Security**: Ensure valid JWT tokens
- **Version Control**: Enforce API versioning
- **API Gateway**: Act as API gateway with authentication

### Validation Methods

- **API Keys**: Header-based key validation
- **OAuth**: Bearer token format validation
- **JWT**: JWT structure and format validation
- **Versioning**: URI or header-based version checking

### Generated Rules

- API key validation rules
- OAuth token validation rules
- JWT format validation rules
- API version enforcement rules

---

## Exception Handling

### Overview

Exception Handling allows you to exclude specific paths or rules from security policies, enabling fine-grained control over security rules.

### Features

- **Path-Based Exceptions**: Exclude specific paths from rules
- **Rule ID Exceptions**: Disable specific rules for paths
- **Wildcard Support**: Support for wildcard patterns
- **Reason Tracking**: Document why exceptions exist

### Configuration

```javascript
{
  "exceptions": [
    {
      "path": "/api/health",
      "ruleIds": [100000, 100100],
      "reason": "Health check endpoint needs to bypass security rules"
    },
    {
      "path": "/static/*",
      "ruleIds": [],
      "reason": "Static files don't need security validation"
    }
  ]
}
```

### Use Cases

- **Health Checks**: Allow health check endpoints
- **Static Files**: Exclude static assets from rules
- **Legacy APIs**: Support legacy endpoints
- **False Positive Mitigation**: Exclude paths causing false positives

### Exception Types

1. **Selective Rule Exclusion**: Disable specific rules for paths
2. **Full Rule Exclusion**: Disable all rules for paths
3. **Wildcard Patterns**: Use * for pattern matching

### Generated Rules

- Path-based exception rules
- Rule removal directives
- Rule engine control rules

---

## Virtual Patching

### Overview

Virtual Patching allows you to create CVE-specific security rules to protect against known vulnerabilities without modifying application code.

### Features

- **CVE-Specific Rules**: Create rules for specific CVEs
- **Pattern-Based Protection**: Block attack patterns
- **Severity Levels**: Configure rule severity
- **Rapid Deployment**: Deploy patches without code changes

### Configuration

```javascript
{
  "virtualPatching": [
    {
      "cve": "CVE-2023-12345",
      "description": "Remote Code Execution in Example Framework",
      "pattern": "(?i)(?:exec|system|shell_exec|passthru)\\s*\\(",
      "severity": "CRITICAL"
    },
    {
      "cve": "CVE-2023-67890",
      "description": "SQL Injection in User Input",
      "pattern": "(?i)(?:union\\s+select|';\\s*drop\\s+table)",
      "severity": "CRITICAL"
    }
  ]
}
```

### Use Cases

- **Zero-Day Protection**: Protect against newly discovered vulnerabilities
- **Legacy System Protection**: Secure systems that can't be updated
- **Rapid Response**: Quickly deploy protection for CVEs
- **Compliance**: Meet security compliance requirements

### Virtual Patch Lifecycle

1. **CVE Discovery**: Identify vulnerability
2. **Pattern Analysis**: Create detection pattern
3. **Rule Creation**: Generate virtual patch rule
4. **Testing**: Test rule for false positives
5. **Deployment**: Deploy to production
6. **Monitoring**: Monitor for effectiveness

### Generated Rules

- CVE-specific detection rules
- Pattern-based blocking rules
- Comprehensive logging with CVE tags
- Severity-based anomaly scoring

---

## Combining Advanced Features

### Example: Comprehensive API Protection

```javascript
{
  "name": "Enterprise API Protection",
  "includeOWASPCRS": true,
  "mode": "prevention",
  "csrf": true,
  "ssrf": true,
  "xxe": true,
  "apiProtection": {
    "apiKeyValidation": true,
    "validApiKeys": ["prod-key-123", "prod-key-456"],
    "jwtValidation": true,
    "apiVersioning": true,
    "allowedVersions": ["v1", "v2"]
  },
  "advancedRateLimiting": {
    "perEndpoint": {
      "/api/auth/login": {
        "requestsPerMinute": 5
      },
      "/api/data": {
        "requestsPerMinute": 100
      }
    },
    "adaptive": true
  },
  "ipAccessControl": {
    "whitelistCIDR": ["10.0.0.0/8", "192.168.0.0/16"]
  },
  "botDetection": {
    "userAgentFiltering": true,
    "crawlerBlocking": true
  },
  "exceptions": [
    {
      "path": "/api/health",
      "ruleIds": [],
      "reason": "Health check endpoint"
    }
  ]
}
```

### Example: E-Commerce Protection

```javascript
{
  "name": "E-Commerce Security",
  "includeOWASPCRS": true,
  "mode": "prevention",
  "sqlInjection": true,
  "xss": true,
  "csrf": true,
  "sensitiveDataExposure": true,
  "advancedFileUpload": {
    "mimeTypeValidation": true,
    "allowedMimeTypes": ["image/jpeg", "image/png"],
    "maxFileSize": 5242880,
    "allowedExtensions": ["jpg", "jpeg", "png"]
  },
  "geoBlocking": {
    "allowedCountries": ["US", "CA", "GB", "AU"]
  },
  "advancedRateLimiting": {
    "perEndpoint": {
      "/checkout": {
        "requestsPerMinute": 10
      }
    }
  },
  "botDetection": {
    "userAgentFiltering": true,
    "challengeResponse": true
  }
}
```

---

## Best Practices

### 1. Start Simple
- Begin with basic protections
- Add advanced features gradually
- Test each feature before adding more

### 2. Monitor and Adjust
- Review logs regularly
- Adjust rate limits based on traffic
- Update IP lists based on threats

### 3. Document Exceptions
- Always document why exceptions exist
- Review exceptions regularly
- Remove exceptions when no longer needed

### 4. Test Virtual Patches
- Test patches in detection mode first
- Monitor for false positives
- Adjust patterns as needed

### 5. Combine Features Wisely
- Use IP whitelisting with API protection
- Combine rate limiting with bot detection
- Use exceptions sparingly

---

## Performance Considerations

### Rate Limiting
- Use collections efficiently
- Set appropriate expiration times
- Monitor collection sizes

### IP Access Control
- Keep IP lists manageable
- Use CIDR blocks when possible
- Cache IP lookups

### Geographic Blocking
- Requires GeoIP database lookups
- May impact performance
- Consider caching results

### Bot Detection
- User-Agent checks are fast
- Pattern matching may be slower
- Use selective detection

---

## Security Considerations

### IP Whitelisting
- Don't whitelist too broadly
- Review whitelists regularly
- Use VPN detection if needed

### Geographic Blocking
- May block legitimate users
- Consider VPN usage
- Provide clear error messages

### API Key Management
- Rotate keys regularly
- Use strong keys
- Monitor key usage

### Virtual Patching
- Not a replacement for real patches
- May have false positives
- Review and update regularly

---

## Troubleshooting

### IP Access Control Not Working
- Check IP format (no spaces)
- Verify CIDR notation
- Check rule order

### Rate Limiting Too Strict
- Adjust limits based on traffic
- Use per-endpoint limits
- Consider adaptive rate limiting

### Bot Detection False Positives
- Review User-Agent patterns
- Adjust detection sensitivity
- Use exceptions for known bots

### API Protection Blocking Requests
- Verify API key format
- Check header names
- Review JWT validation rules

---

## References

- [ModSecurity Reference Manual](https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual)
- [OWASP ModSecurity Core Rule Set](https://github.com/coreruleset/coreruleset)
- [ModSecurity Collections](https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual-(v2.x)-Collections)
- [GeoIP Integration](https://github.com/SpiderLabs/ModSecurity/wiki/Reference-Manual-(v2.x)-GeoIP)
