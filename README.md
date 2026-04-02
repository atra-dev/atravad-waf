# ATRAVAD WAF

A **modern reverse proxy Web Application Firewall (WAF)** - just like Sucuri and Reblaze! Built with Next.js, Node.js, and Firebase. Protect your websites by simply pointing your DNS to ATRAVAD WAF. All traffic flows through our protection layer before reaching your origin servers.

**🚀 Key Features:**
- **Seamless DNS-based routing** - Just change DNS, no code changes needed
- **Modern proxy architecture** - Reverse proxy with SSL termination
- **ModSecurity-powered** - Full OWASP CRS integration
- **Real-time protection** - Automatic attack blocking
- **Health checks & failover** - Multiple origin server support
- **Auto SSL** - Let's Encrypt integration

## Features

### 🎯 Proxy WAF (Modern Architecture)
- **DNS-based routing** - Point DNS to WAF, all traffic flows through protection
- **Reverse proxy** - SSL termination, request/response inspection
- **Origin forwarding** - Multiple origin servers with health checks and failover
- **Transparent proxying** - Users don't notice any difference

### 🛡️ Security Protection
- **ModSecurity Core Engine** - Full ModSecurity v3 integration with OWASP CRS support
- **Advanced Rule Generation** - SQL Injection, XSS, File Upload, Path Traversal, RCE, and more
- **Real-time blocking** - Automatic attack detection and blocking
- **Bot detection** - Advanced bot and crawler detection
- **DDoS protection** - Rate limiting and traffic shaping

### 📊 Management & Monitoring
- **Firebase Authentication** - Secure email/password authentication
- **Multi-tenant Support** - Tenant-based organization with role-based access
- **Application Management** - Create and manage protected applications
- **Policy Editor** - Create comprehensive WAF policies with multiple protection types
- **Request Testing** - Test HTTP requests against ModSecurity rules before deployment
- **Version Control** - Track policy versions with rollback capability
- **Real-time Logs** - Monitor all traffic and security events
- **Sucuri-style flow** - Add site → point DNS to ATRAVAD WAF → SSL → done (no nodes to deploy)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **WAF Engine**: ModSecurity 3.x with OWASP Core Rule Set (CRS) 3.3.0

## Prerequisites

- Node.js 18+ and npm
- Firebase project with Authentication and Firestore enabled
- Firebase Admin SDK service account credentials

### ModSecurity v3 Native Integration

ATRAVAD WAF uses **ModSecurity v3 (libmodsecurity)** via the `modsecurity` npm package. When the package is installed (included in dependencies), the proxy and the policy test API use the **native engine** for request/response inspection. If the native bindings are unavailable (e.g. build failure on your platform), the system automatically falls back to a pattern-based engine so the WAF still runs. Policy rules are generated from the policy editor and stored as ModSecurity config; the proxy loads rules per policy and applies them to traffic.

**Linux / WSL:** To build the native `modsecurity` addon, install libmodsecurity and its dev headers first, then run `npm install`. Use the provided script (Ubuntu/Debian/WSL):

```bash
./scripts/install-libmodsecurity.sh
npm install
```

If you skip this step, `npm install` may fail when building the `modsecurity` native module; the project can still run using the pattern-based fallback by making `modsecurity` optional (see [docs/DATA_CENTER_WAF_DEPLOYMENT.md](docs/DATA_CENTER_WAF_DEPLOYMENT.md)).

### Let's Encrypt Auto-Provisioning

The proxy can **auto-provision TLS certificates** from Let's Encrypt for applications that have **SSL → Auto provision** enabled. When an application is added or the proxy starts, it requests a certificate for the application domain via **HTTP-01** challenge. The proxy serves `/.well-known/acme-challenge/:token` automatically. HTTPS uses **SNI** so each domain gets its own certificate. Certificates are stored under `CERTS_DIR` (default: `./certs`) and reused across restarts.

**Environment variables (optional):**

