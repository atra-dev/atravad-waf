# Deploy ATRAVA Defense Web GUI with Nginx

This guide is for deploying the **Web GUI** on its own server behind **Nginx**, while the **WAF edge server** runs separately on another machine.

That deployment model is valid for this project.

## Deployment Model

Recommended split:

- **Server 1:** ATRAVA Defense Web GUI (`next build` + `next start`)
- **Server 2:** ATRAVA Defense WAF edge (`proxy-server-standalone.js`)

The Web GUI does not need to run on the same server as the WAF edge.

The Web GUI needs:

- outbound access to Firebase/Auth/Firestore
- its own Node.js runtime
- Nginx in front of it
- correct `WAF_REGIONS` so the dashboard shows the already-deployed edge IP/CNAME

The WAF edge server needs:

- access to Firestore
- public reachability for protected customer traffic
- its own runtime and env file

## Port Exposure

If the Web GUI must be available on both `80` and `443`, the recommended setup is:

- `nginx` listens publicly on `80` and `443`
- `80` redirects to `443`
- the Next.js Web GUI runs privately on `127.0.0.1:3000`

This is the correct production setup for this app. The Node process does not need to bind directly to `80` or `443`.

## Important Security Fix Before Production

Do not deploy the Web GUI with Firebase Admin credentials stored in `NEXT_PUBLIC_*` variables.

For production, use:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Keep `NEXT_PUBLIC_FIREBASE_*` only for client-safe Firebase web config such as:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Do **not** put admin private keys in `NEXT_PUBLIC_` variables.

## 1. Prepare the Web GUI Server

Example target:

- Ubuntu 22.04+
- Node.js 20 LTS
- Nginx
- optional lightweight GUI: Xfce

If you want a lightweight GUI on the Ubuntu server for occasional local administration, install a complete lightweight desktop session first:

```bash
sudo apt update
sudo apt install -y xubuntu-core lightdm dbus-x11 xterm
```

If prompted, choose `lightdm` as the default display manager.

`xubuntu-core` is preferred here over installing only `xfce4` on a minimal server because it brings in the session components that reduce `Failed to start session` login errors.

Install runtime packages:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
node -v
npm -v
nginx -v
```

Exact Ubuntu install sequence:

```bash
sudo apt update
sudo apt install -y curl gnupg2 ca-certificates lsb-release ubuntu-keyring
sudo apt install -y xubuntu-core lightdm dbus-x11 xterm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y git nodejs nginx certbot python3-certbot-nginx
node -v
npm -v
nginx -v
```

## 2. Copy the Project

Example path:

```bash
sudo mkdir -p /var/www/atravad-waf
sudo chown -R $USER:$USER /var/www/atravad-waf
```

Clone the repository from GitHub, then install dependencies:

```bash
git clone https://github.com/atra-dev/atravad-waf.git /var/www/atravad-waf
cd /var/www/atravad-waf
npm install
```

Exact Ubuntu commands:

```bash
sudo mkdir -p /var/www/atravad-waf
sudo chown -R $USER:$USER /var/www/atravad-waf
git clone https://github.com/atra-dev/atravad-waf.git /var/www/atravad-waf
cd /var/www/atravad-waf
npm install
```

## 3. Create the Production Env File

Create a production env file on the Web GUI server:

```bash
nano /var/www/atravad-waf/.env.production
```

Example:

```env
NODE_ENV=production
PORT=3000

NEXT_PUBLIC_FIREBASE_API_KEY=your_web_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

