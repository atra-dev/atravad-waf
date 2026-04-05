# ATRAVA Defense Architecture & Connection Diagram

This document describes how the **Dashboard (UI)**, **WAF Proxy Server**, and **traffic** connectâ€”whether the WAF proxy runs in **AWS** or in your **data center**.

---

## Is Data Center Deployment Possible?

**Yes.** The WAF proxy server is a standard Node.js application. You can run it:

- **In AWS** (e.g. EC2 with a public IP or behind a load balancer)
- **In your data center** (on-premises), as long as:
  1. The proxy has a **public IP** (or sits behind a load balancer / firewall that has one) so customers can point DNS to it.
  2. The proxy can reach **Firebase** (Firestore) over the internet for application and policy config.
  3. Ports **80** and **443** are available (or your chosen HTTP/HTTPS ports).

No change to the Dashboard or app logic is required. You only set `WAF_REGIONS` (in the Dashboardâ€™s environment) to the **data center proxyâ€™s public IP** (and optional CNAME) so the UI shows customers the correct â€œpoint DNS hereâ€ value.

---

## High-Level Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           ATRAVA Defense SYSTEM                                       â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                                   â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”‚
â”‚   â”‚   Browser    â”‚         â”‚   Firebase   â”‚         â”‚  WAF Proxy Server    â”‚   â”‚
â”‚   â”‚  (Admins)    â”‚â”€â”€â”€â”€â”€â”€â”€â”€â–¶â”‚  (Config)    â”‚â—€â”€â”€â”€â”€â”€â”€â”€â”€â”‚  (AWS or Data Center) â”‚   â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚
â”‚          â”‚                            â–²                         â”‚               â”‚
â”‚          â”‚                            â”‚                         â”‚               â”‚
â”‚          â–¼                            â”‚                         â–¼               â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                    â”‚                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚   â”‚  Dashboard  â”‚â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                 â”‚  Origin      â”‚       â”‚
â”‚   â”‚  (Next.js   â”‚  Reads/writes apps,                  â”‚  Servers     â”‚       â”‚
â”‚   â”‚   UI)       â”‚  policies, tenants                    â”‚  (Customer)  â”‚       â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â”‚                                                                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## 1. Dashboard â†” WAF Proxy (Indirect via Firebase)

The **Dashboard (UI) does not talk directly to the WAF proxy**. Both use **Firebase (Firestore)**:

| Component      | Role |
|----------------|------|
| **Dashboard**  | Admins create/update **applications** (domain, origin URL, policy). Stored in Firestore. |
| **WAF Proxy**  | Reads **applications** from Firestore (by tenant). Real-time listener picks up changes. |
| **WAF_REGIONS**| In the Dashboard env: list of regions with **IP** (and CNAME). That IP is what customers point DNS to (your AWS or data center proxy). |

So: **UI â†’ Firestore â† WAF Proxy**. The â€œconnectionâ€ from UI to WAF is: *same Firestore data*.

```mermaid
flowchart LR
    subgraph Admin
        Browser[Browser]
    end
    subgraph ATRAVAD["ATRAVAD Platform"]
        UI[Dashboard UI\nNext.js]
        Firebase[(Firebase\nFirestore)]
        WAF[WAF Proxy Server\nAWS or Data Center]
    end
    subgraph Customer
        Origin[Origin Server]
    end

    Browser -->|"1. Login, manage apps"| UI
    UI -->|"2. Read/Write apps, policies"| Firebase
    WAF -->|"3. Read apps (real-time)"| Firebase
    WAF -->|"4. Forward clean traffic"| Origin
```

---

## 2. ATRAVA Defense Traffic Flow (User â†’ WAF â†’ Origin)

**End-user traffic** (your customersâ€™ visitors) never hits the Dashboard. It goes: **User â†’ DNS â†’ WAF Proxy â†’ ModSecurity â†’ Origin (or block)**.

```mermaid
sequenceDiagram
    participant User as End User / Visitor
    participant DNS as DNS
    participant WAF as WAF Proxy Server<br/>(AWS or Data Center)
    participant ModSec as ModSecurity
    participant Origin as Origin Server

    User->>DNS: Request site (e.g. www.example.com)
    DNS->>User: Resolves to WAF IP (or CNAME â†’ WAF IP)
    User->>WAF: HTTP/HTTPS request
    WAF->>WAF: Look up app by Host header (Firestore)
    WAF->>ModSec: Inspect request (policy)
    alt Request allowed
        ModSec->>WAF: OK
        WAF->>Origin: Forward request (X-Forwarded-*)
        Origin->>WAF: Response
        WAF->>ModSec: Optional response inspection
        ModSec->>WAF: OK
        WAF->>User: Response
    else Request blocked
        ModSec->>WAF: Block
        WAF->>User: 403 Blocked
    end
```

**Flow summary:**

