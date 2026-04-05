# ATRAVA Defense â€“ Reverse Proxy + ModSecurity Assessment

## Mission

Build a **WAF powered by ModSecurity** (open-source core engine) using the **same reverse-proxy model as Sucuri**: DNS â†’ WAF proxy â†’ inspect with ModSecurity â†’ forward clean traffic to origin.

---

## 1. Sucuri-Style Architecture (What It Looks Like)

| Aspect | Sucuri | What We Need |
|--------|--------|----------------|
| **Placement** | Cloud reverse proxy in front of origin | âœ… Same |
| **Onboarding** | Customer points DNS (A/CNAME) to WAF IPs | âœ… Same |
| **Traffic path** | Client â†’ WAF â†’ (inspect) â†’ origin | âœ… Same |
| **SSL** | WAF does SSL termination | âœ… Planned (HTTPS server exists) |
| **Core engine** | Proprietary + ModSecurity-style rules | **We use ModSecurity (libmodsecurity v3) as core** |
| **Inspection** | Full request + optional response | We need **full request (incl. body) + optional Phase 4** |

---

## 2. What the Codebase Does Today

### 2.1 Reverse proxy architecture â€“ **aligned with Sucuri**

The flow in `src/lib/proxy-server.js` matches a Sucuri-style reverse proxy:

```
Client â†’ ATRAVA Defense proxy (Host-based routing) â†’ ModSecurity inspection â†’ forward to origin
```

**Implemented and consistent with that model:**

- **Domain-based routing** â€“ `Host` header â†’ application â†’ origin (see `handleRequest`, ~277â€“302).
- **Origin selection** â€“ Health checks, healthy-origin selection, weighted choice (`getHealthyOrigin`, health checks).
- **Forwarding** â€“ `forwardRequest` sends method, path, headers, body to origin with correct `Host` and `X-Forwarded-*` headers.
- **ModSecurity â€œgateâ€** â€“ Before forwarding, `inspectRequest(req, app.policyId)` runs; if blocked, respond 403 and do not forward.
- **Policy from dashboard** â€“ Policies (and `policyId`) come from Firestore; proxy loads them and uses per application.

So at the **architecture** level, the design is â€œSucuri-like reverse proxy WAF with a policy-driven inspection step before origin.â€

---

### 2.2 â€œModSecurityâ€ today â€“ **stub, not the real engine**

In `src/lib/modsecurity-proxy.js`, the **core engine is not ModSecurity**. It is a **small regex-based fallback**:

- **`inspectRequest(req, policyId)`**  
  - Loads policy from Firestore (including `modSecurityConfig`).  
  - **Does not** run that config through any ModSecurity engine.  
  - Runs a few hard-coded checks:
    - SQL-like patterns in URL and query string.
    - Scanner User-Agents (e.g. sqlmap, nikto, nmap).
  - Returns `{ allowed, blocked, matchedRules }` based only on those patterns.

So:

- **Policyâ€™s `modSecurityConfig`** (from `src/lib/modsecurity.js` and the policy API) is **stored** but **never evaluated** by ModSecurity.
- **OWASP CRS, custom rules, phase 2 body inspection, etc.** are not in the request path.
- The file explicitly states: *â€œTODO: Implement actual ModSecurity integrationâ€* and *â€œIn production, this would call ModSecurity engineâ€*.

**Conclusion:** The product is â€œreverse proxy WAF with a minimal inline rule stub,â€ not yet â€œWAF **powered by ModSecurity**.â€

---

### 2.3 Gaps that block â€œModSecurity as core engineâ€

These must be fixed so that ModSecurity is truly the core engine, Sucuri-style.

#### Gap 1: No real ModSecurity execution

- **Current:** Regex + User-Agent checks in `modsecurity-proxy.js`.
- **Needed:** Every inspected request must be run through **libmodsecurity v3** (or a process that runs ModSecurity) using the policyâ€™s config/rules.
- **Implied:** Integrate via one of:
  - Node bindings to libmodsecurity (e.g. existing Node.js bindings for ModSecurity v3), or
  - A small ModSecurity service (HTTP or stdio) that accepts request + config and returns allow/deny + match list, or
  - Spawning a ModSecurity CLI / nginx-modsecurity in a subprocess with a well-defined request/response format.

#### Gap 2: Request body not available to inspection

