# DNS Setup Guide for ATRAVA Defense
## Seamless Traffic Routing - Just Change Your DNS!

---

## ðŸŽ¯ Overview

ATRAVA Defense works as a **reverse proxy** - all you need to do is point your domain's DNS to our WAF servers, and all traffic will automatically flow through our protection layer before reaching your origin servers.

**It's that simple!** Just like Sucuri and Reblaze.

---

## ðŸ“‹ Prerequisites

1. âœ… **ATRAVA Defense Account** - You have an account and dashboard access
2. âœ… **Application Created** - You've created an application (site) in the dashboard
3. âœ… **Origin Server Configured** - Your origin server URL is set in the application settings
4. âœ… **ATRAVA Defense IP or CNAME** - Shown when you add a site (like Sucuri: we give you our WAF address to point DNS to)

**Like Sucuri:** You do **not** deploy any server or "node." Add your site in the dashboard, then point your domain's A or CNAME to the **ATRAVA Defense IP or CNAME** we show you.

---

## ðŸš€ Step-by-Step DNS Configuration

### Step 1: Get the ATRAVA Defense IP or CNAME

1. Log into your ATRAVA Defense dashboard
2. Go to **Applications** (or **Sites**)
3. Add your site (domain, origin, policy) or open an existing one
4. At the top of the Applications page you'll see **"Point A record â†’ X.X.X.X"** or **"Point CNAME â†’ waf.atravad.com"** â€” that is the **ATRAVA Defense** address (our edge). Use that when configuring DNS.

**Important:** This is **ATRAVAD's** WAF IP or CNAME â€” the same for all customers. You point your domain to it; no server or node to deploy on your side.

---

### Step 2: Configure Your DNS Records

#### Option A: A Records (Recommended for Root Domain)

If you want to protect `example.com` (root domain):

1. Log into your DNS provider (GoDaddy, Cloudflare, Route53, etc.)
2. Find your DNS management section
3. **Delete or update** existing A records for `example.com`
4. **Create a new A record** pointing to the **ATRAVA Defense IP** (the IP shown in the dashboard when you add a site):

   ```
   Type: A
   Name: @ (or example.com)
   Value: [ATRAVA Defense IP from dashboard, e.g. 1.2.3.4]
   TTL: 300 (5 minutes - for faster propagation)
   ```

5. If your administrator provided multiple ATRAVA Defense IPs, add A records for each for redundancy.

#### Option B: CNAME Records (Recommended for Subdomains)

If you want to protect `www.example.com` or `api.example.com`:

1. Log into your DNS provider
2. **Create or update** CNAME record:

   ```
   Type: CNAME
   Name: www (or api, app, etc.)
   Value: waf.atravad.com (or your WAF hostname)
   TTL: 300
   ```

   **Note**: The ATRAVA Defense CNAME (e.g. `waf.atravad.com`) is shown in the Applications page when you add a site.

#### Option C: ALIAS/ANAME Records (For Root Domain with CNAME-like behavior)

Some DNS providers (like Cloudflare, DNSimple) support ALIAS records:

```
Type: ALIAS
Name: @
Value: waf.atravad.com
TTL: 300
```

---

### Step 3: Verify DNS Propagation

After updating DNS, wait for propagation (usually 5-60 minutes):

