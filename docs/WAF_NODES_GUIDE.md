# WAF Nodes - Complete Beginner's Guide
## (Idiot-Proof Step-by-Step Instructions)

> ⚠️ **DEPRECATED ARCHITECTURE**: This guide describes the legacy WAF architecture where ModSecurity runs on origin servers. 
> 
> **NEW ARCHITECTURE**: ATRAVAD WAF now uses a modern **proxy WAF architecture** where the WAF acts as a reverse proxy.
> 
> **👉 For the new architecture, see: [Proxy WAF Quick Start Guide](./PROXY_WAF_QUICKSTART.md)**
> 
> This legacy guide is kept for backward compatibility. New deployments should use the proxy WAF architecture.

---

## 🏗️ **ATRAVAD WAF Architecture - ModSecurity Core Engine**

### **Yes, This System Uses ModSecurity Architecture!**

ATRAVAD WAF is **powered by ModSecurity** as its core engine. Here's how it works:

```
┌─────────────────────────────────────────────────────────────┐
│              ATRAVAD WAF Dashboard (Central Control)        │
│  - Creates security policies                                 │
│  - Generates ModSecurity configurations                      │
│  - Deploys to nodes                                          │
│  - Monitors all nodes                                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP API Calls
                        │ (Deploy configurations)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  WAF Node 1  │ │  WAF Node 2  │ │  WAF Node 3  │
│              │ │              │ │              │
│ ModSecurity  │ │ ModSecurity  │ │ ModSecurity  │
│   Engine     │ │   Engine     │ │   Engine     │
│              │ │              │ │              │
│  Protects    │ │  Protects    │ │  Protects    │
│  Website A   │ │  Website B   │ │  Website C   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### **How It Works:**

1. **Dashboard (Central Brain)**
   - You use the web dashboard to create security policies
   - Dashboard generates **ModSecurity configuration files** automatically
   - You choose which nodes to deploy policies to

2. **ModSecurity Engine (On Each Node)**
   - Each WAF node runs **ModSecurity** (the actual security software)
   - ModSecurity reads the configuration files from the dashboard
   - ModSecurity inspects every HTTP request and blocks attacks

3. **Protection Flow:**
   ```
   Website Visitor → WAF Node (ModSecurity) → Your Website
                           ↓
                    Checks request against
                    ModSecurity rules
                           ↓
                    Blocks if attack detected
                    OR allows if safe
   ```

### **Key Points:**

✅ **ModSecurity IS the core engine** - It does all the actual protection  
✅ **Dashboard is the control center** - You manage policies, nodes deploy them  
✅ **Each node runs ModSecurity** - Multiple servers, each running ModSecurity  
✅ **Centralized management** - One dashboard controls many ModSecurity nodes  
✅ **OWASP CRS included** - Uses industry-standard OWASP Core Rule Set

---

## 📖 What is a WAF Node? (Simple Explanation)

A **WAF Node** is a server that runs **ModSecurity** to protect your website. Think of it like this:

- **WAF Node** = Server with ModSecurity installed
- **ModSecurity** = The actual security software that blocks attacks
- **Dashboard** = Control panel to manage all your nodes

**In simple terms:** 
- **WAF Node** = Security guard server
- **ModSecurity** = The guard's brain (knows what to block)
- **Policy** = The instructions you give to the guard

You can have **multiple nodes** (multiple servers with ModSecurity) protecting different websites or providing backup protection.

---

## 🎯 Quick Overview: How It All Works

```
1. You register a node → "Hey, this server is now a guard!"
2. Node says "Hello!" → Node checks in with the dashboard
3. You deploy a policy → "Guard, follow these security rules!"
4. Node downloads rules → Node gets the security instructions
5. Node protects website → Node blocks bad traffic
6. Node reports back → "I blocked 5 attacks today!"
```

---

## 📝 STEP-BY-STEP INSTRUCTIONS

### **STEP 1: Register Your WAF Node**

#### What you need:
- A server/computer where you'll run the WAF node software
- The IP address or hostname of that server
- Access to the ATRAVAD WAF dashboard (Admin role)

#### How to do it:

1. **Log into the Dashboard**
   - Go to `http://your-dashboard-url.com`
   - Log in with your admin account

