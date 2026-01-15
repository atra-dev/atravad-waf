# Node Authentication & Rate Limiting Implementation

**Implementation Date**: Current  
**Status**: ✅ **COMPLETE** - Production-ready security enhancements implemented

---

## 🎯 Executive Summary

This document describes the enterprise-grade security enhancements implemented for ATRAVAD WAF node authentication and API rate limiting. These changes address critical security vulnerabilities identified in the Production Readiness Assessment.

### ✅ **What Was Implemented:**

1. **Node API Key Authentication System** - Complete
   - High-entropy API key generation (256-bit random)
   - Secure hashing with salt (SHA-256)
   - Centralized authentication module
   - Key lifecycle management (rotation, revocation)
   - Audit logging for auth failures

2. **API Key Validation** - Enabled on All Node Endpoints
   - Health endpoint (`POST /api/nodes/[id]/health`)
   - Config fetch endpoint (`GET /api/nodes/[id]/config`)
   - Config status endpoint (`POST /api/nodes/[id]/config`)
   - Logs ingestion endpoint (`POST /api/logs`)

3. **Rate Limiting System** - Tiered Strategy
   - Per-IP rate limiting (edge/middleware level)
   - Per-node rate limiting (endpoint-level)
   - Configurable limits per route group
   - Proper HTTP 429 responses with retry headers

---

## 📋 Implementation Details

### 1. Node Authentication Library (`src/lib/node-auth.js`)

#### **Core Functions:**

##### `generateNodeApiKey()`
- Generates 32 bytes (256 bits) of cryptographically secure random data
- Formats as `atravad_<base64url-safe>` for easy identification
- Returns plaintext key (shown once to user during node creation)

##### `hashApiKey(apiKey, nodeId)`
- Uses SHA-256 with node ID as salt
- Ensures same key hashes differently for different nodes
- Returns hex-encoded hash for storage

##### `verifyNodeApiKey(nodeId, providedKey)`
- Fetches node document from Firestore
- Validates node exists and is not disabled/revoked
- Computes hash of provided key and compares with stored hash
- Uses constant-time comparison to prevent timing attacks
- Logs all authentication failures to `node_auth_failures` collection
- Returns `{ok: boolean, node?: object, error?: string}`

##### `extractNodeCredentials(request)`
- Extracts `X-Node-Id` and `X-Node-Api-Key` from request headers
- Supports header-based authentication (preferred)
- Falls back to body-based for backward compatibility

##### `rotateNodeApiKey(nodeId)`
- Generates new API key
- Updates hash in Firestore
- Stores rotation timestamp
- Returns new plaintext key (show once to user)

##### `revokeNodeApiKey(nodeId)`
- Marks node as disabled
- Sets `apiKeyRevoked: true`
- Logs revocation timestamp

#### **Security Features:**

- ✅ **Constant-time comparison** - Prevents timing attacks
- ✅ **Salted hashing** - Node ID used as salt
- ✅ **Audit logging** - All failures logged to `node_auth_failures`
- ✅ **Key lifecycle** - Rotation and revocation support
- ✅ **Disabled state** - Nodes can be disabled without deletion

---

### 2. Node Creation Enhancement (`src/app/api/nodes/route.js`)

#### **Changes:**

- **API Key Generation**: Automatically generates API key when node is created
- **Secure Storage**: Stores only `apiKeyHash` in Firestore, never plaintext
- **One-Time Display**: Returns plaintext key in response (user must save it)
- **Prefix Storage**: Stores first 12 characters for UI display (`apiKeyPrefix`)

#### **Response Format:**

```json
{
  "id": "node-uuid",
  "name": "Production WAF",
  "ip": "192.168.1.100",
  "status": "offline",
  "apiKey": "atravad_abc123...",
  "warning": "Save this API key securely. It will not be shown again."
}
```

#### **Firestore Document Structure:**

```javascript
{
  name: "Production WAF",
  ip: "192.168.1.100",
  tenantName: "acme-corp",
  status: "offline",
  apiKeyHash: "sha256_hash_here", // Never store plaintext
  apiKeyPrefix: "atravad_abc", // For UI display
  apiKeyCreatedAt: "2024-01-01T00:00:00Z",
  createdAt: "2024-01-01T00:00:00Z",
  // ... other fields
}
```

---

### 3. Node Endpoint Authentication

#### **Health Endpoint** (`POST /api/nodes/[id]/health`)

**Authentication Flow:**
1. Extract API key from headers (`X-Node-Api-Key`) or body (`nodeApiKey`)
2. Verify API key using `verifyNodeApiKey()`
3. Apply rate limiting (per-node: 10 req/min)
4. Process health update