- `CERTS_DIR` – Directory for certificate storage (default: `./certs`)
- `LETSENCRYPT_EMAIL` – Contact email for ACME account (default: `admin@atravad.local`)
- `LETSENCRYPT_STAGING` – Set to `true` or `1` to use Let's Encrypt **staging** (no rate limits; certs not trusted by browsers)
- `LETSENCRYPT_ACCOUNT_KEY` – PEM account private key (optional; generated and saved to `CERTS_DIR/account-key.pem` if not set)

**Requirements:** The application domain must point (DNS A/CNAME) to the proxy so that Let's Encrypt can reach `http://domain/.well-known/acme-challenge/:token`. Port 80 must be open on the proxy.

**Custom SSL (like Sucuri):** You can also use your own certificate. In the Applications UI, choose **My certificate** and paste your PEM certificate, private key, and optionally CA chain. The proxy will use your certificate for that domain (SNI). Custom certificate takes precedence over Let's Encrypt for that domain.

## Setup Instructions

### 1. (Optional) Install libmodsecurity (Linux / WSL)

If you want the **native ModSecurity engine** (full OWASP CRS) and are on Ubuntu, Debian, or WSL, install libmodsecurity first so the `modsecurity` npm package can compile:

```bash
chmod +x scripts/install-libmodsecurity.sh
./scripts/install-libmodsecurity.sh
```

Then proceed to step 2. **If you already ran the install script** and `npm install` still fails with `modsecurity/modsecurity.h: No such file or directory`, the install went to `/usr/local/modsecurity` but the npm package expects `/usr/local/include` and `/usr/local/lib`. Run:

```bash
chmod +x scripts/fix-modsecurity-paths.sh
sudo ./scripts/fix-modsecurity-paths.sh
npm install
```

If you skip the libmodsecurity step, run `npm install` (the project’s `.npmrc` uses `legacy-peer-deps`); the WAF will use the pattern-based fallback if the native addon fails to build.

### 2. Clone and Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Authentication** with Email/Password provider
3. Enable **Firestore Database**
4. Go to Project Settings > Service Accounts
5. Generate a new private key and download the JSON file
6. Create a `.env.local` file in the root directory:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# ATRAVAD WAF (Sucuri-style: shown when customers add a site - point DNS here, no server to deploy)
NEXT_PUBLIC_ATRAVAD_WAF_IP=1.2.3.4
NEXT_PUBLIC_ATRAVAD_WAF_CNAME=waf.atravad.com
```

**Note**: For the `FIREBASE_PRIVATE_KEY`, copy the `private_key` value from your service account JSON file. Make sure to include the `\n` characters and wrap it in quotes.

**ATRAVAD WAF IP/CNAME:** Set `NEXT_PUBLIC_ATRAVAD_WAF_IP` and/or `NEXT_PUBLIC_ATRAVAD_WAF_CNAME` to the address customers point their domain's A or CNAME record to (like Sucuri). The Applications page shows this so customers know where to point DNS — no server or node deployment on their side.

### Traffic Logging Env Names

Allowed traffic is now handled in two layers:

- Hourly rollups: always feed analytics, site traffic totals, and geographic summaries
- Raw allowed logs: optional, and may be sampled to control storage

Preferred environment variables:

```env
WAF_ALLOWED_TRAFFIC_MODE=rollups_only
WAF_ALLOWED_TRAFFIC_SAMPLE_RATE=200
WAF_ALLOWED_RAW_LOGS_ENABLED=false
WAF_ALLOWED_RAW_SAMPLE_RATE=100
```

Behavior:

- `WAF_ALLOWED_TRAFFIC_MODE=rollups_only` keeps allowed traffic in rollups and analytics without storing full raw allowed logs by default
- `WAF_ALLOWED_TRAFFIC_MODE=sampled` enables sampled raw visibility for allowed traffic
- `WAF_ALLOWED_TRAFFIC_SAMPLE_RATE` controls sampling for normal allowed-traffic ingestion when sampled mode is active
- `WAF_ALLOWED_RAW_LOGS_ENABLED` controls whether raw allowed-request documents are stored
- `WAF_ALLOWED_RAW_SAMPLE_RATE` controls raw allowed-log sampling when raw storage is enabled

Legacy compatibility:

- `WAF_NORMAL_TRAFFIC_MODE`, `WAF_ALLOWED_LOG_SAMPLE_RATE`, `WAF_STORE_ALLOWED_RAW_LOGS`, and `WAF_ALLOWED_RAW_LOG_SAMPLE_RATE` still work
- `WAF_LOG_ALLOWED_REQUESTS` is deprecated; `false` now maps to `rollups_only` and `true` maps to `sampled`

### 4. Firestore Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tenants - users can read their own tenant
    match /tenants/{tenantId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == tenantId;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Applications - users can read/write apps in their tenant
    match /applications/{appId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Policies - users can read/write policies in their tenant
    match /policies/{policyId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Nodes - users can read/write nodes in their tenant
    match /nodes/{nodeId} {
      allow read, write: if request.auth != null && 
        resource.data.tenantId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
  }
}
```