2. **Go to WAF Nodes Page**
   - Click **"WAF Nodes"** in the left sidebar
   - You'll see a list of registered nodes (probably empty at first)

3. **Register a New Node**
   - Click the **"Register Node"** button (top right)
   - Fill in the form:
     - **Node Name**: Give it a friendly name (e.g., "Production Server 1", "Main WAF Node")
     - **IP Address**: Enter the server's IP (e.g., `192.168.1.100`) or hostname (e.g., `waf-node1.example.com`)

4. **Save and Get Credentials**
   - Click **"Register Node"** button
   - A modal will appear showing **TWO CREDENTIALS** - **SAVE BOTH IMMEDIATELY!**
     - **Secure Node ID** (random UUID, e.g., `a7f3b9c2-4d1e-4f8a-9b6c-3e5d7a8b9c0d`)
     - **Node API Key** (e.g., `atravad_abc123xyz456...`)
   - You'll see your new node appear in the list with status **"Offline"** (that's normal!)

#### ⚠️ CRITICAL: Save Your Credentials!
- **The API key is shown ONLY ONCE** during registration
- If you lose the API key, you'll need to rotate it from the dashboard (Nodes page → Key button)
- Both credentials are required to configure your node connector software

#### ⚠️ Important Notes:
- The node starts as **"Offline"** - it will become **"Online"** once the node software connects
- You'll get a **Secure Node ID** (random UUID) - **SAVE THIS!** You'll need it for the node software
- You'll get a **Node API Key** (starts with `atravad_`) - **SAVE THIS TOO!** You'll need it for authentication
- **SECURITY**: Both credentials are cryptographically secure. Keep them secret - they authenticate your node!
- The node name you enter is just for display/management purposes - the actual credentials are auto-generated for security
- You'll need **BOTH** credentials to configure your node connector software

---

### **STEP 2: Install ModSecurity on Your Server**