**Error Responses:**
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - Node disabled or key revoked
- `429 Too Many Requests` - Rate limit exceeded

#### **Config Fetch Endpoint** (`GET /api/nodes/[id]/config`)

**Authentication Flow:**
1. Extract API key from headers (`X-Node-Id`, `X-Node-Api-Key`) - **required**
2. Verify API key using `verifyNodeApiKey()`
3. Apply rate limiting (per-node: 10 req/min)
4. Return ModSecurity configuration

**Error Responses:**
- `401 Unauthorized` - Missing headers or invalid API key
- `403 Forbidden` - Node disabled or key revoked
- `429 Too Many Requests` - Rate limit exceeded

#### **Config Status Endpoint** (`POST /api/nodes/[id]/config`)

**Authentication Flow:**
1. Extract API key from headers or body
2. Verify API key using `verifyNodeApiKey()`
3. Apply rate limiting (per-node: 10 req/min)
4. Update deployment status

#### **Logs Ingestion Endpoint** (`POST /api/logs`)

**Authentication Flow:**
1. Extract API key from headers or body
2. Verify API key using `verifyNodeApiKey()`
3. Apply rate limiting (per-node: 1000 logs/min, per-IP: 200 req/min)
4. Store logs in Firestore

**Rate Limits:**
- Per-IP: 200 requests per minute
- Per-Node: 1000 logs per minute

---

### 4. Rate Limiting System (`src/lib/rate-limit.js`)

#### **Architecture:**

- **Token Bucket Algorithm**: Implements sliding window with time buckets
- **Distributed Tracking**: Uses Firestore for rate limit state (works across serverless instances)
- **Tiered Strategy**: Per-IP and per-node limits
- **Automatic Cleanup**: Removes old rate limit entries (24-hour retention)

#### **Rate Limit Configuration:**

```javascript
{
  '/api/nodes': {
    perIP: { requests: 100, windowSeconds: 60 },      // 100 req/min per IP
    perNode: { requests: 10, windowSeconds: 60 },     // 10 req/min per node
  },
  '/api/logs': {
    perIP: { requests: 200, windowSeconds: 60 },      // 200 req/min per IP
    perNode: { requests: 1000, windowSeconds: 60 },   // 1000 logs/min per node
  },
  '/api': {
    perIP: { requests: 100, windowSeconds: 60 },      // 100 req/min per IP
  },
}
```

#### **Rate Limit Response:**

When rate limit is exceeded, returns `429 Too Many Requests` with headers:

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 45

{
  "error": "Rate limit exceeded",
  "message": "Too many requests from this IP. Limit: 100 requests per 60 seconds.",
  "retryAfter": 45
}
```

#### **Implementation Details:**

- **Time Buckets**: Uses `Math.floor(now / windowMs) * windowMs` for bucket calculation
- **Firestore Keys**: Format `ratelimit_<key>_<bucketStart>` for efficient queries
- **Fail-Open**: If rate limiting fails (DB error), allows request (prevents false positives)
- **Cleanup**: Asynchronously removes entries older than 24 hours

---

## 🔒 Security Improvements

### **Before Implementation:**

- ❌ Nodes authenticated by Node ID only (easily guessable)
- ❌ No API key validation (commented out)
- ❌ No rate limiting (unbounded requests)
- ❌ Configuration theft risk
- ❌ Control plane manipulation possible

### **After Implementation:**

- ✅ **Strong Authentication**: 256-bit entropy API keys
- ✅ **Secure Storage**: Only hashes stored, never plaintext
- ✅ **All Endpoints Protected**: Health, config, logs all require valid keys
- ✅ **Rate Limiting**: Prevents abuse and DoS attacks
- ✅ **Audit Trail**: All auth failures logged
- ✅ **Key Lifecycle**: Rotation and revocation support
- ✅ **Zero-Trust Model**: Every request authenticated

---

## 📊 Performance Considerations

### **Rate Limiting Performance:**

- **Firestore Queries**: Each rate limit check requires 1-2 Firestore operations
- **Latency Impact**: ~50-100ms per request (acceptable for security)
- **Scalability**: Works across multiple serverless instances
- **Future Optimization**: Can migrate to Redis/Upstash for lower latency

### **Authentication Performance:**

- **Hash Computation**: SHA-256 is fast (~1ms)
- **Firestore Lookup**: Single document read (~20-50ms)
- **Total Overhead**: ~25-55ms per authenticated request

---

## 🚀 Migration Guide

### **For Existing Nodes:**

Existing nodes created before this implementation will **not have API keys**. They need to be updated:

1. **Option 1: Regenerate API Keys** (Recommended)
   - Use the rotation API to generate new keys
   - Update agent configuration with new key
   - Old nodes will fail authentication until updated

2. **Option 2: Temporary Backward Compatibility** (Not Recommended)
   - Can add temporary check: if `apiKeyHash` missing, allow node ID only
   - **Security Risk**: Defeats the purpose of API keys
   - Should be removed after migration period

### **For New Nodes:**

- API keys are automatically generated
- User must save the key when node is created
- Key is shown once in the response
- Agent must be configured with the key before connecting

---

## 📝 API Usage Examples

### **Node Health Check (with API Key):**

```bash
# Using headers (preferred)
curl -X POST https://dashboard.atravad.com/api/nodes/node123/health \
  -H "X-Node-Id: node123" \
  -H "X-Node-Api-Key: atravad_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "online",
    "version": "1.0.0",
    "uptime": 3600
  }'

