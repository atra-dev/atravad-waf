# Architecture Migration Plan
## From Legacy WAF to Modern Proxy WAF

---

## 🎯 Overview

ATRAVAD WAF has been transformed from a **legacy WAF architecture** (ModSecurity on origin servers) to a **modern proxy WAF architecture** (reverse proxy with DNS-based routing).

This document outlines the migration strategy and what to do with legacy components.

---

## 📊 Architecture Comparison

### Legacy Architecture (Old)
```
Internet → Origin Server (with ModSecurity installed locally)
                ↓
        ModSecurity runs on Apache/Nginx
        Policies deployed to nodes
        Nodes download configs and apply locally
```

**Characteristics**:
- ModSecurity runs on the origin server
- Policies are "deployed" to nodes
- Nodes download ModSecurity configs
- Nodes apply configs to local Apache/Nginx
- Each node protects a specific website

### New Architecture (Proxy WAF)
```
Internet → DNS → ATRAVAD WAF Proxy → ModSecurity → Origin Server
                              ↓
                    SSL Termination
                    Request Inspection
                    Attack Blocking
                    Health Checks
```

**Characteristics**:
- WAF runs as reverse proxy (separate from origin)
- DNS points to WAF, not origin
- Applications configured with origins
- Nodes fetch application configs (not just policies)
- One node can protect multiple domains
- No ModSecurity needed on origin server

---

## 🔄 Migration Strategy

### Option 1: Keep Both (Recommended for Transition)

**Pros**:
- ✅ Backward compatibility
- ✅ Gradual migration
- ✅ No breaking changes
- ✅ Users can migrate at their own pace

**Cons**:
- ⚠️ More code to maintain
- ⚠️ Two architectures to support
- ⚠️ Potential confusion

**Implementation**:
- Mark legacy APIs as deprecated
- Add warnings in UI
- Create migration guide
- Phase out after 6-12 months

### Option 2: Remove Legacy (Clean Slate)

**Pros**:
- ✅ Simpler codebase
- ✅ Single architecture
- ✅ No confusion
- ✅ Focus on proxy WAF

**Cons**:
- ❌ Breaking change for existing users
- ❌ Requires immediate migration
- ❌ Potential data loss

**Implementation**:
- Remove deployment APIs
- Remove node config download
- Update all documentation
- Force migration

---

## 📋 Recommended Approach: Hybrid with Deprecation

### Phase 1: Mark as Deprecated (Current)

1. **Keep legacy APIs** but mark as deprecated
2. **Add deprecation warnings** in:
   - API responses
   - UI components
   - Documentation
3. **Create migration guide** for users
4. **Document new architecture** clearly

### Phase 2: Dual Support (3-6 months)

1. **Support both architectures** simultaneously
2. **Allow users to choose** which to use
3. **Provide migration tools** if needed
4. **Monitor usage** of legacy vs new

### Phase 3: Remove Legacy (6-12 months)

1. **Announce removal** 3 months in advance
2. **Provide migration scripts** if needed
3. **Remove deprecated APIs**
4. **Update all documentation**

---

## 🗑️ Components to Deprecate/Remove

### APIs to Deprecate

1. **`/api/deploy/[policyId]`** - Policy deployment endpoint
   - **Reason**: Policies are now assigned to applications, not deployed to nodes
   - **Replacement**: Applications automatically use policies
   - **Status**: ⚠️ Deprecate

2. **`/api/nodes/[id]/config`** (GET) - Node config download
   - **Reason**: Nodes now fetch application configs, not just policies
   - **Replacement**: Nodes fetch from applications collection
   - **Status**: ⚠️ Deprecate (or repurpose for application configs)

3. **`/api/nodes/[id]/config`** (POST) - Deployment status reporting
   - **Reason**: No longer needed with proxy architecture
   - **Replacement**: Health checks handle status
   - **Status**: ⚠️ Deprecate

### Documentation to Update

1. **`docs/WAF_NODES_GUIDE.md`**
   - **Action**: Add deprecation notice at top
   - **Action**: Add link to new proxy WAF guide
   - **Status**: ⚠️ Update

2. **`docs/MODSECURITY_INTEGRATION.md`**
   - **Action**: Clarify it's for both architectures
   - **Status**: ✅ Keep (still relevant)

3. **`docs/SYSTEM_READINESS.md`**
   - **Action**: Update to reflect proxy architecture
   - **Status**: ⚠️ Update

### UI Components to Update

1. **Deployments Page** (`/deployments`)
   - **Action**: Add deprecation notice
   - **Action**: Show migration path
   - **Status**: ⚠️ Update

2. **Nodes Page** (`/nodes`)
   - **Action**: Clarify nodes are now proxy servers
   - **Action**: Remove "deploy policy" references
   - **Status**: ⚠️ Update