#### Prerequisites:
Before enrolling a node, you need:
1. **A server** (Linux recommended - Ubuntu, CentOS, etc.)
2. **ModSecurity installed** on that server
3. **Node connector software** (we'll create this - see below)

#### Install ModSecurity:

**For Apache:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install libapache2-mod-security2 modsecurity-crs

# Enable ModSecurity
sudo a2enmod security2
sudo systemctl restart apache2
```

**For Nginx:**
```bash
# Install ModSecurity for Nginx
# (This requires compiling - see official ModSecurity docs)
```

#### Verify ModSecurity is Installed:
```bash
# Check if ModSecurity module is loaded
apache2ctl -M | grep security2
# OR for Nginx
nginx -V 2>&1 | grep -o with-http_modsecurity
```

---

### **STEP 3: Create Node Connector Software**

#### What the Node Connector Software Does:

The node connector software is a **bridge** between:
- **Your server** (where ModSecurity runs)
- **ATRAVAD Dashboard** (where you manage policies)

**Think of it as:**
- A "reporter" that tells the dashboard: "I'm alive!"
- A "downloader" that gets new security rules from dashboard
- An "applier" that updates ModSecurity configuration files

Your WAF node connector software needs to:

1. **Send Heartbeat (Health Check)**
   - Every 30-60 seconds, tell the dashboard: "I'm alive!"
   - **Endpoint**: `POST /api/nodes/[YOUR_NODE_ID]/health`
   - **Required Headers**: `X-Node-Id` and `X-Node-Api-Key` (authentication)
   - **Example**:
   ```bash
   curl -X POST https://your-dashboard-url.com/api/nodes/abc123xyz456/health \
     -H "Content-Type: application/json" \
     -H "X-Node-Id: YOUR_NODE_ID" \
     -H "X-Node-Api-Key: YOUR_API_KEY" \
     -d '{
       "status": "online",
       "version": "1.0.0",
       "uptime": 3600,
       "cpuUsage": 45.5,
       "memoryUsage": 60.2,
       "activeConnections": 150,
       "policiesDeployed": 1,
       "lastLogTime": "2024-01-15T10:30:00Z"
     }'
   ```

2. **Check for New Policies (Polling)**
   - Every 30-60 seconds, ask: "Do I have new security rules?"
   - **Endpoint**: `GET /api/nodes/[YOUR_NODE_ID]/config`
   - **Required Headers**: `X-Node-Id` and `X-Node-Api-Key` (authentication)
   - **Example**:
   ```bash
   curl https://your-dashboard-url.com/api/nodes/abc123xyz456/config \
     -H "X-Node-Id: YOUR_NODE_ID" \
     -H "X-Node-Api-Key: YOUR_API_KEY"
   ```
   - **Response** (when policy is deployed):
   ```json
   {
     "nodeId": "abc123xyz456",
     "hasConfig": true,
     "deploymentId": "deploy123",
     "policy": {
       "id": "policy456",
       "name": "My Security Policy",
       "version": 1,
       "modSecurityConfig": "# ModSecurity configuration here...",
       "mode": "prevention",
       "includeOWASPCRS": true
     }
   }
   ```

3. **Report Deployment Status**
   - After applying a policy, tell the dashboard: "I applied it!" or "Failed!"
   - **Endpoint**: `POST /api/nodes/[YOUR_NODE_ID]/config`
   - **Required Headers**: `X-Node-Id` and `X-Node-Api-Key` (authentication)
   - **Example** (success):
   ```bash
   curl -X POST https://your-dashboard-url.com/api/nodes/abc123xyz456/config \
     -H "Content-Type: application/json" \
     -H "X-Node-Id: YOUR_NODE_ID" \
     -H "X-Node-Api-Key: YOUR_API_KEY" \
     -d '{
       "deploymentId": "deploy123",
       "status": "deployed"
     }'
   ```
   - **Example** (failure):
   ```bash
   curl -X POST https://your-dashboard-url.com/api/nodes/abc123xyz456/config \
     -H "Content-Type: application/json" \
     -H "X-Node-Id: YOUR_NODE_ID" \
     -H "X-Node-Api-Key: YOUR_API_KEY" \
     -d '{
       "deploymentId": "deploy123",
       "status": "failed",
       "error": "Could not reload ModSecurity configuration"
     }'
   ```

4. **Apply ModSecurity Configuration**
   - When a policy is received, **save it to ModSecurity config file**
   - **Reload ModSecurity** to apply new rules
   - **Example** (save config and reload):
   ```bash
   # Save the ModSecurity configuration
   echo "$MODSECURITY_CONFIG" > /etc/modsecurity/atravad-policy.conf
   
   # Reload Apache/Nginx to apply changes
   sudo systemctl reload apache2
   # OR for Nginx:
   sudo nginx -s reload
   ```

5. **Send Logs (Optional)**
   - Parse ModSecurity audit logs
   - Send security events to the dashboard
   - **Endpoint**: `POST /api/logs`
   - **Required Headers**: `X-Node-Id` and `X-Node-Api-Key` (authentication)
   - **Example**:
   ```bash
   curl -X POST https://your-dashboard-url.com/api/logs \
     -H "Content-Type: application/json" \
     -H "X-Node-Id: YOUR_NODE_ID" \
     -H "X-Node-Api-Key: YOUR_API_KEY" \
     -d '{
       "nodeId": "abc123xyz456",
       "logs": [
         {
           "timestamp": "2024-01-15T10:30:00Z",
           "level": "warning",
           "message": "SQL injection attempt detected",
           "ruleId": "941100",
           "severity": "high",
           "blocked": true,
           "clientIp": "192.168.1.50",
           "uri": "/api/login",
           "method": "POST"
         }
       ]
     }'
   ```

#### 🔐 API Key Authentication (REQUIRED)

**All API endpoints require authentication using two headers:**

- `X-Node-Id`: Your Secure Node ID (from registration)
- `X-Node-Api-Key`: Your Node API Key (from registration)

**Without these headers, all requests will be rejected with `401 Unauthorized`.**

**Best Practices:**
- Store credentials securely (environment variables, config file with restricted permissions)
- Never commit API keys to version control (use `.gitignore`)
- If you lose your API key, you can rotate it from the dashboard (Nodes page → Key button → Rotate API Key)
- Rate limiting is applied per-node - excessive requests may result in `429 Too Many Requests`

#### Sample Node Connector Software (Complete Example):

```python
import time
import requests
import subprocess
import os

# CREDENTIALS - Get these from the registration modal!
NODE_ID = "abc123xyz456"  # Your Secure Node ID from registration
NODE_API_KEY = "atravad_abc123xyz456..."  # Your Node API Key from registration
DASHBOARD_URL = "https://your-dashboard-url.com"
MODSECURITY_CONFIG_PATH = "/etc/modsecurity/atravad-policy.conf"

