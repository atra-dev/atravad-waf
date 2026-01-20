# Testing Checklist - What's Ready & What's Needed

## ✅ What's Ready for Testing

### 1. Core Infrastructure ✅
- ✅ Proxy server core (`src/lib/proxy-server.js`)
- ✅ Standalone server script (`proxy-server-standalone.js`)
- ✅ Application loading from Firestore
- ✅ Real-time configuration updates
- ✅ Health checks for origin servers
- ✅ Request forwarding to origins
- ✅ Domain-based routing

### 2. ModSecurity Integration ⚠️
- ⚠️ Basic pattern matching implemented
  - SQL injection detection
  - Suspicious user-agent detection
  - XSS pattern detection (basic)
- ❌ Full ModSecurity v3 integration (not yet)
- ✅ Attack blocking works (403 responses)
- ✅ Matched rules logging

### 3. Dashboard Integration ✅
- ✅ Application management UI
- ✅ Node registration
- ✅ Policy assignment
- ✅ Node health monitoring
- ✅ API endpoints for config fetching

---

## ⚠️ What Needs Attention Before Full Testing

### 1. Tenant Filtering (Important)
**Issue**: Proxy server loads ALL applications, not filtered by tenant.

**Current Code**:
```javascript
// src/lib/proxy-server.js line 54
const appsSnapshot = await adminDb.collection('applications').get();
```

**Should Be**:
```javascript
// Filter by node's tenant
const nodeDoc = await adminDb.collection('nodes').doc(this.nodeId).get();
const tenantName = nodeDoc.data()?.tenantName;
const appsSnapshot = await adminDb
  .collection('applications')
  .where('tenantName', '==', tenantName)
  .get();
```

**Impact**: For single-tenant testing, this is fine. For multi-tenant, needs fix.

**Priority**: Medium (works for testing, fix before production)

---

### 2. ModSecurity Policy Loading
**Issue**: Policies are not automatically loaded when applications are fetched.

**Current**: ModSecurity proxy has `loadPolicy()` method but it's not called automatically.

**Fix Needed**: When application config is loaded, also load the associated policy:
```javascript
if (app.policyId) {
  await this.modSecurity.loadPolicy(app.policyId);
}
```

**Priority**: High (needed for proper attack blocking)

---

### 3. Error Handling
**Current**: Basic error handling exists.

**Improvements Needed**:
- Better error messages
- Retry logic for Firestore connection
- Graceful degradation if Firestore unavailable

**Priority**: Medium (works for testing)

---

### 4. Logging
**Current**: Console.log statements.

**Improvements Needed**:
- Structured logging
- Log levels (info, warn, error)
- Log forwarding to dashboard

**Priority**: Low (works for testing)

---

## 🧪 Testing Readiness

### Can Test Now ✅
1. ✅ Basic proxy forwarding
2. ✅ Domain-based routing
3. ✅ Basic attack blocking (SQL injection patterns)
4. ✅ Health checks
5. ✅ Configuration updates
6. ✅ Multiple applications

### Needs Fix First ⚠️
1. ⚠️ Tenant filtering (if multi-tenant)
2. ⚠️ Policy loading (for proper ModSecurity rules)

### Can Test with Limitations ⚠️
1. ⚠️ ModSecurity (uses basic patterns, not full ModSecurity v3)
2. ⚠️ SSL/TLS (HTTPS not implemented yet)

---

## 🚀 Quick Fixes for Testing

### Fix 1: Load Policies When Applications Load

**File**: `src/lib/proxy-server.js`

**Add after line 60**:
```javascript
// Load policy if assigned
if (app.policyId && this.modSecurity) {
  await this.modSecurity.loadPolicy(app.policyId);
}
```

### Fix 2: Tenant Filtering (Optional for Testing)

**File**: `src/lib/proxy-server.js`

**Replace line 54-55**:
```javascript
// Get node's tenant
const nodeDoc = await adminDb.collection('nodes').doc(this.nodeId).get();
if (!nodeDoc.exists) {
  console.warn('Node not found, loading all applications');
  const appsSnapshot = await adminDb.collection('applications').get();
  // ... rest of code
} else {
  const tenantName = nodeDoc.data().tenantName;
  const appsSnapshot = await adminDb
    .collection('applications')
    .where('tenantName', '==', tenantName)
    .get();
  // ... rest of code
}
```

---

## 📋 Testing Priority

### Phase 1: Basic Functionality (Do First)
1. ✅ Start proxy server
2. ✅ Load applications
3. ✅ Forward requests to origin
4. ✅ Test domain routing

### Phase 2: Security (Do Second)
1. ✅ Test attack blocking
2. ⚠️ Fix policy loading
3. ✅ Test different attack types

### Phase 3: Advanced Features (Do Third)
1. ⚠️ Test health checks
2. ⚠️ Test failover
3. ⚠️ Test real-time updates

### Phase 4: Production Readiness (Do Last)
1. ❌ SSL/TLS implementation
2. ❌ Full ModSecurity v3
3. ❌ Performance testing
4. ❌ Monitoring integration

---

## ✅ Summary

**Ready for Testing**: ✅ **YES**

**What Works**:
- Basic proxy functionality
- Request forwarding
- Domain routing
- Basic attack blocking
- Health checks

**What Needs Fix**:
- Policy loading (quick fix)
- Tenant filtering (optional for single-tenant)

**What's Missing** (but not blocking):
- Full ModSecurity v3
- SSL/TLS
- Advanced features

**Recommendation**: 
1. Apply quick fixes (policy loading)
2. Start testing basic functionality
3. Iterate based on test results

---

**Status**: Ready for testing with minor fixes ✅
