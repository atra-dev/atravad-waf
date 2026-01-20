# ATRAVAD Proxy WAF - Quick Start Guide
## Get Protected in 5 Minutes!

---

## 🚀 What is ATRAVAD Proxy WAF?

ATRAVAD WAF is now a **modern reverse proxy WAF** - just like Sucuri and Reblaze!

**How it works**:
1. Point your DNS to ATRAVAD WAF
2. All traffic flows through our protection layer
3. Clean traffic forwarded to your origin server
4. Attacks are blocked automatically

**No code changes needed!** Just change DNS and you're protected.

---

## ⚡ Quick Start (5 Steps)

### Step 1: Create Application

1. Log into ATRAVAD WAF dashboard
2. Go to **"Applications"** page
3. Click **"New Application"**
4. Fill in:
   - **Name**: My Website
   - **Domain**: example.com
   - **Origin URL**: https://origin.example.com
   - **Policy**: Select a security policy (or use default)

### Step 2: Get WAF IP Addresses

1. Go to **"WAF Nodes"** page
2. Note down the **IP addresses** of active nodes
   - Example: `1.2.3.4`, `5.6.7.8`

### Step 3: Update DNS

1. Log into your DNS provider (GoDaddy, Cloudflare, etc.)
2. Update A records for your domain:
   ```
   Type: A
   Name: @ (or example.com)
   Value: 1.2.3.4
   TTL: 300
   ```
3. Add additional A records for redundancy:
   ```
   Type: A
   Name: @
   Value: 5.6.7.8
   TTL: 300
   ```

### Step 4: Wait for DNS Propagation

- Usually takes 5-60 minutes
- Check with: `dig example.com` or `nslookup example.com`
- Verify IPs match your WAF nodes

### Step 5: Test Protection

1. Visit your website: `https://example.com`
2. Should work normally!
3. Test attack blocking:
   ```
   https://example.com/?id=1' OR '1'='1
   ```
   Should return **403 Forbidden**

---

## ✅ You're Protected!

That's it! Your website is now protected by ATRAVAD WAF.

**What happens now**:
- ✅ All traffic flows through WAF
- ✅ Attacks are automatically blocked
- ✅ Clean traffic reaches your origin
- ✅ Real-time monitoring in dashboard

---

## 📊 Monitor Your Protection

### Dashboard Metrics

Go to **"Logs"** page to see:
- Blocked attacks
- Traffic patterns
- Security events
- Performance metrics

### Test Protection

Try these attack patterns (should be blocked):
- SQL Injection: `?id=1' OR '1'='1`
- XSS: `?name=<script>alert(1)</script>`
- Path Traversal: `?file=../../../etc/passwd`

---

## 🔧 Advanced Configuration

### Multiple Origin Servers

Add multiple origins for failover:
```javascript
origins: [
  { url: "https://origin1.example.com", weight: 100 },
  { url: "https://origin2.example.com", weight: 50 }
]
```

### Custom Security Policies

1. Go to **"Policies"** page
2. Create custom policy
3. Assign to application

### SSL Certificates

**Auto SSL (Let's Encrypt)**:
- Enable in application settings
- Certificate auto-provisioned
- Auto-renewal every 90 days

**Manual SSL**:
- Upload certificate in dashboard
- Manage renewal manually

---

## 🐛 Troubleshooting

### DNS not resolving?

- Wait longer (up to 48 hours)
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)
- Verify DNS records are correct

### 502 Bad Gateway?

- Check origin server is accessible
- Verify origin URL is correct
- Check firewall rules

### Requests not being blocked?

- Verify policy is deployed
- Check policy mode is "prevention"
- Review logs in dashboard

---

## 📚 Next Steps

- Read [DNS Setup Guide](./DNS_SETUP_GUIDE.md) for detailed DNS configuration
- Read [Proxy WAF Architecture](./PROXY_WAF_ARCHITECTURE.md) for technical details
- Read [Implementation Guide](./PROXY_WAF_IMPLEMENTATION.md) for deployment

---

## 🎯 Key Benefits

✅ **Seamless**: Just change DNS, no code changes  
✅ **Transparent**: Users don't notice any difference  
✅ **Automatic**: Protection works immediately  
✅ **Real-time**: Monitor all traffic and attacks  
✅ **Scalable**: Handles any traffic volume  
✅ **Modern**: Like Sucuri and Reblaze  

---

**Ready to get protected?** Follow the 5 steps above and you're done! 🚀
