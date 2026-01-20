# Proxy WAF Nodes Guide
## Complete Guide for Proxy WAF Architecture

---

## 🎯 What is a WAF Node in Proxy Architecture?

A **WAF Node** is a **reverse proxy server** that:
- Runs the ATRAVAD Proxy WAF software
- Acts as a reverse proxy (like Sucuri/Reblaze)
- Fetches application configurations from the dashboard
- Protects multiple domains automatically
- Handles SSL/TLS termination
- Routes traffic to origin servers

**Key Difference from Legacy:**
- **Legacy**: Node ran ModSecurity on origin server
- **Proxy WAF**: Node runs as separate proxy server, protects multiple domains

---

## 🏗️ Proxy WAF Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              ATRAVAD WAF Dashboard                          │
│  - Creates applications                                     │
│  - Configures domains + origins + policies                  │
│  - Manages all nodes                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP API
                        │ (Nodes fetch application configs)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Proxy Node 1 │ │  Proxy Node 2 │ │  Proxy Node 3 │
│               │ │               │ │               │
│ Reverse Proxy │ │ Reverse Proxy │ │ Reverse Proxy │
│ ModSecurity   │ │ ModSecurity   │ │ ModSecurity   │
│               │ │               │ │               │
│ Protects:     │ │ Protects:     │ │ Protects:     │
│ - example.com │ │ - api.com     │ │ - app.com     │
│ - blog.com    │ │ - store.com   │ │ - admin.com   │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                          ▼
                  Origin Servers
```

### How It Works

1. **Dashboard** creates applications with domains, origins, and policies
2. **Proxy Nodes** fetch application configurations automatically
3. **DNS** points to proxy node IPs
4. **Traffic flows**: User → DNS → Proxy Node → ModSecurity → Origin
5. **One node** can protect **multiple domains**

---

## 📋 Step-by-Step Setup

### Step 1: Register Node in Dashboard

1. Log into ATRAVAD WAF dashboard
2. Go to **"WAF Nodes"** page
3. Click **"Register Node"**
4. Fill in:
   - **Node Name**: e.g., "US-East Proxy Node"
   - **IP Address**: Public IP of your proxy server
5. **Save credentials** (shown only once):
   - **Node ID**: `node-abc123...`
   - **API Key**: `atravad_xyz789...`

### Step 2: Install Proxy Server Software

On your server, install and run the proxy server:

```bash
# Option 1: Using Node.js directly
node proxy-server-standalone.js \
  --node-id=node-abc123 \
  --api-key=atravad_xyz789 \
  --dashboard-url=https://dashboard.atravad.com

# Option 2: Using environment variables
export ATRAVAD_NODE_ID=node-abc123
export ATRAVAD_API_KEY=atravad_xyz789
export ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com
export ATRAVAD_HTTP_PORT=80
export ATRAVAD_HTTPS_PORT=443

node proxy-server-standalone.js
```

### Step 3: Verify Node is Online

1. Go back to **"WAF Nodes"** page
2. Check status - should show **"Online"** (green)
3. Check "Last Seen" - should be recent

### Step 4: Create Applications

1. Go to **"Applications"** page
2. Create application:
   - **Domain**: `example.com`
   - **Origin**: `https://origin.example.com`
   - **Policy**: Select security policy
3. Node automatically fetches this application
4. Protection is active!

---

## 🔄 How Nodes Work

### Automatic Configuration Fetching

Nodes poll the dashboard every 30-60 seconds:

```javascript
// Node automatically does this:
GET /api/nodes/[NODE_ID]/config
Headers:
  X-Node-Id: node-abc123
  X-Node-Api-Key: atravad_xyz789

// Response:
{
  "nodeId": "node-abc123",
  "hasConfig": true,
  "applications": [
    {
      "id": "app-123",
      "domain": "example.com",
      "origins": [
        { "url": "https://origin.example.com", "weight": 100 }
      ],
      "policy": {
        "modSecurityConfig": "...",
        "mode": "prevention"
      }
    }
  ]
}
```

### Domain-Based Routing

When a request arrives:

1. Node reads `Host` header: `example.com`
2. Looks up application for `example.com`
3. Applies ModSecurity rules from policy
4. If safe → forwards to origin server
5. If attack → blocks (403)

### Health Checks

Nodes automatically check origin server health:

- Checks every 30 seconds (configurable)
- Uses health check path (default: `/health`)
- Automatic failover if origin is down
- Weighted load balancing

---

## 🚀 Proxy Server Software

### What It Does

The proxy server (`proxy-server-standalone.js`):

1. **Connects to Dashboard**
   - Authenticates with Node ID and API Key
   - Fetches application configurations

2. **Runs Reverse Proxy**
   - Listens on ports 80 (HTTP) and 443 (HTTPS)
   - Handles SSL/TLS termination
   - Routes based on Host header

3. **Integrates ModSecurity**
   - Inspects every request
   - Blocks attacks automatically
   - Logs security events

4. **Forwards to Origins**
   - Routes clean traffic to origin servers
   - Handles health checks
   - Supports failover

### Running the Proxy Server

**Basic Usage:**
```bash
node proxy-server-standalone.js \
  --node-id=YOUR_NODE_ID \
  --api-key=YOUR_API_KEY \
  --dashboard-url=https://dashboard.atravad.com
```

**With Environment Variables:**
```bash
export ATRAVAD_NODE_ID=node-abc123
export ATRAVAD_API_KEY=atravad_xyz789
export ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com
export ATRAVAD_HTTP_PORT=80
export ATRAVAD_HTTPS_PORT=443

node proxy-server-standalone.js
```

