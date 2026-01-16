# Quick Start Testing Guide
## Get the Proxy WAF Running in 5 Minutes

---

## 🚀 Quick Start Steps

### 1. Start Dashboard (Terminal 1)
```bash
cd atravad-waf
npm run dev
```
✅ Dashboard should be running at `http://localhost:3000`

---

### 2. Create Test Application

1. Open `http://localhost:3000/apps`
2. Click **"New Application"**
3. Fill in:
   - **Name**: `Test App`
   - **Domain**: `test.local`
   - **Origin URL**: `http://localhost:8081`
   - **Policy**: Select any policy (or create one)
4. Click **"Create Application"**

---

### 3. Register Node

1. Open `http://localhost:3000/nodes`
2. Click **"Register Node"**
3. Fill in:
   - **Name**: `Test Node`
   - **IP Address**: `127.0.0.1`
4. Click **"Register Node"**
5. **COPY THE CREDENTIALS** (shown in modal):
   - Node ID: `node-xxxxx`
   - API Key: `atravad_xxxxx`

---

### 4. Start Test Origin Server (Terminal 2)
```bash
# Simple test server
node -e "require('http').createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello from origin! Request: ' + req.url);
}).listen(8081, () => console.log('Origin server on http://localhost:8081'));"
```

---

### 5. Start Proxy Server (Terminal 3)
```bash
# Set credentials (replace with your actual values)
export ATRAVAD_NODE_ID=node-xxxxx
export ATRAVAD_API_KEY=atravad_xxxxx
export ATRAVAD_DASHBOARD_URL=http://localhost:3000
export ATRAVAD_HTTP_PORT=8080

# Start proxy
node proxy-server-standalone.js
```

✅ Should see:
```
ATRAVAD Proxy WAF Standalone Server
====================================
Node ID: node-xxxxx
Dashboard URL: http://localhost:3000
HTTP Port: 8080
Loading applications...
Loaded application: test.local
Starting HTTP server on port 8080...
ATRAVAD Proxy WAF HTTP server listening on port 8080
```

---

### 6. Test It! (Terminal 4)
```bash
# Test normal request (should work)
curl -H "Host: test.local" http://localhost:8080/

# Test SQL injection (should be blocked)
curl -H "Host: test.local" "http://localhost:8080/?id=1' OR '1'='1"
```

---

## ✅ Expected Results

### Normal Request
```bash
$ curl -H "Host: test.local" http://localhost:8080/
Hello from origin! Request: /
```
✅ **Status**: 200 OK  
✅ **Response**: From origin server

### Attack Request
```bash
$ curl -H "Host: test.local" "http://localhost:8080/?id=1' OR '1'='1"
{"error":"Request blocked by WAF","reason":"SQL Injection pattern detected in query string",...}
```
✅ **Status**: 403 Forbidden  
✅ **Response**: Blocked by WAF

---

## 🔧 Troubleshooting

### Proxy Server Won't Start
- ✅ Check Node ID and API Key are correct
- ✅ Check dashboard is running
- ✅ Check Firebase is configured
- ✅ Check port 8080 is available

### Node Shows Offline
- ✅ Check proxy server is running
- ✅ Check credentials match
- ✅ Wait 30-60 seconds for heartbeat

### Requests Not Working
- ✅ Check application domain matches `Host` header
- ✅ Check origin server is running on port 8081
- ✅ Check proxy server logs for errors

---

## 📝 Next Steps

Once basic testing works:

1. **Test Multiple Applications**
   - Create second app with different domain
   - Test domain routing

2. **Test Health Checks**
   - Stop origin server
   - Check failover behavior

3. **Test Real-time Updates**
   - Update application in dashboard
   - Verify proxy picks up changes

4. **Improve ModSecurity**
   - Add more attack patterns
   - Integrate full ModSecurity v3

---

**Ready to test!** 🚀
