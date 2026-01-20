# ATRAVAD Proxy WAF - Testing Guide
## Step-by-Step Guide to Test the Proxy WAF

---

## 🎯 Prerequisites

Before testing, ensure you have:

1. ✅ **Dashboard Running**
   - Next.js app running on `http://localhost:3000`
   - Firebase configured and connected
   - Admin access to create applications

2. ✅ **Node.js 18+** installed
3. ✅ **Firebase Admin SDK** configured
4. ✅ **Test Origin Server** (optional but recommended)

---

## 📋 Testing Checklist

### Phase 1: Setup & Configuration

- [ ] **1.1: Start Dashboard**
  ```bash
  cd atravad-waf
  npm run dev
  ```
  - Verify dashboard loads at `http://localhost:3000`
  - Login with admin account

- [ ] **1.2: Create Test Application**
  1. Go to `/apps` page
  2. Click "New Application"
  3. Fill in:
     - **Name**: "Test App"
     - **Domain**: `test.local` (or your test domain)
     - **Origin URL**: `http://localhost:8080` (or your test origin)
     - **Policy**: Select a policy (or create one)
  4. Save application

- [ ] **1.3: Register Test Node**
  1. Go to `/nodes` page
  2. Click "Register Node"
  3. Fill in:
     - **Name**: "Test Node"
     - **IP Address**: `127.0.0.1` (localhost for testing)
  4. **SAVE CREDENTIALS** (Node ID and API Key shown in modal)

- [ ] **1.4: Verify Node Credentials**
  - Note down:
    - Node ID: `node-xxxxx`
    - API Key: `atravad_xxxxx`

---

### Phase 2: Start Proxy Server

- [ ] **2.1: Set Environment Variables**
  ```bash
  export ATRAVAD_NODE_ID=node-xxxxx
  export ATRAVAD_API_KEY=atravad_xxxxx
  export ATRAVAD_DASHBOARD_URL=http://localhost:3000
  export ATRAVAD_HTTP_PORT=8080
  export ATRAVAD_HTTPS_PORT=8443
  ```

- [ ] **2.2: Start Proxy Server**
  ```bash
  node proxy-server-standalone.js
  ```

- [ ] **2.3: Verify Server Started**
  - Should see:
    ```
    ATRAVAD Proxy WAF Standalone Server
    ====================================
    Node ID: node-xxxxx
    Dashboard URL: http://localhost:3000
    HTTP Port: 8080
    HTTPS Port: 8443
    
    Loading applications...
    Applications loaded: 1
    Starting HTTP server on port 8080...
    HTTP server started
    ```
  - If errors, check:
    - Firebase credentials
    - Node ID and API Key are correct
    - Ports are available

- [ ] **2.4: Verify Node Status in Dashboard**
  1. Go to `/nodes` page
  2. Check if node shows "Online" status
  3. Check "Last Seen" timestamp (should be recent)

---

### Phase 3: Test Basic Proxy Functionality

- [ ] **3.1: Setup Test Origin Server** (Optional)
  
  Create a simple test server:
  ```bash
  # Simple Node.js test server
  node -e "require('http').createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello from origin server!');
  }).listen(8081, () => console.log('Origin server on port 8081'));"
  ```

  Or use Python:
  ```bash
  python3 -m http.server 8081
  ```

- [ ] **3.2: Update Application Origin**
  1. Go to `/apps` page
  2. Edit your test application
  3. Set origin to: `http://localhost:8081`
  4. Save

- [ ] **3.3: Test Proxy Forwarding**
  ```bash
  # Test request through proxy
  curl -H "Host: test.local" http://localhost:8080/
  ```
  
  **Expected**: Should forward to origin and return response

- [ ] **3.4: Verify Headers**
  ```bash
  curl -v -H "Host: test.local" http://localhost:8080/
  ```
  
  **Check for**:
  - `X-Forwarded-For` header
  - `X-Forwarded-Proto` header
  - `X-Forwarded-Host` header

---

### Phase 4: Test ModSecurity Protection

- [ ] **4.1: Test SQL Injection Blocking**
  ```bash
  # This should be blocked (403)
  curl -H "Host: test.local" "http://localhost:8080/?id=1' OR '1'='1"
  ```
  
  **Expected**: 
  - Status: `403 Forbidden`
  - Response: `{"error": "Request blocked by WAF", ...}`

- [ ] **4.2: Test Normal Request**
  ```bash
  # This should pass through
  curl -H "Host: test.local" "http://localhost:8080/?page=home"
  ```
  
  **Expected**: 
  - Status: `200 OK`
  - Response from origin server

- [ ] **4.3: Test XSS Attempt**
  ```bash
  # This should be blocked
  curl -H "Host: test.local" "http://localhost:8080/?q=<script>alert(1)</script>"
  ```

- [ ] **4.4: Test Suspicious User-Agent**
  ```bash
  # This should be flagged
  curl -H "Host: test.local" -H "User-Agent: sqlmap" http://localhost:8080/
  ```

---

### Phase 5: Test Application Configuration

- [ ] **5.1: Test Multiple Applications**
  1. Create second application:
     - Domain: `test2.local`
     - Origin: `http://localhost:8082`
  2. Start second origin server on port 8082
  3. Test:
     ```bash
     curl -H "Host: test.local" http://localhost:8080/
     curl -H "Host: test2.local" http://localhost:8080/
     ```
  4. **Expected**: Each domain routes to correct origin