**As a Service (systemd):**
```ini
[Unit]
Description=ATRAVAD Proxy WAF Server
After=network.target

[Service]
Type=simple
User=atravad
Environment="ATRAVAD_NODE_ID=node-abc123"
Environment="ATRAVAD_API_KEY=atravad_xyz789"
Environment="ATRAVAD_DASHBOARD_URL=https://dashboard.atravad.com"
ExecStart=/usr/bin/node /opt/atravad-waf/proxy-server-standalone.js
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 🔐 Node Authentication

### API Key Authentication

All node requests require:
- `X-Node-Id`: Your Node ID
- `X-Node-Api-Key`: Your API Key

**Example:**
```bash
curl https://dashboard.atravad.com/api/nodes/node-abc123/config \
  -H "X-Node-Id: node-abc123" \
  -H "X-Node-Api-Key: atravad_xyz789"
```

### Security

- API keys are cryptographically secure (32 bytes entropy)
- Keys are hashed before storage
- Constant-time comparison prevents timing attacks
- Failed attempts are logged

---

## 📊 Node Health Reporting

Nodes send health reports:

```bash
POST /api/nodes/[NODE_ID]/health
Headers:
  X-Node-Id: node-abc123
  X-Node-Api-Key: atravad_xyz789

Body:
{
  "status": "online",
  "version": "1.0.0",
  "uptime": 3600,
  "cpuUsage": 45.5,
  "memoryUsage": 60.2,
  "activeConnections": 150
}
```

Dashboard shows:
- Node status (online/offline)
- Last seen timestamp
- Health metrics
- Active connections

---

## 🌍 Multiple Domains per Node

**One node can protect multiple domains:**

```
Proxy Node 1 (IP: 1.2.3.4)
├── example.com → origin1.example.com
├── blog.example.com → origin2.example.com
├── api.example.com → origin3.example.com
└── store.example.com → origin4.example.com
```

**How it works:**
- Node fetches ALL applications for its tenant
- Routes traffic based on `Host` header
- Each domain can have different:
  - Origin servers
  - Security policies
  - SSL certificates

---

## 🔄 Traffic Flow Example

### Scenario: User visits `example.com`

1. **DNS Resolution**
   ```
   User types: example.com
   DNS returns: 1.2.3.4 (Proxy Node IP)
   ```

2. **Request Arrives at Proxy Node**
   ```
   GET / HTTP/1.1
   Host: example.com
   ```

3. **Node Looks Up Application**
   ```
   Node checks: applications.get('example.com')
   Found: Application config with origin + policy
   ```

4. **ModSecurity Inspection**
   ```
   ModSecurity checks request
   ✅ Safe → Continue
   ❌ Attack → Block (403)
   ```

5. **Forward to Origin**
   ```
   Node forwards to: https://origin.example.com
   Origin responds
   Node returns response to user
   ```

---

## 🛡️ Protection Features

### What Nodes Protect

- ✅ **SQL Injection** - Detected and blocked
- ✅ **XSS Attacks** - Script injection blocked
- ✅ **Path Traversal** - Directory traversal blocked
- ✅ **RCE Attempts** - Command injection blocked
- ✅ **File Upload Attacks** - Dangerous files blocked
- ✅ **Rate Limiting** - DDoS protection
- ✅ **Bot Detection** - Automated bot blocking
- ✅ **OWASP CRS** - Industry-standard rules

### ModSecurity Integration

- Nodes use ModSecurity v3 for inspection
- Policies generate ModSecurity configurations
- Rules are applied per-application
- Real-time blocking and logging

---

## 📈 Monitoring

### Dashboard Shows

- **Node Status**: Online/Offline
- **Last Seen**: When node last reported
- **Health Metrics**: CPU, Memory, Connections
- **Applications Protected**: List of domains
- **Traffic Stats**: Requests, blocked attacks

### Node Logs

Nodes can send security logs to dashboard:
- Blocked requests
- Attack types detected
- Performance metrics
- Error logs

---

## 🔧 Configuration

### Node Configuration

Nodes automatically get:
- Application configurations
- Security policies
- Origin server settings
- Health check configs

**No manual configuration needed!**

### Application Configuration

Each application has:
- **Domain**: What domain to protect
- **Origins**: Where to forward traffic
- **Policy**: Security rules to apply
- **SSL**: Certificate configuration
- **Routing**: Path routing rules

---

## ✅ Quick Start Checklist

- [ ] **Register node** in dashboard
- [ ] **Save credentials** (Node ID + API Key)
- [ ] **Install proxy server** on your server
- [ ] **Configure** with Node ID and API Key
- [ ] **Start proxy server**
- [ ] **Verify** node shows "Online" in dashboard
- [ ] **Create application** with domain and origin
- [ ] **Update DNS** to point to node IP
- [ ] **Test** - Visit your domain
- [ ] **Verify protection** - Try an attack (should be blocked)

---

## 🎯 Key Benefits

✅ **One Node, Multiple Domains** - Protect many sites with one node  
✅ **Automatic Updates** - Configs fetched automatically  
✅ **No Deployment** - Just create applications  
✅ **Health Checks** - Automatic failover  
✅ **Scalable** - Add more nodes easily  
✅ **Modern** - Like Sucuri/Reblaze  

---

## 📚 Related Guides

- [Proxy WAF Quick Start](./PROXY_WAF_QUICKSTART.md)
- [DNS Setup Guide](./DNS_SETUP_GUIDE.md)
- [Proxy WAF Architecture](./PROXY_WAF_ARCHITECTURE.md)
- [Implementation Guide](./PROXY_WAF_IMPLEMENTATION.md)

---

**Status**: ✅ Complete guide for proxy WAF nodes