- **Current:** In `handleRequest`, `inspectRequest(req, app.policyId)` is called, then `forwardRequest(req, res, ...)` runs and does `clientReq.pipe(proxyReq)`. The body is never read by the proxy before inspection; it is streamed straight to the origin.
- **Consequence:** ModSecurity can only see URL and headers. All body-based rules (SQLi in POST, XSS in body, etc.) are ineffective.
- **Needed:** For methods that have a body (POST, PUT, PATCH, etc.):
  1. Buffer the request body (up to a configured limit, e.g. `SecRequestBodyLimit`).
  2. Run ModSecurity (or the stub) with **full request**: method, URI, headers, body.
  3. If allowed, forward using the **buffered** body (or a reconstructible stream) to the origin.

So the proxy must switch from â€œstream-throughâ€ to â€œbuffer â†’ inspect â†’ forwardâ€ for requests that carry a body.

#### Gap 3: Response inspection (Phase 4) not in the path

- **Current:** `ModSecurityProxy.inspectResponse` exists but is **never called** in `proxy-server.js`. Responses are `proxyRes.pipe(clientRes)` with no inspection.
- **Needed (for full ModSecurity parity):** Optionally run response inspection (Phase 4) on origin responses (e.g. status, headers, body snippet) when the policy enables it, and block or alter the response if rules fire.

#### Gap 4: Generated config is unused by the engine

- **Current:** `src/lib/modsecurity.js` produces full ModSecurity config (OWASP CRS includes, custom rules, body handling, etc.). That string is stored in Firestore as `modSecurityConfig` and loaded in `modsecurity-proxy.js`, but only used to decide â€œdo we have a policy?â€. The actual rules are never executed.
- **Needed:** When integrating the real ModSecurity engine, that `modSecurityConfig` (or an equivalent ruleset) must be what the engine loads and runs. Today it is â€œdisplay/API only.â€

#### Gap 5: Standalone / formatting helpers unused

- **Current:** `formatRequestForModSecurity` and `executeModSecurityStandalone` in `modsecurity-proxy.js` are not used anywhere in the request path.
- **Needed:** If you choose a â€œModSecurity standaloneâ€ or â€œsubprocessâ€ integration, the request must be formatted (e.g. audit-log style or a simple JSON/HTTP shape), sent to that process, and the result used to decide allow/deny. Those helpers are the right place to implement that.

---

## 3. Summary: Does It Follow the Sucuri/Reverse-Proxy Model?

| Layer | Status | Notes |
|-------|--------|--------|
| **Reverse proxy** | âœ… Yes | DNS â†’ proxy â†’ origin; Host-based routing; X-Forwarded-*; health checks. |
| **Sucuri-like flow** | âœ… Yes | Inspect-then-forward, block-at-edge, no origin changes. |
| **ModSecurity as core** | âŒ No | Inspection is a small regex stub; `modSecurityConfig` is not executed. |
| **Request body in inspection** | âŒ No | Body is never buffered before `inspectRequest`. |
| **Response inspection** | âŒ No | `inspectResponse` exists but is not called in the proxy. |

So: **architecture is Sucuri-style reverse proxy WAF; the core engine is not yet ModSecurity.**

---

## 4. Roadmap: â€œWAF Powered by ModSecurityâ€ (Sucuri-Style)

### Phase A â€“ Make the engine ModSecurity

