# Deploy ATRAVA Defense EDGE in Your Data Center

Step-by-step instructions to run the WAF proxy server (WAF EDGE) on-premises so customer traffic flows through your data center instead of (or in addition to) AWS.

**Alternative:** For AWS (EC2 or ECS Fargate), see [AWS WAF Deployment](./AWS_WAF_DEPLOYMENT.md).

---

## What You Need Before You Start

| Requirement | Details |
|-------------|---------|
| **Server** | Ubuntu server (recommended: **Ubuntu 22.04 LTS** or newer). Minimum 2 CPU, 2 GB RAM; scale up for traffic. |
| **Network** | A **public IP** assigned to this host (or to a load balancer in front of it) so customers can point DNS to it. |
| **Outbound internet** | Server must reach **Firebase** (Firestore): `firestore.googleapis.com` (and optionally `*.googleapis.com`). |
| **Ports** | **80** (HTTP) and **443** (HTTPS) availableâ€”either on this host or on a reverse proxy in front of it. |
| **Firebase** | Same Firebase project as your Dashboard. You will use a **service account** with Firestore read access. |
| **Node.js** | Version **18+** (LTS recommended). |

---

## Step 1: Prepare the Server

### 1.1 OS and access

- Provision an Ubuntu server in your data center (or use an existing one).
- Ensure you have **sudo** or root access.
- Assign the **public IP** to the server (or to a load balancer that forwards 80/443 to this server).

### 1.4 Secondary Makati edge server

If you are adding a **second standalone WAF EDGE server** in the same Makati data center, treat it as a separate production host with its own runtime, service manager, local firewall rules, and health checks.

For your current rollout:

- **Primary Makati edge IP:** `180.232.117.141`
- **Secondary Makati edge IP:** `115.147.169.195`

Recommended approach:

- Deploy the same codebase to the secondary server.
- Create a separate `.env.waf` on that server.
- Run its own `systemd` service on that server.
- Expose the same public service ports (`80`/`443`, or `8080` behind local Nginx).
- Verify the server can reach Firebase independently.

The WAF proxy does not require a special "secondary" mode. The second edge can run the same application code and read from the same Firebase project as long as network access, credentials, and DNS are configured correctly.

### 1.2 Install Node.js 18+ (Ubuntu)

Recommended for Ubuntu:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # should show v18.x or v20.x
npm -v
```

If you are not on Ubuntu, adapt the package installation for your distro, but the rest of this guide assumes Ubuntu paths and commands.

### 1.3 Open firewall (if you manage it on this host)

Allow HTTP and HTTPS from the internet:

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

If a **load balancer** or **firewall** in front of this server terminates SSL and forwards to this host, open only the ports that the LB uses (e.g. 8080, 8443) and skip binding the Node process to 80/443 on this box (see Step 5).

**Note:** For Letâ€™s Encrypt with Nginx on the same host (Step 6), the WAF will listen on **8080** and Nginx on **80/443** so both can run together.

---

## Step 2: Get Firebase Service Account Credentials

The WAF proxy reads **applications** (and policies) from Firestore. It uses the same Firebase project as your Dashboard.

1. Go to [Firebase Console](https://console.firebase.google.com/) â†’ your project (**atravad-waf**).
2. Click the gear icon â†’ **Project settings** â†’ **Service accounts**.
3. Click **Generate new private key** (or use an existing service account that has **Firestore** access).
4. Save the JSON file securely (e.g. `firebase-service-account.json`). You will use three values from it:
   - `project_id`
   - `client_email`
   - `private_key`

Ensure the service account has at least **Cloud Datastore User** (or **Firestore** read) role so the proxy can read the `applications` and `policies` collections.

---

## Step 3: Deploy the Application Code

### 3.1 Copy the project to the server

Option A â€“ **Clone from your repo** (if the code is in Git):

```bash
cd /opt
sudo git clone https://github.com/your-org/atravad-waf.git
sudo chown -R $USER:$USER atravad-waf
cd atravad-waf
```

Option B â€“ **Copy files** (e.g. via SCP, SFTP, or your deployment tool):

- Copy the whole project (at least `proxy-server-standalone.js`, `src/lib/`, `package.json`, etc.).
- Do **not** copy `.env.local` from your dev machine; you will create a new one on the server with production values.

### 3.2 Install dependencies

```bash
cd /opt/atravad-waf   # or your path
npm install --omit=dev
```

Use `--omit=dev` so dev-only packages (e.g. Next.js dev deps) are not required for the proxy. The proxy only needs the runtime used by `proxy-server-standalone.js` and its imports.

**Env file:** The standalone server automatically loads `.env.waf` or `.env` from the current directory if present. You can override with `--env-file=/path/to/env` or `ATRAVAD_ENV_FILE=/path/to/env`.

---

## Step 4: Configure Environment Variables

Create an environment file that the WAF process will use. **Do not** commit this file to Git.

### 4.1 Create env file

```bash
sudo mkdir -p /opt/atravad-waf
sudo nano /opt/atravad-waf/.env.waf
```

Or use a path like `/etc/atravad-waf/env` if you prefer.

### 4.2 Set Firebase Admin variables

Use the values from your Firebase service account JSON:

```env
# Firebase Admin (required for Firestore)
FIREBASE_PROJECT_ID=atravad-waf
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@atravad-waf.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

