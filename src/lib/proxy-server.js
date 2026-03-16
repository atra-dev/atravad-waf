/**
 * ATRAVAD Proxy WAF Server
 *
 * Modern reverse proxy WAF (Sucuri-style):
 * - SSL/TLS termination, domain-based routing
 * - ModSecurity (libmodsecurity) request inspection including body
 * - Buffers request body when needed, then inspects, then forwards
 * - Optional response inspection (Phase 4)
 * - Health checks and failover
 */

import http from "http";
import https from "https";
import tls from "tls";
import { URL } from "url";
import os from "os";
import { createRequire } from "module";
import { adminDb } from "./firebase-admin.js";
import { createModSecurityProxy } from "./modsecurity-proxy.js";
import { createCertStore } from "./cert-store.js";
import {
  getAcmeChallengeResponse,
  provisionCertificate,
  isLetsEncryptAvailable,
} from "./letsencrypt.js";
import { normalizeDomainInput } from "./domain-utils.js";
import { geolocateIpCached } from "./geolocation.js";
import { normalizeIpAddress } from "./ip-utils.js";
import { deriveRuleId } from "./log-rule-utils.js";

const requireMod = createRequire(import.meta.url);
let selfsigned = null;
try {
  selfsigned = requireMod("selfsigned").default || requireMod("selfsigned");
} catch {
  selfsigned = null;
}

const BODY_BUFFER_TIMEOUT_MS = 10000;
const ATRAVAD_WAF_NAME = "ATRAVAD-WAF";

function withWafFingerprintHeaders(headers = {}) {
  return {
    ...headers,
    Server: ATRAVAD_WAF_NAME,
    "X-WAF": ATRAVAD_WAF_NAME,
    "X-Firewall": ATRAVAD_WAF_NAME,
    "X-ATRAVAD-WAF": ATRAVAD_WAF_NAME,
  };
}