# Authentication headers for all API requests
AUTH_HEADERS = {
    "X-Node-Id": NODE_ID,
    "X-Node-Api-Key": NODE_API_KEY,
    "Content-Type": "application/json"
}

def send_heartbeat():
    """Send health check every 30 seconds"""
    response = requests.post(
        f"{DASHBOARD_URL}/api/nodes/{NODE_ID}/health",
        headers=AUTH_HEADERS,
        json={
            "status": "online",
            "version": "1.0.0",
            "uptime": get_uptime(),
            "cpuUsage": get_cpu_usage(),
            "memoryUsage": get_memory_usage(),
            "activeConnections": get_active_connections(),
            "policiesDeployed": 1 if os.path.exists(MODSECURITY_CONFIG_PATH) else 0,
            "lastLogTime": get_last_log_time()
        }
    )
    if response.status_code == 401:
        print("ERROR: Authentication failed! Check your NODE_ID and NODE_API_KEY")
        return False
    return response.status_code == 200

def check_for_config():
    """Check for new policies every 30 seconds"""
    response = requests.get(
        f"{DASHBOARD_URL}/api/nodes/{NODE_ID}/config",
        headers=AUTH_HEADERS
    )
    
    if response.status_code == 401:
        print("ERROR: Authentication failed! Check your NODE_ID and NODE_API_KEY")
        return False
    
    if response.status_code == 200:
        data = response.json()
        
        if data.get("hasConfig"):
            policy = data["policy"]
            deployment_id = data["deploymentId"]
            modsecurity_config = policy["modSecurityConfig"]
            
            # STEP 1: Save ModSecurity configuration to file
            success = apply_modsecurity_config(modsecurity_config)
            
            # STEP 2: Reload ModSecurity (reload Apache/Nginx)
            if success:
                reload_success = reload_modsecurity()
                if reload_success:
                    report_deployment_status(deployment_id, "deployed")
                else:
                    report_deployment_status(deployment_id, "failed", "Could not reload ModSecurity")
            else:
                report_deployment_status(deployment_id, "failed", "Could not save configuration")
    
    return response.status_code == 200

def apply_modsecurity_config(config_content):
    """Save ModSecurity configuration to file"""
    try:
        # Write the ModSecurity configuration
        with open(MODSECURITY_CONFIG_PATH, 'w') as f:
            f.write(config_content)
        
        # Include it in main ModSecurity config
        # Add to /etc/modsecurity/modsecurity.conf:
        # Include /etc/modsecurity/atravad-policy.conf
        
        return True
    except Exception as e:
        print(f"Error saving config: {e}")
        return False

def reload_modsecurity():
    """Reload Apache/Nginx to apply new ModSecurity rules"""
    try:
        # For Apache
        result = subprocess.run(
            ['sudo', 'systemctl', 'reload', 'apache2'],
            capture_output=True,
            text=True
        )
        
        # OR for Nginx:
        # result = subprocess.run(
        #     ['sudo', 'nginx', '-s', 'reload'],
        #     capture_output=True,
        #     text=True
        # )
        
        return result.returncode == 0
    except Exception as e:
        print(f"Error reloading ModSecurity: {e}")
        return False

def report_deployment_status(deployment_id, status, error=None):
    """Report if policy deployment succeeded or failed"""
    payload = {
        "deploymentId": deployment_id,
        "status": status
    }
    
    if error:
        payload["error"] = error
    
    response = requests.post(
        f"{DASHBOARD_URL}/api/nodes/{NODE_ID}/config",
        headers=AUTH_HEADERS,
        json=payload
    )
    if response.status_code == 401:
        print("ERROR: Authentication failed! Check your NODE_ID and NODE_API_KEY")
        return False
    return response.status_code == 200

# Main loop
while True:
    send_heartbeat()
    check_for_config()
    time.sleep(30)  # Wait 30 seconds before next check
