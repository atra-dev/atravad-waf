# Legacy WAF Architecture (Deprecated)
## ⚠️ This architecture is deprecated. Use Proxy WAF instead.

---

## 🚨 Deprecation Notice

**This architecture is deprecated** in favor of the modern **Proxy WAF architecture**.

**New deployments should use**: [Proxy WAF Quick Start Guide](./PROXY_WAF_QUICKSTART.md)

**Migration guide**: See [Architecture Migration Plan](./ARCHITECTURE_MIGRATION.md)

---

## 📋 What Was the Legacy Architecture?

### Overview

The legacy architecture required ModSecurity to be installed **on the origin server**:

```
Internet → Origin Server (with ModSecurity installed)
                ↓
        ModSecurity runs on Apache/Nginx
        Policies deployed to nodes
        Nodes download configs and apply locally
```

### How It Worked

1. **Install ModSecurity** on your origin server (Apache/Nginx)
2. **Register Node** in dashboard
3. **Create Policy** in dashboard
4. **Deploy Policy** to node
5. **Node downloads** ModSecurity config
6. **Node applies** config to local ModSecurity
7. **ModSecurity protects** your website

### Limitations

- ❌ Required ModSecurity installation on origin server
- ❌ Complex setup and maintenance
- ❌ Not scalable (one node per website)
- ❌ Required server access to install ModSecurity
- ❌ Not like modern WAFs (Sucuri, Reblaze)

---

## 🔄 Why We Moved to Proxy WAF

### Benefits of Proxy WAF

- ✅ **No ModSecurity on origin** - WAF runs separately
- ✅ **DNS-based routing** - Just change DNS
- ✅ **Scalable** - One node protects multiple domains
- ✅ **Modern architecture** - Like Sucuri/Reblaze
- ✅ **Simpler setup** - No server access needed
- ✅ **Centralized** - All protection in one place

---

## 📚 Legacy Documentation

The following documentation describes the legacy architecture:

- [WAF Nodes Guide](./WAF_NODES_GUIDE.md) - Legacy node setup
- [ModSecurity Integration](./MODSECURITY_INTEGRATION.md) - Still relevant (used by proxy)
- [System Readiness](./SYSTEM_READINESS.md) - Legacy system assessment

---

## 🔧 Legacy APIs (Deprecated)

The following APIs are deprecated:

- `POST /api/deploy/[policyId]` - Policy deployment
- `GET /api/nodes/[id]/config` - Config download (legacy usage)
- `POST /api/nodes/[id]/config` - Deployment status (legacy usage)

**Replacement**: Use Applications API and Proxy WAF architecture.

---

## 🚀 Migration Path

### For Existing Users

1. **Create Application** in dashboard
2. **Configure Origin Server**
3. **Get WAF IP Addresses**
4. **Update DNS** to point to WAF
5. **Remove ModSecurity** from origin (optional)

See [Migration Guide](./ARCHITECTURE_MIGRATION.md) for details.

---

## ⏰ Timeline

- **Deprecated**: Now
- **Support Ends**: 6-12 months from now
- **Removal**: After migration period

---

**Status**: ⚠️ Deprecated - Use Proxy WAF architecture instead.