WAF_REGIONS=[{"id":"dcmakati","name":"Data Center Makati","ip":"180.232.117.141","cname":"waf.cisoasaservice.io","continents":["NA","SA","EU","AF","AS","OC","AN"]}]
WAF_DEFAULT_REGION=dcmakati
```

Notes:

- `WAF_REGIONS` should point to your already-deployed WAF edge server details.

Secure the env file:

```bash
chmod 600 /var/www/atravad-waf/.env.production
```

Exact Ubuntu commands:

```bash
nano /var/www/atravad-waf/.env.production
chmod 600 /var/www/atravad-waf/.env.production
```

## 4. Build and Run the Web GUI

Build:

```bash
cd /var/www/atravad-waf
set -a
source .env.production
set +a
npm run build
```

Test run:

```bash
cd /var/www/atravad-waf
set -a
source .env.production
set +a
npm start
```

By default this will run Next.js on port `3000`.

Exact Ubuntu commands:

```bash
cd /var/www/atravad-waf
set -a
source .env.production
set +a
npm run build
npm start
```

## 5. Create a systemd Service

Use the file in `deploy/systemd/atravad-webgui.service`.

Install it:

```bash
sudo cp deploy/systemd/atravad-webgui.service /etc/systemd/system/atravad-webgui.service
sudo systemctl daemon-reload
sudo systemctl enable atravad-webgui
sudo systemctl start atravad-webgui
sudo systemctl status atravad-webgui
```

Useful commands:

```bash
sudo journalctl -u atravad-webgui -f
sudo systemctl restart atravad-webgui
```

Exact Ubuntu commands:

```bash
sudo tee /etc/systemd/system/atravad-webgui.service > /dev/null <<'EOF'
[Unit]
Description=ATRAVA Defense Web GUI (atrava-defense.cisoasaservice.io)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/atravad-waf
EnvironmentFile=/var/www/atravad-waf/.env.production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo chown -R www-data:www-data /var/www/atravad-waf
sudo systemctl daemon-reload
sudo systemctl enable atravad-webgui
sudo systemctl start atravad-webgui
sudo systemctl status atravad-webgui
sudo journalctl -u atravad-webgui -f
```

## 6. Configure Nginx

Use the file in `deploy/nginx/atravad-webgui.conf`.

Install it:

```bash
sudo cp deploy/nginx/atravad-webgui.conf /etc/nginx/sites-available/atravad-webgui
sudo ln -s /etc/nginx/sites-available/atravad-webgui /etc/nginx/sites-enabled/atravad-webgui
sudo nginx -t
sudo systemctl reload nginx
```

This config:

- listens on `80` and `443`
- redirects `80` to `443`
- terminates HTTPS at Nginx
- proxies requests to `127.0.0.1:3000`
- supports WebSocket upgrades
- forwards real client IP headers

Exact Ubuntu commands:

```bash
sudo tee /etc/nginx/sites-available/atravad-webgui > /dev/null <<'EOF'
server {
    listen 80;
    server_name atrava-defense.cisoasaservice.io;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/atravad-webgui /etc/nginx/sites-enabled/atravad-webgui
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Add SSL

If you use Certbot:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d atrava-defense.cisoasaservice.io
```


Exact Ubuntu commands for this deployment:

1. Point the DNS `A` record for `atrava-defense.cisoasaservice.io` to `112.199.127.214`.
2. Verify DNS resolution:

```bash
nslookup atrava-defense.cisoasaservice.io
```

3. Issue the certificate and let Certbot update Nginx:

```bash
sudo certbot --nginx -d atrava-defense.cisoasaservice.io
```

Choose the HTTPS redirect option when prompted.

## 8. Point the WAF Edge to the Web GUI for Log Ingestion

If your WAF edge sends logs to this GUI server, confirm the edge uses:

- the Web GUI public API URL
- the same `LOG_INGEST_API_KEY`

Expected ingestion endpoint:

```text
https://your-gui-domain.example.com/api/logs
```

Headers/body must include the configured log API key and tenant information expected by `src/app/api/logs/route.js`.

## 9. Verify the Split Deployment

Check these separately:

1. GUI is reachable:

```bash
curl -I http://127.0.0.1:3000
curl -I https://atrava-defense.cisoasaservice.io
```

2. GUI can authenticate and read Firebase data.
3. Application creation shows the correct WAF IP/CNAME from `WAF_REGIONS`.
4. WAF edge can still read the same Firebase project.

Exact Ubuntu verification commands for this deployment:

```bash
curl -I http://atrava-defense.cisoasaservice.io
curl -I https://atrava-defense.cisoasaservice.io
sudo systemctl status atravad-webgui
sudo systemctl status nginx
```

If `ufw` is enabled, allow the public ports:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```
5. WAF edge can send logs to the GUI `/api/logs` endpoint if remote ingestion is used.

## 10. Operational Notes

- Nginx is only fronting the **Web GUI** server in this guide.
- The **WAF edge** remains a separate deployment and that is acceptable.
- Customer DNS should still point to the **WAF edge**, not to the Web GUI server.
- The Web GUI domain is for administrators and tenants, not for protected-site traffic.

## Minimal Deployment Flow

```text
Admin User -> Nginx -> Next.js Web GUI -> Firebase

Internet Traffic -> WAF Edge Server -> Customer Origin
                           |
                           +-> logs / metadata -> Web GUI API + Firebase
```

## Common Mistakes

- Deploying the Web GUI as if it were a static site only
- Pointing customer DNS to the Web GUI instead of the WAF edge
- Exposing Firebase Admin private key through `NEXT_PUBLIC_*`
- Forgetting to open outbound access from the Web GUI server to Firebase/Google APIs
- Using different `LOG_INGEST_API_KEY` values between edge and GUI