### 5. Create Initial User

1. Start the development server:
```bash
npm run dev
```

2. Go to `http://localhost:3000/login`
3. Create a user account in Firebase Console > Authentication > Users
4. After first login, you'll need to create a tenant (this can be automated in production)

## Dark Theme Maintenance

Dark mode is operationalized and safe to ship, but it is still a hybrid of:

- explicit theme-aware page/component styling
- shared theme tokens
- compatibility overrides for older light-only utility classes

To keep future UI work dark-mode safe, follow these rules.

### Current Theme Architecture

- Theme is bootstrapped at document load in `src/app/layout.jsx`
- The active theme is stored in `localStorage` under `atrava-theme`
- Theme tokens and compatibility overrides live in `src/app/globals.css`
- Primary shared surface/text helpers are:
  - `.theme-surface`
  - `.theme-panel`
  - `.theme-text-primary`
  - `.theme-text-secondary`
  - `.theme-text-muted`

### Preferred Patterns For New UI

- Prefer CSS variables and shared theme helpers over hardcoded light-only colors
- Prefer `theme-surface` and `theme-panel` for cards, panels, modals, and tables
- Prefer semantic text helpers or token-backed classes for headings, labels, and secondary text
- Reuse existing dark-safe shared components before introducing new one-off styling
- Check both light and dark mode before merging UI changes

### Avoid

- Avoid introducing new hardcoded `bg-white`, `text-gray-*`, and `border-gray-*` patterns when a token-backed alternative exists
- Avoid page-specific dark fixes when the styling should really live in a shared component
- Avoid relying only on global compatibility overrides for new features
- Avoid adding new surfaces without checking hover, focus, disabled, and empty states in dark mode

### When Editing Existing Screens

- If the screen already uses old light-only Tailwind utilities, it is acceptable to keep it working through the global compatibility layer for small fixes
- If you are doing substantial UI work on a screen, convert the touched area to explicit theme-aware styling instead of adding more light-only utilities
- When updating modals, tables, badges, charts, and form controls, make sure the shell, borders, text, and interactive states all work together in dark mode

### Release Checklist

- Verify the page in both light and dark themes
- Verify loading, empty, success, warning, and error states
- Verify tables, modals, dropdowns, and charts if the page contains them
- Verify text contrast against panel and page backgrounds
- Run `npm run build` before shipping UI changes

### Long-Term Cleanup Direction

- Gradually reduce reliance on broad dark overrides in `src/app/globals.css`
- Move repeated patterns into shared dark-safe primitives
- Prefer design-token-driven styling over catch-all utility remapping