- [ ] **5.2: Test Policy Assignment**
  1. Create a policy with strict rules
  2. Assign to application
  3. Test attack request
  4. **Expected**: Should be blocked

- [ ] **5.3: Test Real-time Config Updates**
  1. Update application origin in dashboard
  2. Wait 30-60 seconds (polling interval)
  3. Test request
  4. **Expected**: Should use new origin

---

### Phase 6: Test Health Checks

- [ ] **6.1: Test Healthy Origin**
  1. Ensure origin server is running
  2. Check proxy logs for health check requests
  3. **Expected**: Health checks succeed

- [ ] **6.2: Test Unhealthy Origin**
  1. Stop origin server
  2. Wait for health check interval (30 seconds)
  3. Send request through proxy
  4. **Expected**: 
     - Health check fails
     - Request returns 503 or error
     - Logs show origin is unhealthy

- [ ] **6.3: Test Multiple Origins**
  1. Add second origin to application
  2. Stop first origin
  3. Send request
  4. **Expected**: Should failover to second origin

---

### Phase 7: Test Error Handling

- [ ] **7.1: Test Unknown Domain**
  ```bash
  curl -H "Host: unknown.local" http://localhost:8080/
  ```
  
  **Expected**: `404 Application not found`

- [ ] **7.2: Test Missing Origin**
  1. Remove origin from application
  2. Send request
  3. **Expected**: `503 No origin server configured`

- [ ] **7.3: Test Origin Connection Error**
  1. Set origin to invalid URL
  2. Send request
  3. **Expected**: Error handling, proper error response

---

## 🔧 Troubleshooting

### Issue: Proxy Server Won't Start

**Check:**
1. Node ID and API Key are correct
2. Dashboard is running and accessible
3. Firebase credentials are configured
4. Ports are not in use:
   ```bash
   # Check if port is in use
   lsof -i :8080
   # Or on Windows:
   netstat -ano | findstr :8080
   ```

### Issue: Node Shows Offline

**Check:**
1. Proxy server is running
2. Node ID and API Key match
3. Dashboard URL is correct
4. Network connectivity to dashboard
5. Check proxy server logs for errors

### Issue: Requests Not Forwarding

**Check:**
1. Application domain matches `Host` header
2. Origin URL is correct and accessible
3. Origin server is running
4. Check proxy server logs:
   ```bash
   # Look for request logs
   # Should see: "Handling request for domain: test.local"
   ```

### Issue: ModSecurity Not Blocking

**Check:**
1. Policy is assigned to application
2. Policy has ModSecurity config
3. Check proxy server logs for inspection results
4. Current implementation uses basic pattern matching
   - SQL injection patterns: `SELECT`, `UNION`, `'`, `;`
   - Suspicious user agents: `sqlmap`, `nikto`, `nmap`

---

## 📊 Testing Scenarios

### Scenario 1: Basic Proxy Flow
```
1. Create application (domain: test.local, origin: http://localhost:8081)
2. Register node
3. Start proxy server
4. Send request: curl -H "Host: test.local" http://localhost:8080/
5. Verify: Request forwarded to origin, response returned
```

### Scenario 2: Attack Blocking
```
1. Create application with policy
2. Start proxy server
3. Send attack: curl -H "Host: test.local" "http://localhost:8080/?id=1' OR '1'='1"
4. Verify: Request blocked (403), attack logged
```

### Scenario 3: Multiple Domains
```
1. Create 2 applications (test.local, test2.local)
2. Start proxy server
3. Send requests to both domains
4. Verify: Each routes to correct origin
```

### Scenario 4: Health Check Failover
```
1. Create application with 2 origins
2. Start both origin servers
3. Stop first origin
4. Send request
5. Verify: Fails over to second origin
```

---

## ✅ Success Criteria

The proxy WAF is working correctly if:

1. ✅ **Proxy Server Starts**
   - No errors on startup
   - Applications loaded successfully
   - Server listening on configured ports

2. ✅ **Node Shows Online**
   - Dashboard shows node as "Online"
   - Last seen timestamp updates

3. ✅ **Requests Forward Correctly**
   - Normal requests reach origin
   - Response returned to client
   - Headers forwarded correctly

4. ✅ **Attacks Are Blocked**
   - SQL injection attempts blocked (403)
   - XSS attempts blocked
   - Suspicious patterns detected

5. ✅ **Health Checks Work**
   - Healthy origins detected
   - Unhealthy origins marked
   - Failover works

6. ✅ **Config Updates Work**
   - Application changes reflected
   - New applications appear
   - Policy changes applied

---

## 🚀 Next Steps After Testing

Once basic testing passes:

1. **Improve ModSecurity Integration**
   - Integrate full ModSecurity v3
   - Add more rule patterns
   - Implement response inspection

2. **Add SSL/TLS Support**
   - Implement HTTPS server
   - Add certificate management
   - Test SSL termination

3. **Performance Testing**
   - Load testing
   - Stress testing
   - Latency measurement

4. **Production Deployment**
   - Systemd service setup
   - Monitoring integration
   - Log aggregation

---

## 📝 Testing Notes

- **Current ModSecurity**: Uses basic pattern matching (not full ModSecurity v3)
- **Ports**: Use non-standard ports (8080, 8443) for testing to avoid conflicts
- **Domains**: Use `.local` domains or `/etc/hosts` entries for local testing
- **Logs**: Check console output for detailed request/response logs

---

**Status**: Ready for testing ✅