- For `FIREBASE_PRIVATE_KEY`: use the full `private_key` string from the JSON, including `\n`. Keep the quotes. If you paste the key with real newlines, replace them with `\n` in the env file.
- `NEXT_PUBLIC_FIREBASE_*` still works as a compatibility fallback, but `FIREBASE_*` is recommended for server-only credentials.

### 4.3 Set WAF proxy options (optional)

```env
# Multi-tenant: leave ATRAVAD_TENANT_NAME unset to serve all tenants and applications.
# Optional: set to a single tenant name, or comma-separated list (max 10), to serve only those tenants.
# ATRAVAD_TENANT_NAME=Acme
# ATRAVAD_TENANT_NAME=Acme,Corp,Other

# Ports: use 8080 when Nginx on this host handles 80/443 (Let's Encrypt); use 80 if WAF is the only listener.
ATRAVAD_HTTP_PORT=8080
# ATRAVAD_HTTPS_PORT=443
```

When using **Nginx + Letâ€™s Encrypt** on the same host (Step 6), set `ATRAVAD_HTTP_PORT=8080` so Nginx can bind to 80 and 443 and proxy to the WAF on 8080. If the WAF runs alone (no Nginx on this host), use `ATRAVAD_HTTP_PORT=80`.

If you are deploying the **secondary Makati server** as a separate host, keep its env file separate from the primary server even if the values are mostly identical.

### 4.4 Secure the env file

```bash
sudo chown root:www-data /opt/atravad-waf/.env.waf
sudo chmod 640 /opt/atravad-waf/.env.waf
sudo mkdir -p /opt/atravad-waf/certs
sudo chown -R www-data:www-data /opt/atravad-waf/certs
sudo find /opt/atravad-waf/certs -type d -exec chmod 750 {} \;
sudo find /opt/atravad-waf/certs -type f -exec chmod 640 {} \;
```

---

## Step 5: Run the WAF Proxy

### 5.1 Test run (foreground)

Load the env and start the server:

```bash
cd /opt/atravad-waf
set -a && source .env.waf && set +a
node proxy-server-standalone.js
```

You should see something like:

```
ATRAVA Defense Standalone Server
====================================
Tenant: (all)
HTTP Port: 80
HTTPS Port: 443

Loaded application: example.com
Loaded 1 application(s)
ATRAVA Defense HTTP server listening on port 80
ATRAVA Defense server started
```

- If Firebase is not configured or unreachable, you may see a warning and no applications loaded; fix the env and network.
- Press **Ctrl+C** to stop.

### 5.2 Run with systemd (recommended for production)

Create a systemd unit so the WAF runs as a service:

```bash
sudo nano /etc/systemd/system/atravad-waf.service
```

Contents (adjust paths and user):

```ini
[Unit]
Description=ATRAVA Defense Proxy Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/atravad-waf
EnvironmentFile=/opt/atravad-waf/.env.waf
ExecStart=/usr/bin/node proxy-server-standalone.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable atravad-waf
sudo systemctl start atravad-waf
sudo systemctl status atravad-waf
```

Useful commands:

```bash
sudo journalctl -u atravad-waf -f
sudo systemctl restart atravad-waf
sudo systemctl stop atravad-waf
```

### 5.3 Optional: PM2

If you need PM2 for a specific operational reason, it can still run this service, but `systemd` is the standard deployment method for this data center guide.