1. **Choose integration path**
   - **Option 1:** Node bindings to libmodsecurity (e.g. [modsecurity-js](https://github.com/felipegs/modsecurity-js), [node-modsecurity](https://github.com/sjinks/node-modsecurity), or [Modsecurity-nodejs](https://github.com/manishmalik/Modsecurity-nodejs)).
   - **Option 2:** ModSecurity in a sidecar/daemon (HTTP or stdio API); proxy sends request + policy id or config, gets allow/deny + matches.
   - **Option 3:** Subprocess (e.g. nginx-modsecurity or a small C wrapper around libmodsecurity) with a clear request/response protocol.

2. **Use the generated config**
   - When a request is inspected, load the policyâ€™s `modSecurityConfig` (or a path/file reference used by the engine) and run it in the chosen integration. No more â€œpolicy exists â†’ run regexâ€; policy â†’ ModSecurity.

3. **Replace the stub**
   - In `modsecurity-proxy.js`, replace the regex/User-Agent logic with:
     - Serialize request (method, URI, headers, and body when present) into the format your ModSecurity integration expects.
     - Call that integration; map its result to `{ allowed, blocked, matchedRules }` and keep the same interface so `proxy-server.js` does not need structural changes.

### Phase B â€“ Request body in the loop

1. **Buffer before inspect (in proxy-server.js or a wrapper)**  
   - For requests with a body (Content-Length or chunked), collect the body into a buffer (respecting a max size aligned with `SecRequestBodyLimit`).
   - Call `inspectRequest` with a **request object that includes the buffered body** (or equivalent interface your ModSecurity layer expects).
   - If allowed, call `forwardRequest` with a way to send that buffered body (e.g. pass buffer to a small `ClientRequest` that writes it, or create a readable from the buffer).

2. **Avoid double stream consumption**  
   - Today `clientReq` is piped in `forwardRequest`. Once you buffer, the outgoing request must use the buffer (or a stream you create from it), not `clientReq.pipe(proxyReq)` for the same stream.

### Phase C â€“ Response inspection (Phase 4)

1. **Intercept response in `forwardRequest`**  
   - Donâ€™t `proxyRes.pipe(clientRes)` directly. Either:
     - Buffer response (or a bounded part of it) and call `inspectResponse(res, req, app.policyId)` (or equivalent that takes response headers + body), then if allowed write to `clientRes`, or  
     - Use a pass-through stream that chunks response data and calls into ModSecurity when enough is buffered (depending on how your integration exposes Phase 4).

2. **Policy flag**  
   - Only run response inspection when the application/policy has it enabled (e.g. â€œresponse inspection: onâ€ and optionally body limits).

### Phase D â€“ Harden and operate

- **Timeouts / limits** â€“ Body buffering and ModSecurity evaluation must have time and size limits so one request cannot stall or exhaust the process.
- **Fallback** â€“ If the ModSecurity engine is unavailable, define behavior (e.g. fail-open vs fail-closed) and implement it in `modsecurity-proxy.js` and/or `proxy-server.js`.
- **Logging** â€“ Ensure every block logs `matchedRules` and, if possible, the ModSecurity rule IDs and messages (same style as existing `console.warn` in `handleRequest`).

---

## 5. One-Sentence Summary

**The codebase already follows a Sucuri-style reverse proxy WAF architecture (DNS â†’ proxy â†’ inspect â†’ origin), but the â€œinspectâ€ step uses a tiny regex stub instead of the ModSecurity engine. To be a â€œWAF powered by ModSecurityâ€ like Sucuri, you need to (1) plug in real ModSecurity (libmodsecurity v3 or a service wrapping it), (2) buffer the request body and pass it into that engine before forwarding, and (3) optionally run response inspection (Phase 4) and actually use the generated `modSecurityConfig` as the ruleset that ModSecurity runs.**

This document can be used as the reference for â€œare we Sucuri-like?â€ (yes at the proxy level) and â€œis ModSecurity our core?â€ (implemented in code; see Section 6).

---

## 6. Implementation status (code completed)

The following **source code** changes implement Option 1 (Node bindings to libmodsecurity) and the phases above:

| Area | File(s) | What was implemented |
|------|---------|----------------------|
| **Standalone config** | `src/lib/modsecurity.js` | `getStandaloneConfigForProxy(fullConfig)` strips `Include` directives so policy config can be loaded via `Rules.add()` without CRS on disk. |
| **ModSecurity integration** | `src/lib/modsecurity-proxy.js` | Optional `require('modsecurity')`; uses `ModSecurity`, `Rules`, `Transaction` when available. Loads policy's `modSecurityConfig` via `getStandaloneConfigForProxy` and caches `Rules` per policy. `inspectRequest(req, policyId, bodyBuffer)` runs full transaction. `inspectResponse(responseMeta, policyId)` runs Phase 4. Fallback to regex stub when native bindings fail. Options: `bodyLimit`, `responseBodyLimit`, `inspectionTimeout`, `failOpen`, `responseInspectionEnabled`. |
| **Request body buffering** | `src/lib/proxy-server.js` | `hasRequestBody(req)`, `collectRequestBody(req, maxBytes, timeoutMs)`. For POST/PUT/PATCH with body, proxy buffers body, then `inspectRequest(req, app.policyId, bodyBuffer)`, then `forwardRequest(..., bodyBuffer)`. |
| **Forward with buffer** | `src/lib/proxy-server.js` | `forwardRequest(..., bodyBuffer)`. When `bodyBuffer != null`, writes buffer to origin and ends; otherwise pipes `clientReq` to origin. |
| **Response inspection** | `src/lib/proxy-server.js` | When policyId and modSecurity and responseInspectionEnabled, response is buffered (capped), then `inspectResponse(...)`; if blocked, client gets 502 and matchedRules. |
| **Hardening** | Both libs | Inspection timeout, body/response limits, `failOpen` (default true), block logging with `matchedRules` and `engine`. |

**Dependency:** `package.json` includes `"modsecurity": "^0.0.3"`. Native build may fail on Windows or without libmodsecurity; the proxy then uses the built-in fallback stub.