# Using body (backward compatibility)
curl -X POST https://dashboard.atravad.com/api/nodes/node123/health \
  -H "Content-Type: application/json" \
  -d '{
    "nodeApiKey": "atravad_abc123...",
    "status": "online",
    "version": "1.0.0"
  }'
```

### **Fetch Configuration:**

```bash
curl -X GET https://dashboard.atravad.com/api/nodes/node123/config \
  -H "X-Node-Id: node123" \
  -H "X-Node-Api-Key: atravad_abc123..."
```

### **Send Logs:**

```bash
curl -X POST https://dashboard.atravad.com/api/logs \
  -H "X-Node-Id: node123" \
  -H "X-Node-Api-Key: atravad_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "level": "warning",
        "message": "SQL injection attempt blocked",
        "ruleId": "942100",
        "severity": "high"
      }
    ]
  }'
```

---

## ✅ Testing Checklist

### **Authentication Tests:**

- [x] Node creation generates API key
- [x] API key hash stored correctly
- [x] Valid API key authenticates successfully
- [x] Invalid API key returns 401
- [x] Missing API key returns 401
- [x] Disabled node returns 403
- [x] Revoked key returns 403
- [x] Auth failures logged to `node_auth_failures`

### **Rate Limiting Tests:**

- [x] Per-IP limits enforced
- [x] Per-node limits enforced
- [x] 429 response with proper headers
- [x] Rate limits reset after window
- [x] Different routes have different limits
- [x] Old rate limit entries cleaned up

---

## 🎯 Next Steps

### **Immediate (This Week):**

1. ✅ Node API key generation - **DONE**
2. ✅ API key validation on all endpoints - **DONE**
3. ✅ Rate limiting implementation - **DONE**
4. ⚠️ **Add API key management UI** - **PENDING**
   - View API key prefix
   - Rotate API key
   - Revoke API key
   - Show key creation/rotation history

### **Short-term (Next 2 Weeks):**

1. Update agent documentation with API key usage
2. Add API key to node registration response UI
3. Create migration script for existing nodes
4. Add rate limit metrics dashboard

### **Future Enhancements:**

1. Migrate rate limiting to Redis/Upstash for better performance
2. Add per-tenant rate limit configurations
3. Implement adaptive rate limiting (adjust based on load)
4. Add rate limit analytics and alerting

---

## 📚 Related Documentation

- `docs/PRODUCTION_READINESS_ASSESSMENT.md` - Original security assessment
- `docs/SESSION_SECURITY_ENHANCEMENTS.md` - User session security
- `src/lib/node-auth.js` - Authentication implementation
- `src/lib/rate-limit.js` - Rate limiting implementation

---

## ✅ Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| API Key Generation | ✅ Complete | 256-bit entropy, secure format |
| API Key Hashing | ✅ Complete | SHA-256 with salt |
| API Key Validation | ✅ Complete | All node endpoints protected |
| Rate Limiting | ✅ Complete | Tiered strategy implemented |
| Audit Logging | ✅ Complete | Auth failures logged |
| Key Rotation | ✅ Complete | API function ready |
| Key Revocation | ✅ Complete | API function ready |
| API Key UI | ⚠️ Pending | Needs frontend implementation |

---

**Conclusion**: The critical security vulnerabilities identified in the Production Readiness Assessment have been **fully addressed** at the architectural and implementation level. The system now implements enterprise-grade node authentication and rate limiting, significantly improving the security posture of ATRAVAD WAF.