---

## Step 6: SSL/TLS with Letâ€™s Encrypt (auto-provisioning)

Customers connect on **port 443**. Use **Nginx** as a reverse proxy and **Letâ€™s Encrypt (Certbot)** for automatic certificate issuance and renewal.

### 6.1 Prerequisites

- A **hostname** for this WAF (e.g. `waf-dc.yourcompany.com`) whose **DNS A record** already points to this serverâ€™s public IP.
- Port **80** and **443** open and Nginx installed.

### 6.2 Install Nginx and Certbot

**Ubuntu:**

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

If you are not on Ubuntu, install the equivalent `nginx`, `certbot`, and `python3-certbot-nginx` packages for your distro.

### 6.3 Initial Nginx config (HTTP only, for ACME challenge)

Create a minimal HTTP server block so Certbot can complete the ACME challenge:

```bash
sudo nano /etc/nginx/sites-available/atravad-waf
```

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name waf-dc.yourcompany.com;
    server_tokens off;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Use port **8080** so the WAF (listening on 8080) and Nginx (on 80) can run on the same host. Ensure `.env.waf` has `ATRAVAD_HTTP_PORT=8080` (Step 4).

Enable and test:

```bash
sudo ln -sf /etc/nginx/sites-available/atravad-waf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Ensure the **ATRAVA Defense Node process** is already running on port **8080** (Step 5). Nginx listens on 80 for the ACME challenge and proxies traffic to 8080.

Banner hardening note:

- `proxy_hide_header Server;` strips the upstream Node/WAF `Server` header from the proxied response path if you front the WAF with Nginx.
- `server_tokens off;` prevents Nginx from disclosing its full version string.
- If you require a single public `Server: ATRAVA Defense` banner, use the `headers_more` module and explicitly replace the `Server` header at the Nginx layer.

### 6.4 Obtain Letâ€™s Encrypt certificate (auto-provisioning)

Run Certbot with the Nginx plugin so it obtains the cert and updates Nginx for you:

```bash
sudo certbot --nginx -d waf-dc.yourcompany.com
```

- Use your email when prompted (for expiry and security notices).
- Agree to the terms of service.
- Choose whether to redirect HTTP to HTTPS (recommended: **Redirect**).

Certbot will:

1. Obtain the certificate from Letâ€™s Encrypt.
2. Write certs to `/etc/letsencrypt/live/waf-dc.yourcompany.com/`.
3. Update your Nginx config to use these certs and enable HTTPS.

### 6.5 Verify the Nginx config after Certbot

Certbot adds `ssl_certificate` and `ssl_certificate_key` to your server block. You should see something like:

```nginx
server {
    server_name waf-dc.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_hide_header Server;
        proxy_hide_header X-Powered-By;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/waf-dc.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/waf-dc.yourcompany.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name waf-dc.yourcompany.com;
    return 301 https://$host$request_uri;
}
```

Test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 6.6 Auto-renewal (keep SSL provisioned)

Letâ€™s Encrypt certs expire after 90 days. Certbot installs a renewal timer/cron; ensure it runs and reloads Nginx after renewal.

**Test renewal (dry run):**

```bash
sudo certbot renew --dry-run
```

**Ubuntu:** Certbot usually adds a systemd timer. If you use cron instead, add:

```bash
sudo crontab -e
# Add:
0 3 * * * certbot renew --quiet --deploy-hook "systemctl reload nginx"
```

After renewal, Certbot runs the deploy hook (e.g. `systemctl reload nginx`) so Nginx picks up the new certs without downtime.

### 6.7 Summary

| Step | Action |
|------|--------|
| 6.1 | DNS for WAF hostname â†’ this serverâ€™s public IP. |
| 6.2 | Install Nginx and Certbot (with Nginx plugin). |
| 6.3 | Nginx HTTP server block proxying to Node on 80. |
| 6.4 | Run `certbot --nginx -d waf-dc.yourcompany.com` for first-time SSL provisioning. |
| 6.5 | Confirm Nginx uses Letâ€™s Encrypt paths; reload Nginx. |
| 6.6 | Ensure `certbot renew` runs (timer/cron) and reloads Nginx (auto-renewal). |

The Node WAF process listens on **8080**; Nginx listens on **80** and **443**, terminates SSL with Letâ€™s Encrypt certs, and forwards to the WAF on 8080.

---

## Step 7: Point DNS and Update the Dashboard

### 7.1 Decide the public address

- **Option 1:** Use the data center serverâ€™s **public IP** (e.g. `203.0.113.10`).
- **Option 2:** Create a **hostname** (e.g. `waf-dc.yourcompany.com`) that resolves to that IP, and give customers the hostname (CNAME) or the IP.

### 7.2 Update Dashboard WAF_REGIONS

So that the Dashboard shows customers the correct â€œpoint DNS hereâ€ value:

1. On the **machine where the Dashboard runs** (or in your Dashboardâ€™s deployment config), open the environment (e.g. `.env.local` or your hosting env).
2. Set **WAF_REGIONS** to include your data center endpoint, e.g.:

Single-edge example:

```env
WAF_REGIONS=[{"id":"datacenter","name":"Data Center","ip":"203.0.113.10","cname":"waf-dc.yourcompany.com","continents":["NA","SA","EU","AF","AS","OC"]}]
WAF_DEFAULT_REGION=datacenter
```

Makati dual-edge example for your current deployment:

```env
WAF_REGIONS=[{"id":"dcmakati","name":"Data Center Makati","ip":"180.232.117.141","ips":["180.232.117.141","115.147.169.195"],"cname":"waf.cisoasaservice.io","continents":["NA","SA","EU","AF","AS","OC","AN"]}]
WAF_DEFAULT_REGION=dcmakati
```

Use your real **public IP** and **cname** (or the same value as IP if you only use an A record). Restart or redeploy the Dashboard so it picks up the new env.

Notes for the Makati dual-edge model:

- `ip` remains the primary display IP for backward compatibility.
- `ips` lists **all public edge IPs** customers may need to point to.
- Use the same `id` for both Makati edge servers if they represent one logical WAF region.
- The Dashboard and app setup flow should display both edge IPs when the repo changes for multi-IP support are present.

### 7.3 Customer DNS

Customers point their domainâ€™s **A record** (or **CNAME**) to the IP (or hostname) you configured in `WAF_REGIONS`. No change to the WAF proxy code is required for this.

For the Makati dual-edge deployment, give customers:

- either the shared hostname (recommended) if it resolves to both edge IPs
- or both A records: `180.232.117.141` and `115.147.169.195`

If you use direct A records, instruct customers to publish **one A record per edge IP**.

### 7.4 One CNAME with two A records

Your shared WAF hostname can stay:

- `waf.cisoasaservice.io`

That hostname can validly publish **two A records**:

```dns
waf.cisoasaservice.io.  A  180.232.117.141
waf.cisoasaservice.io.  A  115.147.169.195
```

This means:

- customers using a **subdomain** can point a **CNAME** to `waf.cisoasaservice.io`
- DNS resolution for that hostname returns both WAF edge IPs
- both edge servers must be ready to serve the same protected applications

Example for a customer subdomain:

```dns
www.customer.com.  CNAME  waf.cisoasaservice.io.
```

Example for a customer apex/root domain where CNAME is not allowed:

```dns
customer.com.  A  180.232.117.141
customer.com.  A  115.147.169.195
```

Operational notes:

- Keep the same TLS certificate coverage on both edge servers for customer domains handled there.
- Keep both servers on the same deployed repo version when possible.
- Keep origin allowlists updated for both edge IPs.
- Lower DNS TTL during migration if you want faster rollback or cutover.
- Add a WAF-to-origin secret verification header for defense in depth if the origin IP is ever discovered.

---

## Step 7.5: Add Origin Verification Header

IP allowlists are the first control. Add a second control by requiring a private header from the WAF to the customer origin.

Recommended pattern:

- Configure the protected application origin in ATRAVA Defense with an auth header such as `X-ATRAVA-Origin-Verify`.
- Use a long random secret value that is unique per protected site.
- On the customer origin, reject any request that does not include the expected header value.

Example Nginx enforcement on the customer origin:

```nginx
location / {
    allow 180.232.117.141;
    allow 115.147.169.195;
    deny all;

    if ($http_x_atrava_origin_verify != "REPLACE_WITH_LONG_RANDOM_SECRET") {
        return 403;
    }

    proxy_pass http://127.0.0.1:YOUR_APP_PORT;
}
```

This prevents direct-origin access from succeeding even if the origin IP becomes known and a firewall rule is misconfigured.

---

## Step 8: Verify and Monitor

### 8.1 Health check

- From a machine that can reach the data center WAF:
  - **Health endpoint:** `curl -v http://YOUR_WAF_IP/health` or `http://YOUR_WAF_IP/_atravad/health` â€” returns `200` and JSON with `status`, `tenant`, `applications`. Use for load balancers and orchestration.
  - `curl -v http://YOUR_WAF_IP/`  
  - If no application is configured for that Host, you may get â€œApplication not found for domain: â€¦â€. That is expected; it means the proxy is listening and resolving by Host.