---

## ✅ Components to Keep

### Core Components (Still Needed)

1. **Policy Management** (`/api/policies`)
   - ✅ **Keep**: Still used for creating security policies
   - ✅ **Usage**: Policies assigned to applications

2. **Node Management** (`/api/nodes`)
   - ✅ **Keep**: Still needed for proxy nodes
   - ✅ **Usage**: Register and monitor proxy nodes

3. **Node Health** (`/api/nodes/[id]/health`)
   - ✅ **Keep**: Still needed for monitoring
   - ✅ **Usage**: Proxy nodes report health

4. **ModSecurity Config Generation** (`src/lib/modsecurity.js`)
   - ✅ **Keep**: Still generates ModSecurity rules
   - ✅ **Usage**: Used by proxy server for inspection

5. **Application Management** (`/api/apps`)
   - ✅ **Keep**: Core of new architecture
   - ✅ **Usage**: Configure applications with origins

---

## 🔧 Implementation Steps

### Step 1: Add Deprecation Warnings

```javascript
// In legacy API endpoints
export async function POST(request) {
  // Add deprecation header
  const response = NextResponse.json({...});
  response.headers.set('X-Deprecated', 'true');
  response.headers.set('X-Deprecation-Message', 
    'This endpoint is deprecated. Use proxy WAF architecture instead.');
  response.headers.set('X-Migration-Guide', 
    '/docs/PROXY_WAF_QUICKSTART.md');
  return response;
}
```

### Step 2: Update Documentation

- Add deprecation notices to legacy guides
- Create migration guide
- Update README to emphasize proxy architecture

### Step 3: Update UI

- Add banners/warnings in legacy UI sections
- Guide users to new architecture
- Provide migration path

### Step 4: Monitor Usage

- Track API usage
- Identify users still on legacy
- Reach out for migration support

---

## 📝 Migration Guide for Users

### For Existing Users (Legacy Architecture)

**Current Setup**:
- ModSecurity installed on origin server
- Policies deployed to nodes
- Nodes download configs

**Migration Steps**:

1. **Create Application** in dashboard
   - Domain: Your domain name
   - Origin: Your origin server URL

2. **Get WAF IP Addresses**
   - From WAF Nodes page
   - Note down IP addresses

3. **Update DNS**
   - Point DNS to WAF IPs
   - Wait for propagation

4. **Remove ModSecurity from Origin** (Optional)
   - No longer needed on origin server
   - WAF handles all protection

5. **Test**
   - Verify traffic flows through WAF
   - Check protection is working
   - Monitor in dashboard

### Benefits of Migration

- ✅ **Simpler**: No ModSecurity on origin
- ✅ **Centralized**: All protection in one place
- ✅ **Scalable**: Easy to add more domains
- ✅ **Modern**: Like Sucuri/Reblaze

---

## 🎯 Recommended Action Plan

### Immediate (Now)

1. ✅ **Keep legacy APIs** (don't break existing users)
2. ✅ **Add deprecation warnings** to legacy endpoints
3. ✅ **Update documentation** with migration guide
4. ✅ **Emphasize proxy architecture** in README

### Short Term (1-3 months)

1. ⚠️ **Monitor usage** of legacy vs new
2. ⚠️ **Create migration tools** if needed
3. ⚠️ **Update UI** with migration prompts
4. ⚠️ **Reach out to users** still on legacy

### Long Term (6-12 months)

1. 🗑️ **Announce removal** of legacy APIs
2. 🗑️ **Provide migration window** (3 months)
3. 🗑️ **Remove deprecated code**
4. 🗑️ **Clean up documentation**

---

## 📊 Decision Matrix

| Factor | Keep Legacy | Remove Legacy |
|--------|-------------|---------------|
| **User Impact** | ✅ Low (backward compatible) | ❌ High (breaking change) |
| **Code Complexity** | ⚠️ Higher (two systems) | ✅ Lower (one system) |
| **Maintenance** | ⚠️ More to maintain | ✅ Less to maintain |
| **Migration Effort** | ✅ Users migrate gradually | ❌ Users must migrate now |
| **Clarity** | ⚠️ Two ways to do things | ✅ One clear way |

**Recommendation**: **Keep legacy with deprecation warnings** for 6-12 months, then remove.

---

## ✅ Conclusion

**Recommended Approach**: 
1. **Keep legacy APIs** but mark as deprecated
2. **Add warnings** and migration guides
3. **Emphasize new architecture** in all new docs
4. **Phase out** after 6-12 months

This provides:
- ✅ Backward compatibility
- ✅ Clear migration path
- ✅ No breaking changes
- ✅ Gradual transition

---

**Status**: Legacy architecture kept for backward compatibility, marked as deprecated. New proxy architecture is the recommended approach.