This keeps the current rollout practical while moving the UI toward a cleaner design-system-based dark theme over time.

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
atravad-waf/
├── src/
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── tenants/      # Tenant management
│   │   │   ├── apps/         # Application management
│   │   │   ├── policies/     # Policy management
│   │   │   └── nodes/        # Node management
│   │   ├── dashboard/        # Dashboard page
│   │   ├── login/            # Login page
│   │   ├── apps/             # Applications page
│   │   ├── policies/         # Policies page
│   │   └── nodes/            # Nodes page
│   ├── components/           # React components
│   │   └── Layout.jsx        # Main layout with sidebar
│   ├── lib/                  # Utilities
│   │   ├── firebase.js       # Firebase client config
│   │   └── firebase-admin.js # Firebase admin config
│   └── middleware.js         # Auth middleware
├── public/                   # Static assets
├── .env.local                # Environment variables (create this)
└── README.md
```

## API Endpoints

### Authentication
- All protected routes require authentication via cookie-based session

### Tenants
- `POST /api/tenants` - Create a new tenant
- `GET /api/tenants` - Get current user's tenant
- `GET /api/tenants/current` - Get current tenant info

### Applications
- `POST /api/apps` - Create a new application
- `GET /api/apps` - List all applications for current tenant

### Policies
- `POST /api/policies` - Create a new policy version with ModSecurity config generation
- `GET /api/policies` - List all policies (optionally filter by name)
- `GET /api/policies/[id]` - Get specific policy details

### ModSecurity
- `POST /api/modsecurity/test` - Test HTTP requests against ModSecurity rules

### Nodes
- `POST /api/nodes` - Register a new WAF node
- `GET /api/nodes` - List all nodes for current tenant

## User Roles

- **admin**: Full access to all features
- **analyst**: Can view and analyze data
- **viewer**: Read-only access

## How It Works

### 1. DNS Configuration
Point your domain's DNS to ATRAVAD WAF IP addresses. All traffic for your domain now routes through our protection layer.

### 2. Request Flow
```
User → DNS → ATRAVAD WAF Proxy → ModSecurity Inspection → Origin Server
                              ↓
                    If attack detected → Block (403)
                    If safe → Forward to origin