- Create an **application** in the Dashboard (domain + origin) and point a test hostname to the WAF IP; then request that hostname and confirm the origin responds.

For a **secondary Makati edge**, run the same checks against `115.147.169.195` and verify both servers can:

- return healthy responses
- load the same applications from Firestore
- proxy traffic to the same protected origin set
- emit logs as expected

### 8.2 Logs

- **systemd:** `journalctl -u atravad-waf -f`
- Watch for â€œLoaded application: â€¦â€, â€œApplication updated: â€¦â€, and any Firebase or ModSecurity errors.

### 8.3 Firestore

Confirm the proxy can read Firestore: in Firebase Console â†’ Firestore, check that the `applications` (and optionally `policies`) collections exist and that the service account has read access.

---

## Checklist Summary

| Step | Action |
|------|--------|
| 1 | Server with Node 18+, public IP (or LB), outbound to Firebase, ports 80/443 (or LB ports). |
| 2 | Firebase service account JSON; note `project_id`, `client_email`, `private_key`. |
| 3 | Deploy repo/code; `npm install --omit=dev`. |
| 4 | Create `.env.waf` with Firebase Admin vars and optional `ATRAVAD_*` ports/tenant. |
| 5 | Run with `node proxy-server-standalone.js` (test), then install as a `systemd` service. |
| 6 | Install Nginx + Certbot; run `certbot --nginx -d waf-dc.yourcompany.com` for Letâ€™s Encrypt auto-provisioning; enable renewal. |
| 7 | Set Dashboard `WAF_REGIONS` to your DC IP/cname; customers point DNS to that. |
| 8 | Verify with curl and a test application; monitor logs and Firestore access. |