1. Customer points **DNS** (A or CNAME) to your **WAF proxyâ€™s public IP** (AWS or data center).
2. **Traffic** goes to the WAF proxy (HTTP/80, HTTPS/443).
3. Proxy looks up **application** by `Host` (from Firestore).
4. **ModSecurity** inspects request (and optionally response); block or allow.
5. If allowed, proxy **forwards** to **origin**; response goes back through the proxy to the user.

---

## 3. Full System Diagram (UI + Traffic)

Combined view: **admin path** (Dashboard â†” Firebase â†” WAF config) and **traffic path** (User â†’ WAF â†’ Origin).

```mermaid
flowchart TB
    subgraph Admin["Admin / Management"]
        Browser[Admin Browser]
        UI[Dashboard\nNext.js UI]
    end

    subgraph Config["Configuration Store"]
        Firebase[(Firebase Firestore\napps, policies, tenants)]
    end

    subgraph Edge["WAF Edge (AWS or Data Center)"]
        WAF[WAF Proxy Server\nproxy-server-standalone.js]
        ModSec[ModSecurity\nInspection]
        WAF --> ModSec
    end

    subgraph Customer["Customer Infrastructure"]
        DNS[DNS\nA/CNAME â†’ WAF IP]
        Origin[Origin Server]
    end

    subgraph EndUser["End Users"]
        User[Visitor / User]
    end

    Browser -->|"Manage apps & policies"| UI
    UI <-->|"Read/Write config"| Firebase
    WAF -->|"Read apps (real-time)"| Firebase

    User -->|"1. Request site"| DNS
    DNS -->|"2. Resolve to WAF"| User
    User -->|"3. HTTP/HTTPS"| WAF
    WAF -->|"4. Forward (if allowed)"| Origin
    Origin -->|"5. Response"| WAF
    WAF -->|"6. Response"| User
```

---

## 4. Data Center vs AWS (Same Logic)

Deployment location only changes **where** the proxy runs and **which** IP you put in `WAF_REGIONS`.

| Aspect           | AWS                         | Data Center                          |
|-----------------|-----------------------------|--------------------------------------|
| **Run**         | EC2 (or ECS/Lambda, etc.)   | VM or physical server                |
| **Public IP**   | EC2 public IP or ELB        | DC public IP or LB in front of proxy |
| **Firebase**    | Outbound internet           | Outbound internet (allow Firestore)  |
| **Dashboard**   | `WAF_REGIONS=[{..., "ip": "AWS_IP"}]` | `WAF_REGIONS=[{..., "ip": "DC_IP"}]` |
| **Traffic**     | User â†’ AWS â†’ Origin         | User â†’ Data Center â†’ Origin          |

**Data center checklist:**

1. Install Node.js, run `proxy-server-standalone.js` (same as in AWS).
2. Configure **Firebase Admin** (env vars or service account) so the proxy can read Firestore.
3. Expose **80/443** (or your ports) and assign a **public IP** (or CNAME that resolves to that IP).
4. In the **Dashboard** `.env.local`, set `WAF_REGIONS` to that IP (and optional CNAME).
5. Customers point **DNS** to that IP (or CNAME). Traffic flow is as in the diagrams above.

**Full step-by-step:** See [Data Center WAF Deployment](./DATA_CENTER_WAF_DEPLOYMENT.md) for prerequisites, Firebase setup, env vars, PM2/systemd, SSL (Nginx), and Dashboard `WAF_REGIONS`.

---

## 5. Quick Reference: What Connects to What

| From           | To              | Purpose |
|----------------|-----------------|---------|
| **Dashboard**  | **Firebase**    | Read/write apps, policies, tenants. |
| **Dashboard**  | **WAF Proxy**  | No direct connection. Dashboard only shows WAF IP from `WAF_REGIONS`. |
| **WAF Proxy**  | **Firebase**    | Read applications (and policies) for routing and ModSecurity. |
| **WAF Proxy**  | **Origin**      | Forward allowed requests. |
| **User**       | **WAF Proxy**   | All site traffic (DNS points to WAF IP). |
| **User**       | **Dashboard**   | Only when admins open the dashboard in a browser. |

---

## Summary

- **Yes, you can run the WAF proxy in your data center.** Same code as AWS; you only need a public IP (or LB), Firebase access, and ports 80/443.
- **UI â€œconnectionâ€ to the WAF proxy** is via **Firestore**: Dashboard writes app config, proxy reads it. No direct UI â†” proxy link.
- **ATRAVA Defense traffic** is: **User â†’ DNS (WAF IP) â†’ WAF Proxy (AWS or Data Center) â†’ ModSecurity â†’ Origin** (or block at WAF).

Use the Mermaid diagrams in this doc (e.g. in GitHub or a Mermaid-capable viewer) for the connection and traffic visuals.

---

## Visual Diagram (SVG)

A standalone visual of the same architecture is in the repo:

![ATRAVA Defense Architecture](atravad-waf-architecture.svg)

Open `docs/atravad-waf-architecture.svg` in a browser or editor to view the full diagram: **Admin â†’ Firebase**, **WAF Proxy (AWS or Data Center) â†’ Firebase**, and **User â†’ DNS â†’ WAF â†’ Origin** traffic flow.