function renderCustomNotFoundHtml(host, path) {
  const safeHost = host || "unknown-host";
  const safePath = path || "/";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>404 Not Found | ATRAVAD-WAF</title>
  <style>
    :root {
      color-scheme: light;
      --bg-top: #f3faf9;
      --bg-bottom: #eef3fb;
      --card: #ffffff;
      --text: #0b1d2a;
      --muted: #4b5c6b;
      --border: #d8e3ef;
      --brand: #0f766e;
      --brand-soft: #d9f3f1;
      --danger: #b91c1c;
      --danger-soft: #fee2e2;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background:
        radial-gradient(circle at 12% 8%, #ddf6f3 0, transparent 40%),
        linear-gradient(160deg, var(--bg-top), var(--bg-bottom));
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .shell {
      width: min(760px, 100%);
    }
    .card {
      position: relative;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px;
      overflow: hidden;
      box-shadow:
        0 16px 36px rgba(15, 23, 42, 0.1),
        0 2px 8px rgba(15, 23, 42, 0.06);
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #0f766e 0%, #0ea5e9 100%);
    }
    .top {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .status {
      background: var(--danger-soft);
      color: var(--danger);
      border: 1px solid #fecaca;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 6px 10px;
      text-transform: uppercase;
    }
    .waf {
      display: inline-block;
      background: var(--brand-soft);
      color: var(--brand);
      border: 1px solid #99e0da;
      border-radius: 999px;
      padding: 6px 12px;
      font-weight: 600;
      font-size: 12px;
      letter-spacing: 0.02em;
    }
    h1 {
      margin: 2px 0 10px;
      font-size: clamp(30px, 6vw, 44px);
      letter-spacing: -0.02em;
      line-height: 1.05;
    }
    p {
      margin: 0;
      color: var(--muted);
      line-height: 1.6;
      font-size: 15px;
    }
    .meta {
      margin-top: 18px;
      display: grid;
      gap: 10px;
    }
    .meta-row {
      background: #f8fbff;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 13px;
      color: #334155;
    }
    .meta-label {
      display: inline-block;
      min-width: 52px;
      font-weight: 700;
      color: #0f172a;
    }
    code {
      background: #eef3fa;
      border: 1px solid #dae7f5;
      padding: 2px 7px;
      border-radius: 6px;
      color: #0f172a;
      word-break: break-all;
    }
    .hint {
      margin-top: 16px;
      font-size: 13px;
      color: #64748b;
    }
    .hint strong {
      color: #334155;
    }
    @media (max-width: 560px) {
      .card {
        padding: 20px;
      }
      .top {
        flex-wrap: wrap;
      }
      .meta-label {
        min-width: 44px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <div class="top">
        <span class="status">HTTP 404</span>
        <span class="waf">WAF: ${ATRAVAD_WAF_NAME}</span>
      </div>
      <h1>Resource Not Found</h1>
      <p>The requested URL does not exist on this protected endpoint, or the host is not mapped to an active ATRAVAD application.</p>

      <div class="meta">
        <div class="meta-row"><span class="meta-label">Host</span> <code>${safeHost}</code></div>
        <div class="meta-row"><span class="meta-label">Path</span> <code>${safePath}</code></div>
      </div>

      <p class="hint"><strong>Tip:</strong> Verify DNS routing, host header, and application domain configuration in ATRAVAD.</p>
    </section>
  </main>
</body>
</html>`;
}

function sendCustomNotFound(res, { host, path } = {}) {
  const body = renderCustomNotFoundHtml(host, path);
  res.writeHead(
    404,
    withWafFingerprintHeaders({
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(body),
      "Cache-Control": "no-store",
    }),
  );
  res.end(body);
}

function shouldReturnJsonBlockedResponse(req) {
  const pathname = req?.url?.split("?")[0] || "/";
  if (pathname.startsWith("/api/")) return true;
  const accept = String(req?.headers?.accept || "").toLowerCase();
  if (accept.includes("application/json") && !accept.includes("text/html")) return true;
  return false;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBlockedHtml({
  host,
  path,
  clientIp,
  reason,
  browser,
  blockId,
  timestamp,
  serverId,
} = {}) {
  const safeHost = escapeHtml(host || "unknown-host");
  const safePath = escapeHtml(path || "/");
  const safeIp = escapeHtml(clientIp || "unknown-ip");
  const safeReason = escapeHtml(reason || "Security policy violation");
  const safeBrowser = escapeHtml(browser || "unknown");
  const safeBlockId = escapeHtml(blockId || "WAF-403");
  const safeTime = escapeHtml(timestamp || new Date().toISOString());
  const safeServerId = escapeHtml(serverId || "atravad-waf");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>403 Access Blocked | ATRAVAD-WAF</title>
  <style>
    :root {
      color-scheme: light;
      --bg-top: #fff4f4;
      --bg-bottom: #eef3fb;
      --card: #ffffff;
      --text: #0b1d2a;
      --muted: #4b5c6b;
      --border: #f2caca;
      --brand: #0f766e;
      --brand-soft: #d9f3f1;
      --danger: #d90000;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      background:
        radial-gradient(circle at 10% 10%, #ffe0e0 0, transparent 38%),
        linear-gradient(160deg, var(--bg-top), var(--bg-bottom));
      color: var(--text);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .shell { width: min(760px, 100%); }
    .card {
      position: relative;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 26px;
      overflow: hidden;
      box-shadow:
        0 16px 36px rgba(15, 23, 42, 0.1),
        0 2px 8px rgba(15, 23, 42, 0.06);
    }
    .card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #b91c1c 0%, #f97316 100%);
    }
    h1 {
      margin: 2px 0 16px;
      font-size: clamp(30px, 6vw, 44px);
      line-height: 1.05;
    }
    .dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--danger);
      vertical-align: middle;
      margin-right: 10px;
    }
    .intro {
      margin-bottom: 22px;
      border: 1px solid var(--border);
      background: #fff7f7;
      padding: 14px 16px;
      color: var(--muted);
      line-height: 1.6;
      font-size: 15px;
    }
    .intro a {
      color: var(--brand);
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .block-title {
      margin: 0 0 12px;
      font-size: clamp(30px, 6vw, 44px);
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--text);
    }
    .details-title {
      margin: 20px 0 12px;
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #f7d4d4;
      background: #fff;
      font-size: 14px;
      border-radius: 10px;
      overflow: hidden;
    }
    td {
      border-top: 1px solid #f4dddd;
      padding: 12px 14px;
      vertical-align: top;
      color: #334155;
      word-break: break-word;
    }
    tr:first-child td {
      border-top: 0;
    }
    td:first-child {
      width: 170px;
      font-weight: 700;
      color: #0f172a;
      background: #fff7f7;
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <h1 class="block-title"><span class="dot"></span>Access Denied - ${ATRAVAD_WAF_NAME}</h1>
      <div class="intro">
        If you are the site owner (or you manage this site), please whitelist your IP or if you think this block is an error please
        <a href="mailto:support@atravad.com?subject=Access%20Denied%20Support%20Request">open a support ticket</a>
        and include the block details below so we can assist in troubleshooting.
      </div>
      <div class="details-title">Block details:</div>
      <table>
        <tr><td>Your IP:</td><td>${safeIp}</td></tr>
        <tr><td>URL:</td><td>${safeHost}${safePath}</td></tr>
        <tr><td>Your Browser:</td><td>${safeBrowser}</td></tr>
        <tr><td>Block ID:</td><td>${safeBlockId}</td></tr>
        <tr><td>Block reason:</td><td>${safeReason}</td></tr>
        <tr><td>Time:</td><td>${safeTime}</td></tr>
        <tr><td>Server ID:</td><td>${safeServerId}</td></tr>
      </table>
    </section>
  </main>
</body>
</html>`;
}

function sendBlockedResponse(res, req, { host, path, clientIp, reason, matchedRules } = {}) {
  const headers = withWafFingerprintHeaders({
    "X-ATRAVAD-Blocked": "true",
    "X-ATRAVAD-Reason": reason || "Security rule violation",
    "Cache-Control": "no-store",
  });

  if (shouldReturnJsonBlockedResponse(req)) {
    const payload = JSON.stringify({
      error: "Request blocked by WAF",
      reason: reason || "Security rule violation",
      matchedRules: matchedRules || [],
    });
    res.writeHead(403, {
      ...headers,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    });
    res.end(payload);
    return;
  }

  const blockIdFromRule = matchedRules?.[0]?.id ? `IPB-${matchedRules[0].id}` : "IPB-403";
  const normalizedReason = /ip.*block|blacklist|not\s+whitelist|ip access control/i.test(String(reason || ""))
    ? "Your request was not allowed due to IP blocking (not white listed)."
    : "Your request was blocked by the website firewall policy.";
  const serverId = `${os.hostname()}:${process.pid}`;
  const body = renderBlockedHtml({
    host,
    path,
    clientIp,
    reason: normalizedReason,
    browser: req?.headers?.["user-agent"] || "unknown",
    blockId: blockIdFromRule,
    timestamp: new Date().toISOString(),
    serverId,
  });
  res.writeHead(403, {
    ...headers,
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function looksLikeNginx404(statusCode, headers, bodyBuffer) {
  if (statusCode !== 404) return false;
  const contentType = String(headers?.["content-type"] || "").toLowerCase();
  const server = String(headers?.server || "").toLowerCase();
  if (server.includes("nginx")) return true;
  if (!contentType.includes("text/html")) return false;
  const body = (bodyBuffer || Buffer.alloc(0)).toString("utf8").toLowerCase();
  return body.includes("nginx") && body.includes("404 not found");
}

function hasRequestBody(req) {
  const method = (req.method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) return false;
  const cl = parseInt(req.headers["content-length"], 10);
  const te = (req.headers["transfer-encoding"] || "").toLowerCase();
  return (Number.isFinite(cl) && cl > 0) || te === "chunked";
}

function collectRequestBody(req, maxBytes, timeoutMs = BODY_BUFFER_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const contentLength = parseInt(req.headers["content-length"], 10);
    const isChunked =
      (req.headers["transfer-encoding"] || "").toLowerCase() === "chunked";
    if (!isChunked && !Number.isFinite(contentLength)) {
      resolve(null);
      return;
    }
    if (!isChunked && contentLength === 0) {
      resolve(Buffer.alloc(0));
      return;
    }
    const chunks = [];
    let total = 0;
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error("Request body timeout"));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      req.removeListener("data", onData);
      req.removeListener("end", onEnd);
      req.removeListener("error", onError);
    };
    const onData = (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        cleanup();
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

function extractClientIp(req) {
  const forwarded = String(req?.headers?.["x-forwarded-for"] || "");
  const firstForwarded = forwarded
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)[0];
  const rawIp = firstForwarded || req?.socket?.remoteAddress || null;
  return normalizeIpAddress(rawIp) || null;
}

function isHealthPath(pathname) {
  return pathname === "/health" || pathname === "/_atravad/health";
}

/**
 * Proxy Server Class
 */
export class ProxyWAFServer {
  constructor(options = {}) {
    this.port = options.port || 80;
    this.httpsPort = options.httpsPort || 443;
    this.applications = new Map(); // domain -> application config
    this.originHealth = new Map(); // origin URL -> health status
    this.httpServer = null;
    this.httpsServer = null;
    this.healthCheckIntervals = new Map();
    this.tenantName = options.tenantName || null;
    // Multi-tenant: support single name or comma-separated list (Firestore 'in' max 10)
    this.tenantNames = this.tenantName
      ? this.tenantName
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;
    if (this.tenantNames && this.tenantNames.length > 10) {
      console.warn(
        'ATRAVAD: Firestore "in" query limited to 10 tenants; using first 10.',
      );
      this.tenantNames = this.tenantNames.slice(0, 10);
    }
    this.modSecurity = options.modSecurity || createModSecurityProxy();
    const persistCertsToDisk =
      options.persistCertsToDisk === true ||
      process.env.CERT_STORE_PERSIST_TO_DISK === "true" ||
      process.env.CERT_STORE_PERSIST_TO_DISK === "1";
    this.certStore =
      options.certStore || createCertStore({ persistToDisk: persistCertsToDisk });
    this.getAcmeChallengeResponse =
      options.getAcmeChallengeResponse || getAcmeChallengeResponse;
    this.letsEncryptEnabled =
      options.letsEncryptEnabled !== false && isLetsEncryptAvailable;
    this.provisioningInProgress = new Set(); // domain -> avoid duplicate provision
    this.logAllowedRequests =
      options.logAllowedRequests ??
      (process.env.WAF_LOG_ALLOWED_REQUESTS !== "false" &&
        process.env.WAF_LOG_ALLOWED_REQUESTS !== "0");
    this.logHealthRequests =
      options.logHealthRequests === true ||
      process.env.WAF_LOG_HEALTH_REQUESTS === "true" ||
      process.env.WAF_LOG_HEALTH_REQUESTS === "1";

    // Load applications from Firestore
    this.loadApplications();

    // Listen for real-time updates
    this.setupRealtimeListener();
  }

  shouldLogRequest(pathname, blocked, statusCode) {
    if (!this.logHealthRequests && isHealthPath(pathname)) return false;
    if (blocked) return true;
    if (this.logAllowedRequests) return true;
    return Number.isFinite(statusCode) && statusCode >= 400;
  }

  queueSecurityLog({
    app,
    req,
    level = "info",
    severity = "INFO",
    message,
    blocked = false,
    statusCode = null,
    ruleId = null,
    ruleMessage = null,
    response = null,
  }) {
    if (!adminDb || !app?.tenantName || !req) return;
    const uri = req.url || "/";
    if (!this.shouldLogRequest(uri.split("?")[0], blocked, statusCode)) return;
    const clientIp = extractClientIp(req);
    const entry = {
      source: app.domain || "proxy-waf",
      tenantName: app.tenantName,
      timestamp: new Date().toISOString(),
      level,
      severity,
      message: message || "WAF request event",
      ruleId: deriveRuleId({ ruleId, ruleMessage, message, blocked, statusCode }),
      ruleMessage,
      request: {
        host: req.headers?.host || null,
        method: req.method || "GET",
        uri,
      },
      response,
      clientIp,
      ipAddress: clientIp,
      userAgent: req.headers?.["user-agent"] || null,
      uri,
      method: req.method || "GET",
      statusCode,
      blocked: Boolean(blocked),
      ingestedAt: new Date().toISOString(),
    };

    const writeLog = async () => {
      try {
        if (clientIp) {
          const geo = await geolocateIpCached(clientIp);
          if (geo?.success) {
            entry.geoCountry = geo.country || null;
            entry.geoCountryCode = geo.countryCode || null;
            entry.geoContinent = geo.continent || null;
            entry.geoContinentCode = geo.continentCode || null;
            entry.geoIsPrivate = Boolean(geo.isPrivate);
          }
        }
        await adminDb.collection("logs").add(entry);
      } catch (err) {
        console.warn("Failed to write security log:", err.message);
      }
    };

    void writeLog();
  }

  loadCertificateForApplication(app) {
    if (!app?.domain) return;
    const customCert = app.ssl?.customCert && app.ssl?.cert && app.ssl?.key;
    const managedCert =
      !app.ssl?.customCert &&
      app.ssl?.autoProvision &&
      app.tlsManaged?.cert &&
      app.tlsManaged?.key;

    if (customCert) {
      try {
        this.certStore.set(app.domain, {
          key: app.ssl.key,
          cert: app.ssl.cert,
          fullchain: app.ssl.fullchain || app.ssl.cert,
        });
        console.log(`Loaded custom SSL certificate for ${app.domain}`);
      } catch (err) {
        console.warn(`Failed to load custom SSL for ${app.domain}:`, err.message);
      }
      return;
    }

    if (managedCert) {
      try {
        this.certStore.set(app.domain, {
          key: app.tlsManaged.key,
          cert: app.tlsManaged.cert,
          fullchain: app.tlsManaged.fullchain || app.tlsManaged.cert,
          expiresAt: app.tlsManaged.expiresAt || null,
        });
        console.log(`Loaded managed SSL certificate for ${app.domain}`);
      } catch (err) {
        console.warn(
          `Failed to load managed SSL for ${app.domain}:`,
          err.message,
        );
      }
      return;
    }

    if (app.ssl && app.ssl.customCert === false) {
      this.certStore.remove(app.domain);
    }
  }

  async persistManagedCertificate(app, domain) {
    if (!adminDb || !app?.id || !domain) return;
    const entry = this.certStore.get(domain);
    if (!entry?.key || !entry?.cert) return;
    try {
      await adminDb
        .collection("applications")
        .doc(app.id)
        .set(
          {
            tlsManaged: {
              key: entry.key,
              cert: entry.cert,
              fullchain: entry.fullchain || entry.cert,
              expiresAt: entry.expiresAt || null,
              source: "letsencrypt",
              updatedAt: new Date().toISOString(),
            },
          },
          { merge: true },
        );
    } catch (error) {
      console.warn(
        `Failed to persist managed certificate for ${domain}:`,
        error.message,
      );
    }
  }

  async ensureManagedCertificate(app) {
    const domain = app?.domain;
    if (!domain) return false;
    if (this.certStore.hasValidCert(domain)) return true;
    const result = await provisionCertificate(domain, { certStore: this.certStore });
    if (!result.success) {
      throw new Error(result.error || "certificate provisioning failed");
    }
    await this.persistManagedCertificate(app, domain);
    return true;
  }

  /**
   * Load policy for an application
   */
  async loadPolicyForApplication(app) {
    if (!app.policyId || !this.modSecurity) {
      return;
    }

    try {
      const policy = await this.modSecurity.loadPolicy(app.policyId);
      if (policy) {
        console.log(
          `Loaded policy "${policy.name}" for application ${app.domain}`,
        );
      } else {
        console.warn(
          `Policy ${app.policyId} not found for application ${app.domain}`,
        );
      }
    } catch (error) {
      console.error(
        `Error loading policy for application ${app.domain}:`,
        error,
      );
    }
  }

  /**
   * Load applications from Firestore
   */
  async loadApplications() {
    try {
      if (!adminDb) {
        console.warn(
          "Firebase Admin not initialized, proxy server will use in-memory config",
        );
        return;
      }

      const tenantNames = this.tenantNames;
      if (tenantNames?.length) {
        console.log(
          `Loading applications for tenant(s): ${tenantNames.join(", ")}`,
        );
      } else {
        console.log("Loading all applications (no tenant filter)");
      }

      // Load applications (filtered by tenant(s) if set)
      let appsSnapshot;
      if (tenantNames?.length === 1) {
        appsSnapshot = await adminDb
          .collection("applications")
          .where("tenantName", "==", tenantNames[0])
          .get();
      } else if (tenantNames?.length > 1) {
        appsSnapshot = await adminDb
          .collection("applications")
          .where("tenantName", "in", tenantNames)
          .get();
      } else {
        appsSnapshot = await adminDb.collection("applications").get();
      }

      for (const doc of appsSnapshot.docs) {
        const app = { id: doc.id, ...doc.data() };
        if (app.domain) {
          const normalizedDomain = normalizeDomainInput(app.domain);
          if (normalizedDomain) {
            app.domain = normalizedDomain;
            this.applications.set(normalizedDomain, app);
            console.log(`Loaded application: ${normalizedDomain}`);
          }
          this.loadCertificateForApplication(app);

          // Load policy if assigned
          await this.loadPolicyForApplication(app);

          // Start health checks for origins
          if (app.origins && Array.isArray(app.origins)) {
            app.origins.forEach((origin) => {
              this.startHealthCheck(origin);
            });
          }
        }
      }

      console.log(`Loaded ${this.applications.size} application(s)`);

      if (this.letsEncryptEnabled) {
        this.triggerAutoProvision();
      }
    } catch (error) {
      console.error("Error loading applications:", error);
    }
  }

  /**
   * Trigger Let's Encrypt provisioning for apps with ssl.autoProvision and no valid cert.
   */
  async triggerAutoProvision() {
    for (const [domain, app] of this.applications) {
      if (app.ssl?.customCert) continue;
      const autoProvision =
        app.ssl &&
        (app.ssl.autoProvision === true || app.ssl?.autoProvision === true);
      if (!autoProvision || this.provisioningInProgress.has(domain)) continue;
      if (this.certStore.hasValidCert(domain)) continue;
      this.provisioningInProgress.add(domain);
      this.ensureManagedCertificate(app)
        .then((ok) => {
          if (ok)
            console.log(`Let's Encrypt: provisioned certificate for ${domain}`);
        })
        .catch((err) =>
          console.warn(
            `Let's Encrypt: provision failed for ${domain}`,
            err.message,
          ),
        )
        .finally(() => this.provisioningInProgress.delete(domain));
    }
  }

  /**
   * Setup real-time listener for application changes (tenant-scoped when tenantName is set)
   */
  setupRealtimeListener() {
    if (!adminDb) return;

    const tenantNames = this.tenantNames;
    let applicationsRef;
    if (tenantNames?.length === 1) {
      applicationsRef = adminDb
        .collection("applications")
        .where("tenantName", "==", tenantNames[0]);
    } else if (tenantNames?.length > 1) {
      applicationsRef = adminDb
        .collection("applications")
        .where("tenantName", "in", tenantNames);
    } else {
      applicationsRef = adminDb.collection("applications");
    }

    applicationsRef.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const app = { id: change.doc.id, ...change.doc.data() };

        if (change.type === "added" || change.type === "modified") {
          if (app.domain) {
            const normalizedDomain = normalizeDomainInput(app.domain);
            if (!normalizedDomain) return;
            app.domain = normalizedDomain;
            this.applications.set(normalizedDomain, app);
            console.log(`Application updated: ${normalizedDomain}`);
            this.loadCertificateForApplication(app);

            if (
              this.letsEncryptEnabled &&
              !app.ssl?.customCert &&
              app.ssl?.autoProvision &&
              !this.provisioningInProgress.has(normalizedDomain) &&
              !this.certStore.hasValidCert(normalizedDomain)
            ) {
              this.provisioningInProgress.add(normalizedDomain);
              this.ensureManagedCertificate(app)
                .then((ok) => {
                  if (ok)
                    console.log(
                      `Let's Encrypt: provisioned certificate for ${normalizedDomain}`,
                    );
                })
                .catch((err) =>
                  console.warn(
                    `Let's Encrypt: provision failed for ${normalizedDomain}`,
                    err.message,
                  ),
                )
                .finally(() => this.provisioningInProgress.delete(normalizedDomain));
            }

            // Load policy if assigned
            this.loadPolicyForApplication(app).catch((error) => {
              console.error(`Error loading policy for ${app.domain}:`, error);
            });

            // Start health checks for origins
            if (app.origins && Array.isArray(app.origins)) {
              app.origins.forEach((origin) => {
                this.startHealthCheck(origin);
              });
            }
          }
        } else if (change.type === "removed") {
          const normalizedDomain = normalizeDomainInput(app.domain);
          if (normalizedDomain) {
            this.applications.delete(normalizedDomain);
            this.certStore.remove(normalizedDomain);
          }
          console.log(`Application removed: ${normalizedDomain || app.domain}`);
        }
      });
    });
  }

  /**
   * Start health check for an origin server
   */
  startHealthCheck(origin) {
    if (!origin.url || !origin.healthCheck) return;

    const originUrl = origin.url;
    const healthCheck = origin.healthCheck;
    const checkPath = healthCheck.path || "/health";
    const interval = (healthCheck.interval || 30) * 1000; // Convert to ms
    const timeout = (healthCheck.timeout || 5) * 1000;

    // Stop existing health check if any
    if (this.healthCheckIntervals.has(originUrl)) {
      clearInterval(this.healthCheckIntervals.get(originUrl));
    }

    // Initial health check
    this.performHealthCheck(originUrl, checkPath, timeout);

    // Periodic health checks
    const intervalId = setInterval(() => {
      this.performHealthCheck(originUrl, checkPath, timeout);
    }, interval);

    this.healthCheckIntervals.set(originUrl, intervalId);
  }

  /**
   * Perform a single health check
   */
  async performHealthCheck(originUrl, checkPath, timeout) {
    try {
      const url = new URL(originUrl);
      const healthUrl = `${url.protocol}//${url.host}${checkPath}`;

      const requestOptions = {
        method: "GET",
        timeout,
        headers: {
          "User-Agent": "ATRAVAD-WAF-HealthCheck/1.0",
        },
      };

      const protocol = url.protocol === "https:" ? https : http;

      const req = protocol.request(healthUrl, requestOptions, (res) => {
        const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
        this.originHealth.set(originUrl, {
          healthy: isHealthy,
          lastCheck: new Date().toISOString(),
          statusCode: res.statusCode,
        });

        if (!isHealthy) {
          console.warn(
            `Origin ${originUrl} health check failed: ${res.statusCode}`,
          );
        }
      });

      req.on("error", (error) => {
        this.originHealth.set(originUrl, {
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: error.message,
        });
        console.warn(`Origin ${originUrl} health check error:`, error.message);
      });

      req.on("timeout", () => {
        req.destroy();
        this.originHealth.set(originUrl, {
          healthy: false,
          lastCheck: new Date().toISOString(),
          error: "Timeout",
        });
        console.warn(`Origin ${originUrl} health check timeout`);
      });

      req.end();
    } catch (error) {
      this.originHealth.set(originUrl, {
        healthy: false,
        lastCheck: new Date().toISOString(),
        error: error.message,
      });
      console.error(`Health check error for ${originUrl}:`, error);
    }
  }

  /**
   * Get healthy origin for an application
   */
  getHealthyOrigin(app) {
    if (
      !app.origins ||
      !Array.isArray(app.origins) ||
      app.origins.length === 0
    ) {
      return null;
    }

    // Filter healthy origins
    const healthyOrigins = app.origins.filter((origin) => {
      const health = this.originHealth.get(origin.url);
      return health && health.healthy !== false; // Default to healthy if not checked yet
    });

    if (healthyOrigins.length === 0) {
      // No healthy origins, use first one anyway (circuit breaker could be added)
      return app.origins[0];
    }

    // Weighted selection (simple round-robin for now, can be enhanced)
    // Sort by weight (descending) and return first healthy
    healthyOrigins.sort((a, b) => (b.weight || 100) - (a.weight || 100));
    return healthyOrigins[0];
  }

  /**
   * Handle incoming HTTP request
   * Serves ACME HTTP-01 challenge first, then buffers request body when needed for ModSecurity, then forwards.
   */
  async handleRequest(req, res) {
    try {
      const pathname = req.url?.split("?")[0] || "/";

      // Health check for load balancers and data-center orchestration (any Host)
      if (pathname === "/health" || pathname === "/_atravad/health") {
        res.writeHead(
          200,
          withWafFingerprintHeaders({ "Content-Type": "application/json" }),
        );
        res.end(
          JSON.stringify({
            status: "ok",
            service: "atravad-waf",
            tenant: this.tenantName || "all",
            tenants: this.tenantNames?.length ? this.tenantNames.length : null,
            applications: this.applications.size,
          }),
        );
        return;
      }

      const host = normalizeDomainInput(req.headers.host?.split(":")[0] || "");
      if (!host) {
        res.writeHead(
          400,
          withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
        );
        res.end("Missing Host header");
        return;
      }

      if (
        this.getAcmeChallengeResponse &&
        pathname.startsWith("/.well-known/acme-challenge/")
      ) {
        const token = pathname
          .slice("/.well-known/acme-challenge/".length)
          .trim();
        const keyAuthorization = this.getAcmeChallengeResponse(token);
        if (keyAuthorization) {
          res.writeHead(
            200,
            withWafFingerprintHeaders({
              "Content-Type": "text/plain; charset=utf-8",
            }),
          );
          res.end(keyAuthorization);
          return;
        }
      }

      const app = this.applications.get(host);
      if (!app) {
        sendCustomNotFound(res, { host, path: req.url });
        return;
      }

      const origin = this.getHealthyOrigin(app);
      if (!origin || !origin.url) {
        res.writeHead(
          503,
          withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
        );
        res.end("No origin server configured");
        return;
      }

      let bodyBuffer = null;
      if (app.policyId && this.modSecurity && hasRequestBody(req)) {
        try {
          const limit =
            typeof this.modSecurity.getBodyLimit === "function"
              ? this.modSecurity.getBodyLimit()
              : 13107200;
          bodyBuffer = await collectRequestBody(
            req,
            limit,
            BODY_BUFFER_TIMEOUT_MS,
          );
        } catch (err) {
          console.warn("Request body buffer error:", err.message);
          if (!res.headersSent) {
            res.writeHead(
              413,
              withWafFingerprintHeaders({ "Content-Type": "application/json" }),
            );
            res.end(
              JSON.stringify({ error: "Request body too large or timeout" }),
            );
          }
          return;
        }
      }

      if (app.policyId && this.modSecurity) {
        const inspection = await this.modSecurity.inspectRequest(
          req,
          app.policyId,
          bodyBuffer,
        );
        if (!inspection.allowed || inspection.blocked) {
          const topRule = inspection.matchedRules?.[0] || null;
          sendBlockedResponse(res, req, {
            host,
            path: req.url,
            clientIp: extractClientIp(req),
            reason: topRule?.message || "Security rule violation",
            matchedRules: inspection.matchedRules,
          });
          console.warn(`Request blocked for ${host}:`, {
            url: req.url,
            method: req.method,
            matchedRules: inspection.matchedRules,
            engine: inspection.engine,
          });
          this.queueSecurityLog({
            app,
            req,
            level: "warn",
            severity: "CRITICAL",
            message: `Request blocked by WAF for ${host}`,
            blocked: true,
            statusCode: 403,
            ruleId: topRule?.id || null,
            ruleMessage: topRule?.message || null,
            response: { statusCode: 403, engine: inspection.engine || null },
          });
          return;
        }
      }

      await this.forwardRequest(req, res, origin.url, app, bodyBuffer);
    } catch (error) {
      console.error("Error handling request:", error);
      if (!res.headersSent) {
        res.writeHead(
          500,
          withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
        );
        res.end("Internal server error");
      }
    }
  }

  /**
   * Forward request to origin server.
   * @param {object} clientReq - Incoming request
   * @param {object} clientRes - Response to client
   * @param {string} originUrl - Origin base URL
   * @param {object} app - Application config (policyId, etc.)
   * @param {Buffer|null} bodyBuffer - Buffered request body when already consumed for inspection
   */
  forwardRequest(clientReq, clientRes, originUrl, app, bodyBuffer = null) {
    try {
      const originUrlObj = new URL(originUrl);
      const targetPath = clientReq.url;

      const requestOptions = {
        method: clientReq.method,
        hostname: originUrlObj.hostname,
        port:
          originUrlObj.port || (originUrlObj.protocol === "https:" ? 443 : 80),
        path: targetPath + (originUrlObj.search || ""),
        headers: { ...clientReq.headers },
      };

      delete requestOptions.headers["connection"];
      delete requestOptions.headers["host"];
      delete requestOptions.headers["transfer-encoding"];
      delete requestOptions.headers["upgrade"];
      requestOptions.headers["host"] = originUrlObj.host;
      requestOptions.headers["x-forwarded-for"] =
        (clientReq.headers["x-forwarded-for"] || "") +
        (clientReq.headers["x-forwarded-for"] ? ", " : "") +
        (clientReq.socket.remoteAddress || "unknown");
      requestOptions.headers["x-forwarded-proto"] = clientReq.secure
        ? "https"
        : "http";
      requestOptions.headers["x-forwarded-host"] = clientReq.headers.host;

      const protocol = originUrlObj.protocol === "https:" ? https : http;
      const doResponseInspection = Boolean(
        app.policyId &&
        this.modSecurity &&
        app.responseInspectionEnabled !== false &&
        this.modSecurity.responseInspectionEnabled !== false,
      );
      const responseBodyLimit =
        typeof this.modSecurity?.getResponseBodyLimit === "function"
          ? this.modSecurity.getResponseBodyLimit()
          : 524288;
      const logProxyResult = ({
        statusCode,
        blocked = false,
        level = "info",
        severity = "INFO",
        message,
        ruleId = null,
        ruleMessage = null,
      }) => {
        this.queueSecurityLog({
          app,
          req: clientReq,
          level,
          severity,
          message:
            message ||
            `${clientReq.method || "GET"} ${clientReq.url || "/"} -> ${statusCode || "unknown"}`,
          blocked,
          statusCode: Number.isFinite(statusCode) ? statusCode : null,
          ruleId,
          ruleMessage,
          response: {
            statusCode: Number.isFinite(statusCode) ? statusCode : null,
            origin: originUrlObj.host,
          },
        });
      };

      const proxyReq = protocol.request(requestOptions, (proxyRes) => {
        if (doResponseInspection) {
          const chunks = [];
          let total = 0;
          proxyRes.on("data", (chunk) => {
            if (total < responseBodyLimit) {
              const want = Math.min(chunk.length, responseBodyLimit - total);
              chunks.push(chunk.subarray(0, want));
            }
            total += chunk.length;
          });
          proxyRes.on("end", async () => {
            const body = Buffer.concat(chunks);
            try {
              const inspection = await this.modSecurity.inspectResponse(
                {
                  statusCode: proxyRes.statusCode,
                  httpVersion: proxyRes.httpVersion || "1.1",
                  headers: proxyRes.headers,
                  rawHeaders: proxyRes.rawHeaders || [],
                  body,
                },
                app.policyId,
              );
              if (!inspection.allowed) {
                if (!clientRes.headersSent) {
                  clientRes.writeHead(502, {
                    "Content-Type": "application/json",
                    ...withWafFingerprintHeaders(),
                  });
                  clientRes.end(
                    JSON.stringify({
                      error: "Response blocked by WAF",
                      matchedRules: inspection.matchedRules || [],
                    }),
                  );
                }
                const topRule = inspection.matchedRules?.[0] || null;
                logProxyResult({
                  statusCode: 502,
                  blocked: true,
                  level: "warn",
                  severity: "CRITICAL",
                  message: `Response blocked by WAF for ${clientReq.headers.host || "unknown-host"}`,
                  ruleId: topRule?.id || null,
                  ruleMessage: topRule?.message || null,
                });
                return;
              }
            } catch (err) {
              console.warn("Response inspection error:", err.message);
            }
            if (looksLikeNginx404(proxyRes.statusCode, proxyRes.headers, body)) {
              sendCustomNotFound(clientRes, {
                host: clientReq.headers.host?.split(":")[0],
                path: clientReq.url,
              });
              return;
            }
            if (!clientRes.headersSent) {
              clientRes.writeHead(
                proxyRes.statusCode,
                withWafFingerprintHeaders(proxyRes.headers),
              );
              clientRes.end(body);
            }
            logProxyResult({
              statusCode: proxyRes.statusCode,
              level: proxyRes.statusCode >= 500 ? "error" : "info",
              severity:
                proxyRes.statusCode >= 500
                  ? "HIGH"
                  : proxyRes.statusCode >= 400
                    ? "MEDIUM"
                    : "INFO",
            });
          });
          proxyRes.on("error", (err) => {
            console.error("Proxy response error:", err);
            logProxyResult({
              statusCode: 502,
              level: "error",
              severity: "HIGH",
              message: `Proxy response error: ${err.message}`,
            });
            if (!clientRes.headersSent) {
              clientRes.writeHead(
                502,
                withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
              );
              clientRes.end("Bad Gateway");
            }
          });
        } else {
          if (proxyRes.statusCode === 404) {
            const chunks = [];
            proxyRes.on("data", (chunk) => chunks.push(chunk));
            proxyRes.on("end", () => {
              const body = Buffer.concat(chunks);
              if (
                looksLikeNginx404(proxyRes.statusCode, proxyRes.headers, body)
              ) {
                sendCustomNotFound(clientRes, {
                  host: clientReq.headers.host?.split(":")[0],
                  path: clientReq.url,
                });
                return;
              }
              if (!clientRes.headersSent) {
                clientRes.writeHead(
                  proxyRes.statusCode,
                  withWafFingerprintHeaders(proxyRes.headers),
                );
              }
              clientRes.end(body);
              logProxyResult({
                statusCode: proxyRes.statusCode,
                level: proxyRes.statusCode >= 500 ? "error" : "info",
                severity:
                  proxyRes.statusCode >= 500
                    ? "HIGH"
                    : proxyRes.statusCode >= 400
                      ? "MEDIUM"
                      : "INFO",
              });
            });
            proxyRes.on("error", (err) => {
              console.error("Proxy response error:", err);
              logProxyResult({
                statusCode: 502,
                level: "error",
                severity: "HIGH",
                message: `Proxy response error: ${err.message}`,
              });
              if (!clientRes.headersSent) {
                clientRes.writeHead(
                  502,
                  withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
                );
                clientRes.end("Bad Gateway");
              }
            });
            return;
          }
          if (!clientRes.headersSent) {
            clientRes.writeHead(
              proxyRes.statusCode,
              withWafFingerprintHeaders(proxyRes.headers),
            );
          }
          proxyRes.pipe(clientRes);
          logProxyResult({
            statusCode: proxyRes.statusCode,
            level: proxyRes.statusCode >= 500 ? "error" : "info",
            severity:
              proxyRes.statusCode >= 500
                ? "HIGH"
                : proxyRes.statusCode >= 400
                  ? "MEDIUM"
                  : "INFO",
          });
        }
      });

      proxyReq.on("error", (error) => {
        console.error("Proxy request error:", error);
        logProxyResult({
          statusCode: 502,
          level: "error",
          severity: "HIGH",
          message: `Proxy request error: ${error.message}`,
        });
        if (!clientRes.headersSent) {
          clientRes.writeHead(
            502,
            withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
          );
          clientRes.end("Bad Gateway: Origin server error");
        }
      });

      if (bodyBuffer && bodyBuffer.length >= 0) {
        proxyReq.write(bodyBuffer);
        proxyReq.end();
      } else {
        clientReq.pipe(proxyReq);
      }
    } catch (error) {
      console.error("Error forwarding request:", error);
      if (!clientRes.headersSent) {
        clientRes.writeHead(
          502,
          withWafFingerprintHeaders({ "Content-Type": "text/plain" }),
        );
        clientRes.end("Bad Gateway");
      }
    }
  }

  /**
   * Start HTTP server
   */
  startHttpServer() {
    this.httpServer = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    this.httpServer.listen(this.port, () => {
      console.log(
        `ATRAVAD Proxy WAF HTTP server listening on port ${this.port}`,
      );
    });

    this.httpServer.on("error", (error) => {
      console.error("HTTP server error:", error);
    });
  }

  /**
   * Build default key/cert and secure context for SNI fallback (self-signed or first cert in store).
   */
  _getDefaultSecureContext() {
    if (this._defaultSecureContext) return this._defaultSecureContext;
    const domains = this.certStore.listDomains();
    if (domains.length > 0) {
      const entry = this.certStore.get(domains[0]);
      if (entry) {
        this._defaultKeyCert = {
          key: entry.key,
          cert: entry.fullchain || entry.cert,
        };
        this._defaultSecureContext = tls.createSecureContext(
          this._defaultKeyCert,
        );
        return this._defaultSecureContext;
      }
    }
    if (selfsigned) {
      const attrs = [{ name: "commonName", value: "localhost" }];
      const pems = selfsigned.generate(attrs, { days: 365, keySize: 2048 });
      this._defaultKeyCert = { key: pems.private, cert: pems.cert };
      this._defaultSecureContext = tls.createSecureContext(
        this._defaultKeyCert,
      );
      return this._defaultSecureContext;
    }
    return null;
  }

  /**
   * Start HTTPS server with SNI (certificate per domain from certStore).
   */
  startHttpsServer(sslOptions = {}) {
    const defaultContext = this._getDefaultSecureContext();
    const certStore = this.certStore;
    const defaultKeyCert = this._defaultKeyCert || {};

    const serverOptions = {
      key: sslOptions.key || defaultKeyCert.key,
      cert: sslOptions.cert || defaultKeyCert.cert,
      SNICallback: (servername, cb) => {
        const entry = certStore.get(servername);
        if (entry && entry.key && (entry.fullchain || entry.cert)) {
          try {
            const ctx = tls.createSecureContext({
              key: entry.key,
              cert: entry.fullchain || entry.cert,
            });
            return cb(null, ctx);
          } catch (err) {
            console.warn(
              "SNI secure context failed for",
              servername,
              err.message,
            );
          }
        }
        cb(null, defaultContext);
      },
    };

    if (!serverOptions.key || !serverOptions.cert) {
      console.warn(
        "HTTPS: no default key/cert; SNI will still work for provisioned domains",
      );
    }

    this.httpsServer = https.createServer(serverOptions, (req, res) => {
      this.handleRequest(req, res);
    });

    this.httpsServer.listen(this.httpsPort, () => {
      console.log(
        `ATRAVAD Proxy WAF HTTPS server listening on port ${this.httpsPort} (SNI + Let's Encrypt)`,
      );
    });

    this.httpsServer.on("error", (error) => {
      console.error("HTTPS server error:", error);
    });
  }

  /**
   * Start the proxy server
   */
  start(sslOptions = {}) {
    this.startHttpServer();

    if (sslOptions && (sslOptions.key || sslOptions.cert)) {
      this.startHttpsServer(sslOptions);
    } else if (this.letsEncryptEnabled && this._getDefaultSecureContext()) {
      this.startHttpsServer();
    }
    console.log("ATRAVAD Proxy WAF server started");
  }

  /**
   * Stop the proxy server
   */
  stop() {
    // Stop health checks
    this.healthCheckIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.healthCheckIntervals.clear();

    // Stop servers
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.httpsServer) {
      this.httpsServer.close();
    }

    console.log("ATRAVAD Proxy WAF server stopped");
  }
}

/**
 * Create and start proxy server instance
 */
export function createProxyServer(options = {}) {
  const server = new ProxyWAFServer({
    ...options,
    persistCertsToDisk:
      options.persistCertsToDisk === true ||
      process.env.CERT_STORE_PERSIST_TO_DISK === "true" ||
      process.env.CERT_STORE_PERSIST_TO_DISK === "1",
  });
  server.start(options.ssl);
  return server;
}