```

### 3. Protection
- **ModSecurity** inspects every request using OWASP CRS and custom rules
- **Attacks are blocked** before reaching your origin server
- **Clean traffic** is forwarded transparently
- **Real-time monitoring** in the dashboard

### 4. No Code Changes
Just change DNS - that's it! Your application code doesn't need any modifications.

## ModSecurity Core Engine Integration

ATRAVAD WAF uses **ModSecurity v3** as its core WAF engine, providing enterprise-grade web application protection. The platform generates comprehensive ModSecurity configurations with full OWASP Core Rule Set (CRS) integration.

### Important: OWASP CRS is Enabled by Default

**You don't need to create policies to get protection!** All policies automatically include **OWASP CRS 3.3.0**, which provides comprehensive protection against:
- SQL Injection attacks
- Cross-Site Scripting (XSS)
- Local/Remote File Inclusion
- Remote Code Execution
- Protocol violations
- And many more threats

**Policies are optional customizations** that add application-specific rules on top of OWASP CRS. You can create a policy with just a name and still get full OWASP CRS protection.

### Additional Protection Types (Optional)

The platform supports the following **additional** protection types that complement OWASP CRS:

- **Enhanced SQL Injection Protection**: Additional SQL injection rules beyond OWASP CRS (OWASP CRS already provides comprehensive SQL injection protection)
- **Enhanced XSS Protection**: Additional XSS detection rules beyond OWASP CRS (OWASP CRS already provides comprehensive XSS protection)
- **File Upload Protection**: Dangerous file extension blocking and file size limits
- **Path Traversal Protection**: Directory traversal attack prevention
- **Remote Code Execution (RCE)**: Command injection and code execution attempt detection
- **Rate Limiting**: Configurable request rate limiting per IP address
- **Custom Rules**: Support for custom ModSecurity rules with full rule syntax

### OWASP Core Rule Set (CRS) Integration

All policies can optionally include OWASP CRS 3.3.0, which provides:

- **REQUEST-901-INITIALIZATION**: CRS initialization and setup
- **REQUEST-920-PROTOCOL-ENFORCEMENT**: HTTP protocol validation
- **REQUEST-930-APPLICATION-ATTACK-LFI**: Local File Inclusion protection
- **REQUEST-932-APPLICATION-ATTACK-RCE**: Remote Code Execution protection
- **REQUEST-941-APPLICATION-ATTACK-XSS**: XSS attack detection
- **REQUEST-942-APPLICATION-ATTACK-SQLI**: SQL injection detection
- **RESPONSE-950-DATA-LEAKAGES**: Response data leakage prevention
- And many more comprehensive rule sets

### ModSecurity Configuration Generation

Generated configurations include:

- Complete ModSecurity engine setup
- OWASP CRS integration (optional)
- Custom protection rules based on policy settings
- Proper rule IDs, phases, and actions
- Comprehensive logging configuration
- Error handling and anomaly scoring

### Request Testing

Use the `/api/modsecurity/test` endpoint to test HTTP requests against your policies before deployment:

```bash
POST /api/modsecurity/test
{
  "policyId": "policy-id",
  "testRequest": {
    "method": "GET",
    "url": "/api/users?id=1' OR '1'='1",
    "headers": {},
    "query": { "id": "1' OR '1'='1" },
    "body": {}
  }
}
```

The endpoint returns detailed evaluation results including matched rules, severity levels, and blocking decisions.

### Deployment

Generated ModSecurity configurations are stored with each policy version and can be:

1. **Downloaded** directly from the policy management interface
2. **Deployed** to ModSecurity-enabled servers (Apache, Nginx, or standalone)
3. **Tested** using the built-in request testing endpoint
4. **Versioned** with full rollback capability

## Development

### Running in Development Mode

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm start
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Firestore Rules**: Always configure proper security rules
3. **Authentication**: Ensure middleware properly protects routes
4. **API Security**: All API routes verify authentication tokens

## Quick Start

1. **Create Application** in dashboard with your domain and origin server
2. **Get WAF IP addresses** from the WAF Nodes page
3. **Update DNS** to point to WAF IPs
4. **Wait for propagation** (5-60 minutes)
5. **You're protected!** All traffic now flows through ATRAVAD WAF

See [Quick Start Guide](./docs/PROXY_WAF_QUICKSTART.md) for detailed instructions.

## Documentation

- [Management Meeting Report](./docs/MANAGEMENT_MEETING_REPORT.md) - Recap, agendas, next steps, architecture & traffic flow diagrams
- [Quick Start Guide](./docs/PROXY_WAF_QUICKSTART.md) - Get protected in 5 minutes
- **WAF EDGE deployment (choose one):**
  - [Data Center WAF Deployment](./docs/DATA_CENTER_WAF_DEPLOYMENT.md) - Deploy `proxy-server-standalone` on-prem (EC2-style VM, Nginx, Let's Encrypt)
  - [AWS WAF Deployment](./docs/AWS_WAF_DEPLOYMENT.md) - Deploy on AWS (EC2 or ECS Fargate, ALB + ACM)
- [DNS Setup Guide](./docs/DNS_SETUP_GUIDE.md) - Detailed DNS configuration
- [Architecture Diagram](./docs/ARCHITECTURE_DIAGRAM.md) - UI, WAF proxy, and traffic flow
- [Proxy WAF Architecture](./docs/PROXY_WAF_ARCHITECTURE.md) - Technical architecture
- [Implementation Guide](./docs/PROXY_WAF_IMPLEMENTATION.md) - Deployment details
- [WAF Nodes Guide](./docs/WAF_NODES_GUIDE.md) - Node setup and management
- [ModSecurity Integration](./docs/MODSECURITY_INTEGRATION.md) - ModSecurity details

## Architecture

ATRAVAD WAF uses a **modern proxy WAF architecture** (like Sucuri and Reblaze):

- **Proxy WAF**: Reverse proxy that sits in front of origin servers
- **DNS-based routing**: Point DNS to WAF, all traffic flows through protection
- **Application-based**: Configure applications with domains and origins
- **Policy assignment**: Assign security policies to applications
- **Automatic updates**: Nodes fetch application configs automatically

**Legacy architecture (ModSecurity on origin servers) has been removed.**

## Future Enhancements

- ✅ Proxy WAF architecture (completed)
- ✅ DNS-based routing (completed)
- ✅ Health checks and failover (completed)
- ✅ Full ModSecurity v3 native integration (completed)
- ✅ Let's Encrypt auto-provisioning (completed)
- Advanced load balancing algorithms
- Global CDN distribution
- Advanced bot detection with CAPTCHA
- Webhook integrations
- Multi-factor authentication

## License

This project is private and proprietary.

## Support

For issues and questions, please contact the development team.