```

#### Configure Apache/Nginx to Use Generated Policy:

**Apache Configuration (`/etc/apache2/mods-available/security2.conf`):**
```apache
<IfModule security2_module>
    # Include base ModSecurity config
    Include /etc/modsecurity/modsecurity.conf
    
    # Include OWASP CRS (if installed)
    Include /etc/modsecurity/crs-setup.conf
    Include /etc/modsecurity/rules/*.conf
    
    # Include ATRAVAD WAF policy (generated by dashboard)
    Include /etc/modsecurity/atravad-policy.conf
</IfModule>
```

**Nginx Configuration:**
```nginx
http {
    modsecurity on;
    modsecurity_rules_file /etc/modsecurity/modsecurity.conf;
    
    # Include ATRAVAD WAF policy
    modsecurity_rules_file /etc/modsecurity/atravad-policy.conf;
}
```

---

### **STEP 4: Verify Node is Online**

1. **Go back to WAF Nodes page** in the dashboard
2. **Check the Status column**
   - If it shows **"Online"** (green badge) → ✅ Success! Node is connected
   - If it shows **"Offline"** (red badge) → ❌ Node software isn't running or can't connect

3. **Check "Last Seen"**
   - Should show a recent timestamp (within the last minute if node is working)
   - If it says "Never" → Node hasn't connected yet

#### Troubleshooting if Node is Offline:

- ✅ Check if your node software is running
- ✅ Check if your node software has the correct **Secure Node ID**
- ✅ Check if your node software has the correct **Node API Key**
- ✅ Check if authentication headers (`X-Node-Id` and `X-Node-Api-Key`) are being sent
- ✅ Check node software logs for `401 Unauthorized` errors (authentication failure)
- ✅ Check if your node software can reach the dashboard URL (firewall, network)
- ✅ Check if your node software is sending heartbeat correctly
- ✅ If API key is lost, rotate it from the dashboard (Nodes page → Key button → Rotate API Key)

---

### **STEP 5: Deploy a Policy to Your Node (This Applies ModSecurity Rules)**

#### What is a Policy?
A **Policy** = A set of security rules that tells the WAF node what to block and what to allow.

#### How to Deploy:

1. **Create or Select a Policy**
   - Go to **"Security Policies"** page
   - Create a new policy OR select an existing one
   - Configure what you want to protect (SQL injection, XSS, etc.)

2. **Deploy the Policy**
   - Click on the policy you want to deploy
   - Look for **"Deploy"** button or go to the policy details page
   - Select which nodes to deploy to (check the boxes next to node names)
   - Click **"Deploy"**

3. **Watch the Deployment**
   - You'll see deployment status: **"Pending"** → **"In Progress"** → **"Completed"** or **"Failed"**
   - This shows you if the nodes successfully received and applied the policy

#### What Happens Behind the Scenes (ModSecurity Flow):

```
1. You click "Deploy" in dashboard
   ↓
2. Dashboard generates ModSecurity configuration file
   (Using ModSecurity rule engine - SQL injection rules, XSS rules, etc.)
   ↓
3. Dashboard stores the ModSecurity config in database
   ↓
4. Dashboard creates a "deployment" record
   ↓
5. Node connector checks for config (polls every 30 seconds)
   ↓
6. Node downloads the ModSecurity configuration
   ↓
7. Node saves config to /etc/modsecurity/atravad-policy.conf
   ↓
8. Node reloads Apache/Nginx (ModSecurity reads new config)
   ↓
9. ModSecurity engine now actively protects your website
   (Every HTTP request is checked against ModSecurity rules)
   ↓
10. Node reports "deployed" or "failed" back to dashboard
   ↓
11. Dashboard shows you the status
```

#### How Your Website Gets Protected:

Once ModSecurity configuration is deployed:

1. **HTTP Request Arrives** at your website
   ```
   Visitor → Your Server (Nginx/Apache with ModSecurity)
   ```

2. **ModSecurity Intercepts the Request**
   ```
   ModSecurity checks request against rules:
   - SQL injection patterns?
   - XSS attacks?
   - Path traversal?
   - etc.
   ```

3. **ModSecurity Decision:**
   - ✅ **Safe Request** → Passes to your website
   - ❌ **Attack Detected** → Blocks request, returns 403 Forbidden

4. **ModSecurity Logs Everything**
   - All blocked requests logged
   - Logs sent to dashboard (if configured)
   - You see security events in dashboard

---

## 🔄 Complete Workflow Example

Let's say you want to protect `example.com`:

### Day 1: Setup

1. **Register Node in Dashboard**
   - Dashboard → WAF Nodes → Register Node
   - Name: "Production WAF"
   - IP: `192.168.1.100`
   - **Two credentials created:**
     - Node ID: `node_abc123` ← **SAVE THIS!**
     - API Key: `atravad_xyz789...` ← **SAVE THIS TOO!** (shown only once)

2. **Install ModSecurity on Server** (`192.168.1.100`)
   ```bash
   # Install ModSecurity for Apache
   sudo apt-get install libapache2-mod-security2 modsecurity-crs
   sudo a2enmod security2
   sudo systemctl restart apache2
   ```

3. **Install Node Connector Software**
   - Install Python connector (or your preferred language)
   - Configure with **both credentials:**
     - Node ID: `node_abc123`
     - API Key: `atravad_xyz789...`
   - Set dashboard URL
   - Start the connector service

4. **Verify Connection**
   - Dashboard → WAF Nodes
   - Status should show "Online" ✅
   - ModSecurity is installed, connector is running

### Day 2: Protect Your Website

1. **Create Security Policy**
   - Dashboard → Security Policies → Create Policy
   - Name: "Protect Example.com"
   - Enable: SQL Injection, XSS Protection
   - Mode: Prevention (block attacks)
   - **Dashboard automatically generates ModSecurity configuration**

2. **Deploy Policy to Node**
   - Select the policy → Deploy
   - Choose "Production WAF" node
   - Click Deploy
   - **Dashboard sends ModSecurity config to node**

3. **Verify Deployment**
   - Wait 30-60 seconds (for node to poll and download)
   - Node connector downloads ModSecurity config
   - Node saves config to `/etc/modsecurity/atravad-policy.conf`
   - Node reloads Apache (ModSecurity loads new rules)
   - Check deployment status: Should show "Completed" ✅
   - **Your website is now protected by ModSecurity!**

4. **Test Protection**
   - Try accessing: `https://example.com/?id=1' OR '1'='1`
   - ModSecurity should block it (403 Forbidden)
   - Check logs in dashboard - you'll see the blocked attack

---

## 📊 Monitoring Your Nodes

### Dashboard Shows You:

- **Status**: Online/Offline (green/red badge)
- **Last Seen**: When node last checked in
- **Health Metrics**: CPU, Memory, Connections (if node reports them)
- **Deployment Status**: Which policies are active on each node
- **Logs**: Security events detected by the node

### Node Status Meanings:

- 🟢 **Online**: Node is connected and working
- 🔴 **Offline**: Node hasn't checked in (might be down, or software not running)
- 🟡 **Warning**: Node reported an issue

---

## 🎓 Key Concepts (Simple Terms)

| Term | What It Means |
|------|---------------|
| **ModSecurity** | **The core security engine** - Open-source WAF software that actually blocks attacks |
| **WAF Node** | A server with ModSecurity installed and node connector software running |
| **Node Connector** | Software that connects your server to the dashboard (downloads policies, sends status) |
| **Policy** | Security settings you configure - Dashboard converts this to ModSecurity configuration |
| **ModSecurity Config** | The actual rule file that ModSecurity reads (generated automatically by dashboard) |
| **Deployment** | Process of sending ModSecurity config from dashboard to node |
| **Heartbeat** | Node connector saying "I'm alive!" to dashboard every 30 seconds |
| **Polling** | Node connector asking "Any new ModSecurity configs for me?" every 30 seconds |
| **OWASP CRS** | Industry-standard security rules included with ModSecurity |

---

## ❓ Frequently Asked Questions

### Q: Can I have multiple nodes?
**A:** Yes! You can register as many nodes as you want. Each node protects your website independently.

### Q: How often does the node check for updates?
**A:** The node software should check every 30-60 seconds. This is configurable in your node software.

### Q: What if my node goes offline?
**A:** Your website won't be protected by that node. Other nodes (if you have them) will still protect you. Fix the offline node as soon as possible.

### Q: Do I need to restart the node after deploying a policy?
**A:** No! The node software should automatically apply new configurations without restarting.

### Q: How do I know if the node is blocking attacks?
**A:** Check the Logs page in the dashboard. It shows all security events detected and blocked.

### Q: What if deployment fails?
**A:** Check the deployment status. It will show an error message. Common issues:
- Node is offline
- ModSecurity configuration error
- Network connectivity issues

---

## 🚀 Quick Start Checklist

- [ ] **Install ModSecurity** on your server (Apache or Nginx)
- [ ] **Register node** in dashboard (get Node ID)
- [ ] **Install node connector software** on your server
- [ ] **Configure connector** with Node ID and dashboard URL
- [ ] **Start connector service**
- [ ] **Verify node shows "Online"** in dashboard
- [ ] **Create a security policy** in dashboard
- [ ] **Dashboard generates ModSecurity config** automatically
- [ ] **Deploy policy to node**
- [ ] **Node downloads and applies ModSecurity config**
- [ ] **Verify deployment status** is "Completed"
- [ ] **Test protection** - Try an attack, ModSecurity should block it!
- [ ] **Check logs** in dashboard to see blocked attacks

## 🎯 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATRAVAD WAF Dashboard                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Policy Editor (Visual UI)                               │  │
│  │  ↓                                                        │  │
│  │  ModSecurity Config Generator                            │  │
│  │  ↓                                                        │  │
│  │  Generates: SecRule, SecAction, etc.                     │  │
│  │  Includes: OWASP CRS rules                               │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ HTTP API
                        │ (Deploy ModSecurity Config)
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Server 1     │ │ Server 2     │ │ Server 3     │
│              │ │              │ │              │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │  Node    │ │ │ │  Node    │ │ │ │  Node    │ │
│ │Connector │ │ │ │Connector │ │ │ │Connector │ │
│ └────┬─────┘ │ │ └────┬─────┘ │ │ └────┬─────┘ │
│      │       │ │      │       │ │      │       │
│ ┌────▼─────┐ │ │ ┌────▼─────┐ │ │ ┌────▼─────┐ │
│ │ModSecurity│ │ │ │ModSecurity│ │ │ │ModSecurity│ │
│ │  Engine   │ │ │ │  Engine   │ │ │ │  Engine   │ │
│ │           │ │ │ │           │ │ │ │           │ │
│ │ Reads:    │ │ │ │ Reads:    │ │ │ │ Reads:    │ │
│ │ /etc/...  │ │ │ │ /etc/...  │ │ │ │ /etc/...  │ │
│ │ /atravad- │ │ │ │ /atravad- │ │ │ │ /atravad- │ │
│ │ policy.   │ │ │ │ policy.   │ │ │ │ policy.   │ │
│ │ conf      │ │ │ │ conf      │ │ │ │ conf      │ │
│ └────┬─────┘ │ │ └────┬─────┘ │ │ └────┬─────┘ │
│      │       │ │      │       │ │      │       │
│      ▼       │ │      ▼       │ │      ▼       │
│  Website A   │ │  Website B   │ │  Website C   │
│  Protected!  │ │  Protected!  │ │  Protected!  │
└──────────────┘ └──────────────┘ └──────────────┘

How Protection Works:
Visitor Request → Apache/Nginx → ModSecurity Engine → Website
                              ↓
                    ModSecurity checks
                    against rules
                              ↓
                    Safe? → Pass
                    Attack? → Block (403)
```

## 📚 Summary: How ATRAVAD WAF Uses ModSecurity

✅ **ModSecurity IS the core engine** - It does all the real protection work  
✅ **Dashboard generates ModSecurity configs** - You use a simple UI, it creates complex ModSecurity rules  
✅ **Nodes run ModSecurity** - Each server has ModSecurity installed and running  
✅ **Centralized control** - One dashboard manages many ModSecurity instances  
✅ **Automatic deployment** - Configs are pushed to nodes automatically  
✅ **OWASP CRS included** - Uses industry-standard security rules  
✅ **No manual rule editing** - Dashboard handles all ModSecurity complexity for you

**The Flow:**
1. You configure protection (simple UI) → Dashboard generates ModSecurity rules → Node downloads rules → ModSecurity protects your website

---

## 📞 Need Help?

If your node isn't connecting:
1. Check the node software logs
2. Verify Node ID is correct
3. Test connectivity: Can the node reach the dashboard URL?
4. Check firewall rules (node needs to make outbound HTTPS requests)

---

**That's it! You're now an expert on WAF nodes! 🎉**
