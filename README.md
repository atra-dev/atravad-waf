# ATRAVA Defense

ATRAVA Defense is a standalone reverse-proxy Web Application Firewall platform built with Next.js, Node.js, Firebase, and ModSecurity. It is designed to protect customer sites by placing a WAF edge in front of origin infrastructure, applying OWASP CRS plus custom protections, and exposing a multi-tenant management UI for applications, policies, logs, analytics, subscriptions, and user management.

## Overview

ATRAVA Defense provides:

- Reverse-proxy WAF protection for customer domains
- Generated ModSecurity policies with OWASP CRS support
- Native, fallback, and supplemental inspection paths
- Multi-tenant application and policy management
- Traffic logs, analytics, and audit workflows
- DNS-based onboarding and SSL certificate management

## Current Product Scope

Main application areas in `src/app`:

- `/dashboard`
- `/apps`
- `/policies`
- `/logs`
- `/analytics`
- `/subscription`
- `/users`
- `/admin`

Core platform capabilities:

- Protected application onboarding
- Policy authoring and versioning
- Request testing against generated ModSecurity rules
- Security log review and analytics
- Tenant-aware user and subscription management
- Dark/light theme UI

## Architecture

ATRAVA Defense uses a reverse-proxy WAF edge model:

1. Customer DNS points traffic to the ATRAVA Defense edge
2. Requests are inspected before origin forwarding
3. ModSecurity-generated policy rules are applied when available
4. Supplemental and fallback inspection paths maintain protection when native rule execution is unavailable
5. Safe traffic is proxied to the configured origin
6. Blocked traffic is terminated with WAF responses and logged

High-level request flow:

```text
Client -> DNS -> ATRAVA Defense WAF Edge -> Policy Inspection -> Origin
                                    |
                                    +-> Block / Log / Audit
```

## Security Engine

The platform uses ModSecurity-oriented rule generation with multiple inspection layers:

- Generated ModSecurity policy config in `src/lib/modsecurity.js`
- Standalone proxy and inspection engine in `src/lib/modsecurity-proxy.js`
- Standalone runtime entrypoint in `proxy-server-standalone.js`

Protection coverage includes:

- SQL injection
- Cross-site scripting
- Path traversal
- Remote code execution and command injection
- File upload controls
- Redirect and SSRF-style destination validation
- Header and malformed request checks

Recent hardening specifically expanded coverage for:

- Raw URI/query command operators
- Encoded control-character probes like `%0a`, `%09`, `%0d`
- Brace expansion RCE payloads
- HTML entity and numeric entity XSS payloads
- Template literal XSS patterns
- Overlong UTF-8 traversal payloads

See [WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md](./docs/WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md) for the consolidated assessment and remediation record.

## Tech Stack

- Frontend: Next.js 16, React 19
- Styling: Tailwind CSS 4
- Backend: Next.js route handlers and Node.js services
- Data: Firebase Firestore
- Auth: Firebase Authentication
- Charts/analytics: Recharts, react-simple-maps
- WAF engine: ModSecurity-based generated policy model with optional native bindings

## Requirements

- Node.js 18+
- npm
- Firebase project with:
  - Authentication
  - Firestore
  - Admin SDK credentials

Optional for native ModSecurity integration:

- Linux/WSL environment with libmodsecurity and development headers

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root.

Minimum Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