1. **Check DNS propagation** using online tools:
   - [whatsmydns.net](https://www.whatsmydns.net)
   - [dnschecker.org](https://dnschecker.org)

2. **Test locally**:
   ```bash
   # Linux/Mac
   dig example.com
   nslookup example.com
   
   # Windows
   nslookup example.com
   ```

3. **Verify** the domain resolves to the ATRAVA Defense IP (or the CNAME resolves to our edge)

---

### Step 4: Test Your Setup

Once DNS has propagated:

1. **Visit your website**: `https://example.com`
2. **Check response headers** - Confirm the response does not expose `X-WAF`, `X-Firewall`, `X-ATRAVAD-WAF`, or a WAF-added `Server` header

3. **Test protection** - Try accessing:
   ```
   https://example.com/?id=1' OR '1'='1
   ```
   This should be blocked by the WAF (403 Forbidden)

4. **Check dashboard** - Go to **"Logs"** page to see traffic and blocked requests

---

## ðŸ”’ SSL/TLS Configuration

### Automatic SSL (Let's Encrypt)

ATRAVA Defense automatically provisions SSL certificates via Let's Encrypt:

1. **Enable in dashboard**:
   - Go to your application settings
   - Enable "Auto SSL" or "Let's Encrypt"
   - Enter your email for certificate notifications

2. **Wait for provisioning** (usually 5-10 minutes)

3. **Verify SSL**:
   - Visit `https://example.com`
   - Check SSL certificate in browser
   - Certificate should show "Let's Encrypt" as issuer

### Manual SSL Certificate

If you prefer to use your own certificate:

1. **Upload certificate** in dashboard:
   - Go to application settings
   - Upload SSL certificate (`.crt` or `.pem`)
   - Upload private key (`.key`)
   - Upload certificate chain if needed

2. **Save configuration**

3. **Test SSL**:
   ```bash
   openssl s_client -connect example.com:443 -servername example.com
   ```

---

## ðŸŒ Multiple Domains / Subdomains

### Protecting Multiple Domains

1. **Create separate applications** in dashboard for each domain:
   - `example.com`
   - `api.example.com`
   - `app.example.com`

2. **Configure DNS** for each:
   - `example.com` â†’ A records to WAF IPs
   - `api.example.com` â†’ CNAME to WAF hostname
   - `app.example.com` â†’ CNAME to WAF hostname

3. **Each domain** can have:
   - Different origin servers
   - Different security policies
   - Different SSL certificates

---

## ðŸ”„ Traffic Flow After DNS Change

### Before (Direct to Origin)
```
User â†’ DNS â†’ Origin Server (1.2.3.4)
```

### After (Through ATRAVA Defense)
```
User â†’ DNS â†’ ATRAVA Defense (5.6.7.8) â†’ Origin Server (1.2.3.4)
                â†“
        ModSecurity Inspection
        Rate Limiting
        Bot Detection
        DDoS Protection
```

---

## âš ï¸ Important Notes

### 1. DNS Propagation Time
- **Typical**: 5-60 minutes
- **Maximum**: Up to 48 hours (rare)
- **Tip**: Lower TTL before making changes for faster updates

### 2. Origin Server Access
- **Keep origin accessible**: Your origin server should still be accessible (for testing)
- **Firewall rules**: Ensure ATRAVA Defense edge can reach your origin servers
- **IP whitelisting**: If your origin has IP restrictions, whitelist the ATRAVA Defense IP(s) provided by your administrator

### 3. SSL Certificates
- **Let's Encrypt**: Automatically renews every 90 days
- **Manual certificates**: You're responsible for renewal
- **Mixed content**: Ensure all resources use HTTPS

### 4. Testing
- **Test before going live**: Use a subdomain first
- **Monitor logs**: Check dashboard for any issues
- **Gradual rollout**: Consider using weighted DNS for gradual migration

---

## ðŸ› Troubleshooting

### Issue: DNS not resolving to ATRAVA Defense

**Solutions**:
1. Wait longer for propagation (up to 48 hours)
2. Clear DNS cache:
   ```bash
   # Linux/Mac
   sudo dscacheutil -flushcache
   sudo killall -HUP mDNSResponder
   
   # Windows
   ipconfig /flushdns
   ```
3. Check DNS records are correct
4. Verify TTL settings

### Issue: SSL certificate errors

**Solutions**:
1. Wait for Let's Encrypt provisioning (5-10 minutes)
2. Check certificate is uploaded correctly (manual SSL)
3. Verify domain ownership
4. Check certificate expiration

### Issue: 502 Bad Gateway

**Solutions**:
1. Check origin server is accessible from the ATRAVA Defense edge
2. Verify origin URL is correct in dashboard
3. Check firewall rules on your origin
4. Verify health checks (if configured) are passing

### Issue: Requests not being blocked

**Solutions**:
1. Verify a security policy is assigned to the application
2. Check policy mode is "prevention" not "detection"
3. Review logs in dashboard
4. Test with known attack patterns

---

## ðŸ“Š Monitoring After DNS Change

### Dashboard Metrics

After DNS change, monitor:

1. **Traffic Volume**:
   - Requests per minute
   - Bandwidth usage
   - Response times

2. **Security Events**:
   - Blocked requests
   - Attack types detected
   - Top attacking IPs

3. **Origin Health**:
   - Health check status
   - Response times
   - Error rates

4. **Performance**:
   - Average response time
   - P95/P99 latency
   - Cache hit rates

---

## ðŸŽ“ Example: Complete Setup

### Scenario: Protect `example.com`

1. **Dashboard Setup**:
   ```
   Application Name: My Website
   Domain: example.com
   Origin: https://origin.example.com
   Policy: Production Security Policy
   ```

2. **DNS Configuration** (at DNS provider): Point your domain to the ATRAVA Defense IP or CNAME shown in the dashboard when you add the site:
   ```
   A Record: @ â†’ [ATRAVA Defense IP from dashboard]
   or
   CNAME: @ or www â†’ waf.atravad.com (or CNAME provided in dashboard)
   ```

3. **Wait for propagation** (check with `dig example.com`)

4. **Test**:
   ```bash
   curl -I https://example.com
   # Should not see X-WAF, X-Firewall, X-ATRAVAD-WAF, or a WAF-added Server header
   ```

5. **Verify protection**:
   ```bash
   curl "https://example.com/?id=1' OR '1'='1"
   # Should return 403 Forbidden
   ```

---

## âœ… Checklist

Before going live:

- [ ] Application created in dashboard
- [ ] Origin server URL configured
- [ ] Security policy assigned
- [ ] DNS records updated
- [ ] DNS propagation verified
- [ ] SSL certificate provisioned (or uploaded)
- [ ] Origin server accessible from ATRAVA Defense edge
- [ ] Health checks passing
- [ ] Test requests working
- [ ] Attack protection verified
- [ ] Monitoring dashboard configured
- [ ] Alerts configured (optional)

---

## ðŸš€ You're Done!

Once DNS propagates, **all traffic automatically flows through ATRAVA Defense**:

- âœ… **Automatic protection** - No code changes needed
- âœ… **Transparent proxying** - Users don't notice any difference
- âœ… **Real-time monitoring** - See all traffic and attacks in dashboard
- âœ… **Easy management** - Update policies without touching DNS

**That's it! Your website is now protected by ATRAVA Defense!** ðŸŽ‰

---

## ðŸ“ž Need Help?

- **Dashboard**: Check application settings and logs
- **Documentation**: See other guides in `/docs`
- **Support**: Contact support team

---

**Remember**: The beauty of proxy WAF is that it's **completely transparent**. Just change DNS, and you're protected!

