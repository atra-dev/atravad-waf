# Sucuri-Style Model: Add Site → Point DNS → Done

## How Sucuri Works (and How ATRAVAD Matches It)

**Sucuri does not ask customers to deploy any servers or “nodes.”** The flow is:

1. **Add site** – Customer adds their domain in the Sucuri dashboard (domain, origin/hosting IP).
2. **Sucuri gives an IP (or CNAME)** – Sucuri provides *their* firewall IP (or CNAME like `cloudproxy.sucuri.net`).
3. **Customer points DNS** – Customer changes their domain’s A or CNAME record to point to that Sucuri IP/CNAME.
4. **Traffic flows** – User → DNS (resolves to Sucuri) → Sucuri’s cloud proxy → Origin. Sucuri runs the WAF in their cloud; the customer never installs anything.

**No “node” on the customer side.** The “nodes” are Sucuri’s edge – the customer only adds sites and updates DNS.

---

## ATRAVAD WAF: Same Idea

Our goal is the same:

| Step | Sucuri | ATRAVAD (target) |
|------|--------|-------------------|
| 1 | Add site (domain, origin) | Add application (domain, origins, policy) |
| 2 | Sucuri gives *their* WAF IP/CNAME | We show *ATRAVAD’s* WAF IP or CNAME (e.g. `waf.atravad.com`) |
| 3 | Customer points A/CNAME to that | Customer points A/CNAME to that |
| 4 | Traffic → Sucuri → origin | Traffic → ATRAVAD WAF → origin |

**We do not require the customer to “register a node” or run any software.**  
“Nodes” are *our* edge – we run the proxy. The customer only adds sites and points DNS to **our** IP or CNAME.

---

## What “WAF IP” or “WAF CNAME” Means

- **ATRAVAD WAF IP** – The IP(s) of *our* proxy fleet (our edge). We configure this (e.g. `NEXT_PUBLIC_ATRAVAD_WAF_IP` or system config) and show it in the dashboard when a customer adds a site.
- **ATRAVAD WAF CNAME** – Optional. A hostname like `waf.atravad.com` that resolves to our edge. We show this so the customer can set `CNAME → waf.atravad.com` instead of A records.

The customer never points DNS to “their node” – they point to **our** WAF IP or CNAME.

---

## Customer-Facing Flow (Sucuri-Style)

1. Log in to ATRAVAD dashboard.
2. Go to **Applications** (or **Sites**).
3. Click **Add application**:
   - Name, domain (e.g. `example.com`), origin URL(s), optional policy.
4. After saving, the dashboard shows:
   - **“Point your DNS here”**
   - **A record:** `example.com` → `X.X.X.X` (ATRAVAD WAF IP)
   - **Or CNAME:** `example.com` → `waf.atravad.com` (ATRAVAD WAF CNAME)
5. Customer updates A/CNAME at their DNS provider. No server install, no “register node.”

---

## Backend / Ops View

- **Our edge** – We run the proxy (e.g. `proxy-server.js` / standalone) on *our* infra. Those are “our nodes”; customers don’t manage them.
- **Applications** – Stored in Firestore; our edge loads them by tenant/domain and routes by Host.
- **DNS** – Customers point their domain to our WAF IP or CNAME; our edge is shared for all tenants, routing by Host header.

---

## Configuring the WAF IP/CNAME Shown to Customers

Set these in `.env.local` (or your deployment env) so the Applications page shows where customers should point DNS:

- **`NEXT_PUBLIC_ATRAVAD_WAF_IP`** – The ATRAVAD WAF IP address (e.g. your edge load balancer or proxy IP). Shown as “Point A record → X.X.X.X”.
- **`NEXT_PUBLIC_ATRAVAD_WAF_CNAME`** – The ATRAVAD WAF hostname (e.g. `waf.atravad.com`). Shown as “Point CNAME → waf.atravad.com”.

If both are set, the Applications page shows both. If neither is set, it shows: “Your administrator will provide the ATRAVAD WAF IP or CNAME.”