NEXT_PUBLIC_ATRAVAD_WAF_IP=1.2.3.4
NEXT_PUBLIC_ATRAVAD_WAF_CNAME=waf.example.com
```

Optional traffic logging controls:

```env
WAF_ALLOWED_TRAFFIC_MODE=rollups_only
WAF_ALLOWED_TRAFFIC_SAMPLE_RATE=200
WAF_ALLOWED_RAW_LOGS_ENABLED=false
WAF_ALLOWED_RAW_SAMPLE_RATE=100
```

### 3. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

### 4. Production build

```bash
npm run build
npm start
```

## Native ModSecurity Notes

The `modsecurity` package is optional in `package.json`. When native bindings are available, the platform can use the native engine path. When they are not, ATRAVA Defense falls back to internal inspection logic so the edge remains operational.

For Linux or WSL environments, use the provided script before `npm install` if you want native libmodsecurity support:

```bash
chmod +x scripts/install-libmodsecurity.sh
./scripts/install-libmodsecurity.sh
npm install
```

If native bindings are unavailable, the fallback and supplemental inspection layers still enforce core protections.

## Authentication and Data Model

The platform is multi-tenant.

Core objects include:

- users
- tenants
- applications
- policies
- policy versions and audit history
- logs and analytics data

Typical roles:

- `admin`
- `analyst`
- `viewer`

## Key Project Areas

Important directories:

```text
src/
  app/
    admin/
    analytics/
    api/
    apps/
    dashboard/
    logs/
    login/
    policies/
    subscription/
    users/
  components/
  hooks/
  lib/
public/
docs/
scripts/
proxy-server-standalone.js
```

Important implementation files:

- `src/lib/modsecurity.js`
- `src/lib/modsecurity-proxy.js`
- `proxy-server-standalone.js`
- `src/app/layout.jsx`
- `src/app/globals.css`

## Theme System

Dark mode and light mode are both operationalized.

Theme behavior is centered around:

- `src/app/layout.jsx`
- `src/app/globals.css`

Preferred UI patterns:

- use shared theme surfaces instead of hardcoded light-only colors
- use token-backed text/border helpers
- verify both themes before merging UI changes
- convert touched areas to explicit theme-aware styling rather than adding more compatibility overrides

## Testing and Validation

Useful commands:

```bash
npm run build
```

The project has also been validated through WAF assessment and hardening reviews. The latest consolidated report is:

- [WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md](./docs/WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md)

That report documents:

- historical assessment phases
- hardening changes
- before/after blocking rates
- final live validation of remediated command-operator probes

## Documentation

Available docs in `docs/`:

- [WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md](./docs/WAF_HARDENING_AND_ASSESSMENT_REPORT_2026-04.md)
- [REVERSE_PROXY_MODSECURITY_ASSESSMENT.md](./docs/REVERSE_PROXY_MODSECURITY_ASSESSMENT.md)
- [DATA_CENTER_WAF_DEPLOYMENT.md](./docs/DATA_CENTER_WAF_DEPLOYMENT.md)
- [AWS_WAF_DEPLOYMENT.md](./docs/AWS_WAF_DEPLOYMENT.md)
- [DNS_SETUP_GUIDE.md](./docs/DNS_SETUP_GUIDE.md)
- [ARCHITECTURE_DIAGRAM.md](./docs/ARCHITECTURE_DIAGRAM.md)
- [ADVANCED_POLICY_FEATURES.md](./docs/ADVANCED_POLICY_FEATURES.md)
- [DEVELOPMENT_GANTT_CHART.md](./docs/DEVELOPMENT_GANTT_CHART.md)
- [USER_GUIDE_OUTLINE.md](./docs/USER_GUIDE_OUTLINE.md)
- [COMPLETE_USER_GUIDE.md](./docs/COMPLETE_USER_GUIDE.md)
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)
- [TROUBLESHOOTING_GUIDE.md](./docs/TROUBLESHOOTING_GUIDE.md)
- [SUPPORT_WORKFLOW_SETUP.md](./docs/SUPPORT_WORKFLOW_SETUP.md)
- [ESCALATION_PROCEDURE.md](./docs/ESCALATION_PROCEDURE.md)

## Operational Notes

- Customer onboarding is DNS-first
- Policies are generated and versioned through the UI
- The WAF edge is intended to remain protected even when native bindings are unavailable
- `200 OK` from black-box testing is not treated as proof of exploitability without stronger validation evidence

## License

Private and proprietary.
