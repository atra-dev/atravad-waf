# Legacy Architecture Decision
## Should We Remove the Legacy Architecture?

---

## ✅ Decision: Keep Legacy with Deprecation

**Answer**: **No, we should NOT remove the legacy architecture immediately.**

Instead, we should:
1. ✅ **Keep it** for backward compatibility
2. ⚠️ **Mark as deprecated** with warnings
3. 📚 **Provide migration guides**
4. 🗑️ **Phase out** after 6-12 months

---

## 🎯 Why Keep Legacy?

### 1. Backward Compatibility
- Existing users may still be using legacy architecture
- Removing it would be a **breaking change**
- No need to force immediate migration

### 2. Gradual Migration
- Users can migrate at their own pace
- No disruption to existing deployments
- Smooth transition period

### 3. Safety
- Some users may prefer legacy for specific use cases
- Allows time to test new architecture thoroughly
- Reduces risk of breaking existing setups

---

## ⚠️ What We're Doing

### 1. Deprecation Warnings
- ✅ Added to `/api/deploy/[policyId]` endpoint
- ✅ Added to documentation
- ✅ Headers in API responses

### 2. Documentation Updates
- ✅ Created migration guide
- ✅ Added deprecation notices
- ✅ Created legacy architecture doc
- ✅ Updated WAF Nodes Guide with deprecation notice

### 3. Clear Migration Path
- ✅ Proxy WAF Quick Start guide
- ✅ DNS Setup guide
- ✅ Architecture migration plan

---

## 📊 What's Deprecated

### APIs
- `POST /api/deploy/[policyId]` - Policy deployment
- `GET /api/nodes/[id]/config` - Legacy config download
- `POST /api/nodes/[id]/config` - Legacy deployment status

### Documentation
- `docs/WAF_NODES_GUIDE.md` - Legacy node setup (marked deprecated)
- Legacy deployment workflows

### Concepts
- "Deploying policies to nodes"
- "ModSecurity on origin server"
- "Node config downloads"

---

## ✅ What's Still Active

### Core Components (Used by Both)
- ✅ Policy Management (`/api/policies`)
- ✅ Node Management (`/api/nodes`)
- ✅ Node Health (`/api/nodes/[id]/health`)
- ✅ ModSecurity Config Generation
- ✅ Application Management (`/api/apps`) - **New**

### New Architecture
- ✅ Proxy Server (`src/lib/proxy-server.js`)
- ✅ ModSecurity Proxy Integration
- ✅ Application-based configuration
- ✅ DNS-based routing

---

## 🔄 Migration Timeline

### Phase 1: Now (Deprecation)
- ✅ Mark legacy as deprecated
- ✅ Add warnings
- ✅ Create migration guides
- ✅ Emphasize new architecture

### Phase 2: 3-6 Months (Dual Support)
- ⚠️ Support both architectures
- ⚠️ Monitor usage
- ⚠️ Help users migrate
- ⚠️ Update documentation

### Phase 3: 6-12 Months (Removal)
- 🗑️ Announce removal (3 months notice)
- 🗑️ Provide migration tools
- 🗑️ Remove deprecated code
- 🗑️ Clean up documentation

---

## 📋 Summary

**We are NOT removing the legacy architecture immediately.**

Instead:
1. ✅ **Keep it** for backward compatibility
2. ⚠️ **Deprecate it** with clear warnings
3. 📚 **Guide users** to new architecture
4. 🗑️ **Remove it** after migration period

This approach:
- ✅ Protects existing users
- ✅ Provides clear migration path
- ✅ Maintains backward compatibility
- ✅ Allows gradual transition

---

**Status**: Legacy architecture kept with deprecation warnings. New proxy architecture is the recommended approach.