For the Makati dual-edge deployment, also confirm:

- the second server at `115.147.169.195` is deployed with the same repo version
- both edge IPs are present in `WAF_REGIONS` under the same logical region
- customer origin firewalls allow **both** WAF edge IPs
- DNS uses either a shared hostname or two A records

---

## Optional: ModSecurity Native Build

The proxy can use a **fallback** (pattern-based) inspection if the `modsecurity` native addon is not installed. For full ModSecurity (OWASP CRS, etc.) you need the native bindings and libmodsecurity on the server. That may require:

- Installing **libmodsecurity** (and dependencies) from your distro or source.
- Ensuring the **modsecurity** npm package (native addon) builds: `npm install` (or `npm rebuild modsecurity`) on the data center server.

If the native module fails to build, the server will still run with the built-in fallback inspection.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| â€œFirebase Admin environment variables not setâ€ | `.env.waf` path, `EnvironmentFile` in systemd, and file permissions (service user can read it); correct `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`. |
| â€œApplication not found for domainâ€ | Firestore has an application whose `domain` matches the request `Host`; proxy has loaded apps (see logs). |
| No applications loaded | Firebase credentials and network (outbound to `firestore.googleapis.com`); Firestore rules allow the service account to read `applications`. |
| `CertStore: failed to load from disk ... EACCES` | Ensure `/opt/atravad-waf/certs` and files are owned/readable by the service user (example above uses `www-data`). |
| Cannot bind to port 80/443 | Run with sudo, or use a higher port and reverse proxy; check firewall. |
| 502 Bad Gateway to origin | Origin URL in Dashboard is correct and reachable from the WAF server; check health checks in logs. |

If the second Makati edge works on one IP but not the other, also check:

- the `/29` address is correctly assigned to the secondary host
- upstream routing/NAT for `115.147.169.195` is complete
- data center firewall rules permit inbound `80/443` and outbound Firebase traffic from that host
- customer origin allowlists include both `180.232.117.141` and `115.147.169.195`

For more on architecture and traffic flow, see [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md).

