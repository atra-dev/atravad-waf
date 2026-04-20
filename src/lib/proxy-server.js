/**
 * ATRAVA Defense Proxy Server
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
import {
  buildForwardedForHeader,
  normalizeIpAddress,
  resolveClientIp,
} from "./ip-utils.js";
import { deriveRuleId } from "./log-rule-utils.js";
import { persistSecurityLog } from "./log-storage.js";
import { getDefaultOriginServername } from "./origin-utils.js";
import {
  getTrafficLoggingConfig,
} from "./traffic-logging.js";

const requireMod = createRequire(import.meta.url);
let selfsigned = null;
try {
  selfsigned = requireMod("selfsigned").default || requireMod("selfsigned");
} catch {
  selfsigned = null;
}

const BODY_BUFFER_TIMEOUT_MS = 10000;
const ATRAVAD_WAF_NAME = "ATRAVA Defense";

function withWafFingerprintHeaders(headers = {}) {
  return {
    ...headers,
    Server: ATRAVAD_WAF_NAME,
    "X-WAF": ATRAVAD_WAF_NAME,
    "X-Firewall": ATRAVAD_WAF_NAME,
    "X-ATRAVA-Defense": ATRAVAD_WAF_NAME,
  };
}

function sanitizeHeaderValue(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

function sanitizeHeaderMap(headers = {}) {
  const nextHeaders = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const safeKey = String(key || "").trim();
    if (!safeKey) continue;
    if (Array.isArray(value)) {
      nextHeaders[safeKey] = value.map((entry) => sanitizeHeaderValue(entry));
      continue;
    }
    nextHeaders[safeKey] = sanitizeHeaderValue(value);
  }
  return nextHeaders;
}

function renderCustomNotFoundHtml(host, path) {
  const safeHost = host || "unknown-host";
  const safePath = path || "/";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>404 Not Found | ATRAVA Defense</title>
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
      <p>The requested URL does not exist on this protected endpoint, or the host is not mapped to an active ATRAVA Defense application.</p>

      <div class="meta">
        <div class="meta-row"><span class="meta-label">Host</span> <code>${safeHost}</code></div>
        <div class="meta-row"><span class="meta-label">Path</span> <code>${safePath}</code></div>
      </div>

      <p class="hint"><strong>Tip:</strong> Verify DNS routing, host header, and application domain configuration in ATRAVA Defense.</p>
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
  if (accept.includes("application/json") && !accept.includes("text/html"))
    return true;
  return false;
}

function getBlockedReasonType(reason = "") {
  const rawReason = String(reason || "");
  if (
    /ip.*block|blacklist|not\s+whitelist|ip access control/i.test(rawReason)
  ) {
    return "ip";
  }
  if (
    /geographic blocking|blocked country|non-allowed country|geo-blocking/i.test(
      rawReason,
    )
  ) {
    return "geo";
  }
  return "waf";
}

function isStaticAssetBypassCandidate(req) {
  const pathname = req?.url?.split("?")[0] || "/";
  return pathname.startsWith("/_next/static/");
}

function shouldBypassStaticAssetBlocking(req, matchedRules = [], reason = "") {
  if (!isStaticAssetBypassCandidate(req)) return false;
  const effectiveReason = reason || matchedRules?.[0]?.message || "";
  const type = getBlockedReasonType(effectiveReason);
  return type === "geo" || type === "ip";
}

function mergeVaryHeader(currentValue, additions = []) {
  const values = new Map();
  const pushValue = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return;
    values.set(normalized.toLowerCase(), normalized);
  };

  String(currentValue || "")
    .split(",")
    .forEach((entry) => pushValue(entry));
  additions.forEach((entry) => pushValue(entry));

  return Array.from(values.values()).join(", ");
}

/**
 * Vercel Security Checkpoint (bot protection) runs challenge.v2.min.js which uses eval().
 * CSP script-src must include 'unsafe-eval' or verification fails with Code 11.
 */
function ensureScriptSrcAllowsUnsafeEval(csp) {
  if (!csp || typeof csp !== "string") return csp;
  if (csp.includes("'unsafe-eval'") || csp.includes('"unsafe-eval"')) {
    return csp;
  }
  return csp
    .split(/\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) =>
      /^script-src\s/i.test(part) ? `${part} 'unsafe-eval'` : part,
    )
    .join("; ");
}

function isHtmlNavigationRequest(req) {
  const method = String(req?.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  const pathname = req?.url?.split("?")[0] || "/";
  if (pathname.startsWith("/api/")) return false;
  if (pathname.startsWith("/_next/")) return false;
  if (pathname.startsWith("/.well-known/")) return false;

  const accept = String(req?.headers?.accept || "").toLowerCase();
  if (accept.includes("text/html")) return true;

  return !/\.[a-z0-9]+$/i.test(pathname);
}

function isProtectedHtmlDocumentResponse(req, headers = {}) {
  if (!isHtmlNavigationRequest(req)) return false;
  const contentType = String(
    headers?.["content-type"] || headers?.["Content-Type"] || "",
  ).toLowerCase();
  return !contentType || contentType.includes("text/html");
}

function applyProtectedDocumentHeaders(req, headers = {}, app = null) {
  if (!app?.policyId || !isProtectedHtmlDocumentResponse(req, headers)) {
    return headers;
  }

  const authScriptSources =
    "https://apis.google.com https://accounts.google.com https://www.gstatic.com";
  const authConnectSources =
    "https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://*.googleapis.com https://*.gstatic.com https://www.gstatic.com https://*.firebaseio.com https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";
  const authFrameSources =
    "'self' https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";
  const authChildSources =
    "'self' blob: https://accounts.google.com https://apis.google.com https://*.firebaseapp.com https://*.web.app";

  const originalCsp = sanitizeHeaderValue(
    headers["Content-Security-Policy"] || headers["content-security-policy"],
  );
  const originalXFrameOptions = sanitizeHeaderValue(
    headers["X-Frame-Options"] || headers["x-frame-options"],
  );
  const originalXssProtection = sanitizeHeaderValue(
    headers["X-XSS-Protection"] || headers["x-xss-protection"],
  );
  const originalHsts = sanitizeHeaderValue(
    headers["Strict-Transport-Security"] || headers["strict-transport-security"],
  );

  const nextHeaders = sanitizeHeaderMap(headers);
  delete nextHeaders.etag;
  delete nextHeaders.ETag;
  delete nextHeaders["last-modified"];
  delete nextHeaders["Last-Modified"];
  delete nextHeaders.expires;
  delete nextHeaders.Expires;
  delete nextHeaders.age;
  delete nextHeaders.Age;
  delete nextHeaders["x-frame-options"];
  delete nextHeaders["x-xss-protection"];
  delete nextHeaders["content-security-policy"];
  delete nextHeaders["strict-transport-security"];

  nextHeaders["Cache-Control"] =
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, private";
  nextHeaders.Pragma = "no-cache";
  nextHeaders.Expires = "0";
  nextHeaders["Surrogate-Control"] = "no-store";
  nextHeaders["CDN-Cache-Control"] = "no-store";
  nextHeaders["X-ATRAVAD-Document-Cache"] = "bypass";
  nextHeaders.Vary = mergeVaryHeader(nextHeaders.Vary || nextHeaders.vary, [
    "Accept",
    "Accept-Encoding",
    "X-Geo-Country",
    "X-ATRAVAD-Geo-Country",
    "CF-IPCountry",
    "X-Vercel-IP-Country",
  ]);
  nextHeaders["X-Content-Type-Options"] = "nosniff";
  nextHeaders["Referrer-Policy"] = "strict-origin-when-cross-origin";
  nextHeaders["Permissions-Policy"] =
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()';
  nextHeaders["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups";
  nextHeaders["Cross-Origin-Resource-Policy"] = "same-site";
  nextHeaders["Origin-Agent-Cluster"] = "?1";
  nextHeaders["X-Frame-Options"] = originalXFrameOptions || "DENY";

  if (!originalXssProtection || originalXssProtection === "0") {
    nextHeaders["X-XSS-Protection"] = "1; mode=block";
  }

  if (originalCsp) {
    nextHeaders["Content-Security-Policy"] =
      ensureScriptSrcAllowsUnsafeEval(originalCsp);
  } else {
    nextHeaders["Content-Security-Policy"] =
      `default-src 'self'; base-uri 'self'; form-action 'self' https://accounts.google.com; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${authScriptSources}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://flagcdn.com https://www.gravatar.com; font-src 'self' data:; connect-src 'self' https://cdn.jsdelivr.net ${authConnectSources}; worker-src 'self' blob:; manifest-src 'self'; frame-src ${authFrameSources}; media-src 'self'; child-src ${authChildSources}; upgrade-insecure-requests`;
  }

  if (req?.secure || req?.socket?.encrypted) {
    if (!originalHsts) {
      nextHeaders["Strict-Transport-Security"] =
        "max-age=63072000; includeSubDomains; preload";
    } else {
      nextHeaders["Strict-Transport-Security"] = originalHsts;
    }
  }

  return nextHeaders;
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
  proxyIp,
  forwardedFor,
  reason,
  browser,
  blockId,
  timestamp,
  serverId,
  blockType,
} = {}) {
  const safeHost = escapeHtml(host || "unknown-host");
  const safePath = escapeHtml(path || "/");
  const safeIp = escapeHtml(clientIp || "unknown-ip");
  const safeReason = escapeHtml(reason || "Security policy violation");
  const safeBrowser = escapeHtml(browser || "unknown");
  const safeBlockId = escapeHtml(blockId || "WAF-403");
  const safeTime = escapeHtml(timestamp || new Date().toISOString());
  const safeServerId = escapeHtml(serverId || "atrava-defense");
  const normalizedBlockType = String(blockType || "waf").toLowerCase();
  const isGeoBlocked = normalizedBlockType === "geo";
  const pageTitle = isGeoBlocked
    ? "403 Geographic Access Restricted | ATRAVA Defense"
    : "403 Access Blocked | ATRAVA Defense";
  const heroTitle = isGeoBlocked
    ? "Geographic Access Restricted - ATRAVA Defense"
    : `Access Denied - ${ATRAVAD_WAF_NAME}`;
  const introMessage = isGeoBlocked
    ? `Access from your country or region is not allowed by this site's security policy. If you believe this is a mistake, contact the site owner or
        <a href="mailto:support@atravad.com?subject=Geo%20Access%20Blocked%20Support%20Request">open a support ticket</a>
        and include the block details below.`
    : `If you are the site owner (or you manage this site), please whitelist your IP or if you think this block is an error please
        <a href="mailto:support@atravad.com?subject=Access%20Denied%20Support%20Request">open a support ticket</a>
        and include the block details below so we can assist in troubleshooting.`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, max-age=0" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
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
      <h1 class="block-title"><span class="dot"></span>${heroTitle}</h1>
      <div class="intro">
        ${introMessage}
      </div>
      <div class="details-title">Block details:</div>
      <table>
        <tr><td>Client IP:</td><td>${safeIp}</td></tr>
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

function sendBlockedResponse(
  res,
  req,
  { host, path, clientIp, proxyIp, forwardedFor, reason, matchedRules } = {},
) {
  const rawReason = String(reason || "");
  const reasonType = getBlockedReasonType(rawReason);
  const isIpBlocked = reasonType === "ip";
  const isGeoBlocked = reasonType === "geo";
  const topRuleId = matchedRules?.[0]?.id ? String(matchedRules[0].id) : null;
  const blockPrefix = isGeoBlocked ? "GEO" : "IPB";
  const cacheHeaders = {
    "Cache-Control": isGeoBlocked
      ? "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0, private"
      : "no-store",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
    "CDN-Cache-Control": "no-store",
    Vary: "Accept, Accept-Encoding, X-Geo-Country, X-ATRAVAD-Geo-Country, CF-IPCountry, X-Vercel-IP-Country",
  };
  const headers = withWafFingerprintHeaders({
    "X-ATRAVAD-Blocked": "true",
    "X-ATRAVAD-Reason": reason || "Security rule violation",
    "X-ATRAVAD-Client-IP": clientIp || "unknown",
    "X-ATRAVAD-Proxy-IP": proxyIp || "unknown",
    ...(isGeoBlocked ? { "X-ATRAVAD-Geo-Blocked": "true" } : {}),
    ...(isGeoBlocked
      ? { "Clear-Site-Data": '"cache", "storage", "cookies"' }
      : {}),
    ...cacheHeaders,
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

  const blockIdFromRule = topRuleId
    ? `${blockPrefix}-${topRuleId}`
    : `${blockPrefix}-403`;
  const normalizedReason = isIpBlocked
    ? "Your request was not allowed due to IP blocking (not white listed)."
    : isGeoBlocked
      ? "Access from your country or region is not allowed by this site's security policy."
      : "Your request was blocked by the website firewall policy.";
  const serverId = `${os.hostname()}:${process.pid}`;
  const body = renderBlockedHtml({
    host,
    path,
    clientIp,
    proxyIp,
    forwardedFor,
    reason: normalizedReason,
    browser: req?.headers?.["user-agent"] || "unknown",
    blockId: blockIdFromRule,
    timestamp: new Date().toISOString(),
    serverId,
    blockType: isGeoBlocked ? "geo" : isIpBlocked ? "ip" : "waf",
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

function getRequestHostHeader(req) {
  return String(req?.headers?.host || "").trim() || null;
}

function getHostWithoutPort(hostHeader) {
  if (!hostHeader) return null;
  try {
    return new URL(`https://${hostHeader}`).hostname;
  } catch {
    return hostHeader.split(":")[0] || null;
  }
}

function isStreamingResponse(proxyRes) {
  const contentType = String(
    proxyRes?.headers?.["content-type"] || "",
  ).toLowerCase();
  if (contentType.includes("text/event-stream")) return true;
  if (contentType.includes("application/x-ndjson")) return true;

  const cacheControl = String(
    proxyRes?.headers?.["cache-control"] || "",
  ).toLowerCase();
  if (cacheControl.includes("no-transform")) return true;

  return false;
}

function getOriginTargetPath(originUrlObj, clientPath) {
  return clientPath + (originUrlObj.search || "");
}

function getClientIpInfo(req) {
  return resolveClientIp({
    headers: req?.headers || {},
    remoteAddress: req?.socket?.remoteAddress,
  });
}

function isSecureRequest(req) {
  return Boolean(req?.secure || req?.socket?.encrypted);
}

function buildOriginRequestOptions(clientReq, origin) {
  const originUrl = origin?.url;
  const originUrlObj = new URL(originUrl);
  const incomingHostHeader = getRequestHostHeader(clientReq);
  const upstreamHostHeader =
    origin?.upstreamHost || incomingHostHeader || originUrlObj.host;
  const tlsServername =
    origin?.tlsServername ||
    getDefaultOriginServername(originUrlObj.toString(), upstreamHostHeader);
  const headers = sanitizeHeaderMap({ ...clientReq.headers });
  const clientIpInfo = getClientIpInfo(clientReq);

  delete headers["connection"];
  delete headers["host"];
  delete headers["transfer-encoding"];
  delete headers["upgrade"];
  delete headers["forwarded"];
  delete headers["x-forwarded-for"];
  delete headers["x-forwarded-host"];
  delete headers["x-forwarded-proto"];
  delete headers["x-real-ip"];
  delete headers["x-client-ip"];
  delete headers["true-client-ip"];
  delete headers["cf-connecting-ip"];

  headers["host"] = upstreamHostHeader;
  headers["x-forwarded-for"] = buildForwardedForHeader({
    headers: clientReq.headers,
    remoteAddress: clientReq.socket?.remoteAddress,
  });
  headers["x-forwarded-proto"] = isSecureRequest(clientReq) ? "https" : "http";
  if (clientIpInfo.clientIp) {
    headers["x-real-ip"] = clientIpInfo.clientIp;
    headers["x-atravad-client-ip"] = clientIpInfo.clientIp;
  }
  if (clientIpInfo.proxyIp) {
    headers["x-atravad-proxy-ip"] = clientIpInfo.proxyIp;
  }
  if (incomingHostHeader) {
    headers["x-forwarded-host"] = incomingHostHeader;
  }
  headers["x-atravad-origin-url"] = originUrlObj.toString();
  headers["x-atravad-upstream-host"] = upstreamHostHeader;

  if (origin?.authHeader?.name && origin?.authHeader?.value) {
    headers[sanitizeHeaderValue(origin.authHeader.name)] = sanitizeHeaderValue(origin.authHeader.value);
  }

  const requestOptions = {
    method: clientReq.method,
    hostname: originUrlObj.hostname,
    port: originUrlObj.port || (originUrlObj.protocol === "https:" ? 443 : 80),
    path: getOriginTargetPath(originUrlObj, clientReq.url),
    headers,
  };

  if (originUrlObj.protocol === "https:" && tlsServername) {
    requestOptions.servername = tlsServername;
  }

  return {
    requestOptions,
    originUrlObj,
    incomingHostHeader,
    upstreamHostHeader,
  };
}

function sendUpgradeError(socket, statusCode, message) {
  if (!socket || socket.destroyed) return;
  const body = message || "Bad Request";
  socket.write(
    `HTTP/1.1 ${statusCode} ${body}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      "\r\n" +
      body,
  );
  socket.destroy();
}

function getWebSocketIdleTimeoutMs(origin) {
  const configured = Number.parseInt(
    String(
      origin?.websocketIdleTimeoutSec ??
        process.env.WAF_WEBSOCKET_IDLE_TIMEOUT_SEC ??
        "900",
    ),
    10,
  );
  if (!Number.isInteger(configured) || configured < 10) {
    return 900000;
  }
  return configured * 1000;
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
  return getClientIpInfo(req).clientIp;
}

async function buildInspectionRequest(req) {
  const headers = { ...(req?.headers || {}) };
  const hasGeoCountryHeader = Boolean(
    headers["cf-ipcountry"] ||
    headers["x-vercel-ip-country"] ||
    headers["x-geo-country"] ||
    headers["x-atravad-geo-country"],
  );

  if (!hasGeoCountryHeader) {
    const clientIp = extractClientIp(req);
    if (clientIp) {
      try {
        const geo = await geolocateIpCached(clientIp);
        const countryCode = String(geo?.countryCode || "")
          .trim()
          .toUpperCase();
        if (geo?.success && countryCode) {
          headers["x-geo-country"] = countryCode;
          headers["x-atravad-geo-country"] = countryCode;
        }
      } catch (error) {
        console.warn(
          "Failed to enrich request with geo country:",
          error.message,
        );
      }
    }
  }

  return {
    ...req,
    headers,
  };
}

function isHealthPath(pathname) {
  return pathname === "/health" || pathname === "/_atravad/health";
}

function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === "")
    return defaultValue;
  const normalized = String(value).trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parsePositiveInt(value, defaultValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : defaultValue;
}

function parseCsvList(value, fallback = []) {
  if (value === undefined || value === null || value === "")
    return [...fallback];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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
    this.healthCheckConfigs = new Map();
    this.applicationRefreshInterval = null;
    this.applicationRefreshInFlight = null;
    this.applicationRefreshIntervalMs =
      parsePositiveInt(
        options.applicationRefreshIntervalMs ??
          process.env.ATRAVAD_APP_REFRESH_INTERVAL_SEC,
        60,
      ) * 1000;
    this.policyRealtimeUnsubs = [];
    this.policyRealtimeDebounceTimer = null;
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
      options.certStore ||
      createCertStore({ persistToDisk: persistCertsToDisk });
    this.getAcmeChallengeResponse =
      options.getAcmeChallengeResponse || getAcmeChallengeResponse;
    this.letsEncryptEnabled =
      options.letsEncryptEnabled !== false && isLetsEncryptAvailable;
    this.provisioningInProgress = new Set(); // domain -> avoid duplicate provision
    this.logHealthRequests =
      options.logHealthRequests === true ||
      process.env.WAF_LOG_HEALTH_REQUESTS === "true" ||
      process.env.WAF_LOG_HEALTH_REQUESTS === "1";
    this.logDedupWindowMs =
      parsePositiveInt(
        options.logDedupWindowSec ?? process.env.WAF_LOG_DEDUPE_WINDOW_SEC,
        30,
      ) * 1000;
    this.logDedupCache = new Map();
    this.skipLowValuePaths =
      options.skipLowValuePaths ??
      parseBooleanEnv(process.env.WAF_LOG_SKIP_LOW_VALUE_PATHS, true);
    this.skipPathPrefixes = parseCsvList(
      process.env.WAF_LOG_SKIP_PATH_PREFIXES,
      [
        "/_next/",
        "/static/",
        "/assets/",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
        "/manifest.json",
        "/apple-touch-icon",
      ],
    ).map((value) => value.toLowerCase());
    this.skipPathExtensions = parseCsvList(
      process.env.WAF_LOG_SKIP_PATH_EXTENSIONS,
      [
        ".js",
        ".css",
        ".map",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".ico",
        ".webp",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
      ],
    ).map((value) => value.toLowerCase());
    this.skipBotUAs =
      options.skipBotUAs ??
      parseBooleanEnv(process.env.WAF_LOG_SKIP_BOT_UA, true);
    this.skipBotPatterns = parseCsvList(
      process.env.WAF_LOG_SKIP_BOT_UA_PATTERNS,
      [
        "googlebot",
        "bingbot",
        "yandexbot",
        "duckduckbot",
        "baiduspider",
        "slurp",
        "crawler",
        "spider",
        "bot/",
        "headlesschrome",
      ],
    ).map((value) => value.toLowerCase());

    // Load applications from Firestore and refresh on a fixed interval to avoid
    // long-lived Firestore subscriptions that scale poorly with tenant growth.
    // Optional: ATRAVAD_POLICY_REALTIME_REFRESH=true + tenant filter reloads policies on policy doc changes.
    void this.loadApplications();
    this.setupApplicationRefresh();
    this.setupPolicyRealtimeListener();
  }

  shouldLogRequest(pathname, blocked, statusCode) {
    if (!this.logHealthRequests && isHealthPath(pathname)) return false;
    if (blocked) return true;
    if (Number.isFinite(statusCode) && statusCode >= 400) return true;
    if (pathname === "/ws" || pathname.startsWith("/ws/")) return true;
    return true;
  }

  shouldSkipLowValueRequest(pathname, userAgent = "") {
    if (!this.skipLowValuePaths) return false;
    const normalizedPath = String(pathname || "/").toLowerCase();
    if (
      this.skipPathPrefixes.some((prefix) => normalizedPath.startsWith(prefix))
    ) {
      return true;
    }
    if (this.skipPathExtensions.some((ext) => normalizedPath.endsWith(ext))) {
      return true;
    }

    if (!this.skipBotUAs) return false;
    const normalizedUa = String(userAgent || "").toLowerCase();
    if (!normalizedUa) return false;
    return this.skipBotPatterns.some((pattern) =>
      normalizedUa.includes(pattern),
    );
  }

  shouldSkipDuplicateLog({
    tenantName,
    host,
    uriPath,
    ruleId,
    clientIp,
    statusCode,
  }) {
    if (this.logDedupWindowMs <= 0) return false;
    const now = Date.now();

    if (this.logDedupCache.size > 5000) {
      for (const [cacheKey, expiresAt] of this.logDedupCache.entries()) {
        if (expiresAt <= now) this.logDedupCache.delete(cacheKey);
      }
    }

    const key = [
      tenantName || "",
      String(host || "").toLowerCase(),
      uriPath || "/",
      String(ruleId || ""),
      clientIp || "",
      String(statusCode ?? ""),
    ].join("|");

    const existing = this.logDedupCache.get(key);
    if (existing && existing > now) {
      return true;
    }

    this.logDedupCache.set(key, now + this.logDedupWindowMs);
    return false;
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
    decision = null,
  }) {
    if (!adminDb || !app?.tenantName || !req) return;
    const uri = req.url || "/";
    const uriPath = uri.split("?")[0] || "/";
    const userAgent = req.headers?.["user-agent"] || "";
    if (!this.shouldLogRequest(uriPath, blocked, statusCode)) return;
    if (this.shouldSkipLowValueRequest(uriPath, userAgent)) return;
    const clientIpInfo = getClientIpInfo(req);
    const clientIp = clientIpInfo.clientIp;
    const host = req.headers?.host || null;
    const derivedRuleId = deriveRuleId({
      ruleId,
      ruleMessage,
      message,
      blocked,
      statusCode,
    });
    if (
      this.shouldSkipDuplicateLog({
        tenantName: app.tenantName,
        host,
        uriPath,
        ruleId: derivedRuleId,
        clientIp,
        statusCode,
      })
    ) {
      return;
    }

    const entry = {
      source: app.domain || "proxy-waf",
      tenantName: app.tenantName,
      timestamp: new Date().toISOString(),
      level,
      severity,
      message: message || "WAF request event",
      ruleId: derivedRuleId,
      ruleMessage,
      request: {
        host,
        method: req.method || "GET",
        uri,
      },
      response,
      clientIp,
      ipAddress: clientIp,
      proxyIp: clientIpInfo.proxyIp,
      forwardedFor: clientIpInfo.forwardedFor,
      trustedProxy: clientIpInfo.trustedProxy,
      userAgent: userAgent || null,
      uri,
      method: req.method || "GET",
      statusCode,
      blocked: Boolean(blocked),
      decision:
        decision ||
        (blocked
          ? "waf_blocked"
          : Number.isFinite(statusCode) && statusCode >= 400
            ? "origin_denied"
            : "allowed"),
      ingestedAt: new Date().toISOString(),
    };

    const writeLog = async () => {
      try {
        let trafficLoggingConfig = null;
        if (!blocked && entry.decision === "allowed") {
          trafficLoggingConfig = await getTrafficLoggingConfig(adminDb);
        }
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
        await persistSecurityLog(adminDb, entry, { trafficLoggingConfig });
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
        console.warn(
          `Failed to load custom SSL for ${app.domain}:`,
          err.message,
        );
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
    const result = await provisionCertificate(domain, {
      certStore: this.certStore,
    });
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

      const nextApplications = new Map();
      const activeOriginUrls = new Set();

      for (const doc of appsSnapshot.docs) {
        const app = { id: doc.id, ...doc.data() };
        if (app.domain) {
          const normalizedDomain = normalizeDomainInput(app.domain);
          if (normalizedDomain) {
            app.domain = normalizedDomain;
            nextApplications.set(normalizedDomain, app);
            console.log(`Loaded application: ${normalizedDomain}`);
          }
          this.loadCertificateForApplication(app);

          // Load policy if assigned
          await this.loadPolicyForApplication(app);

          // Start health checks for origins
          if (app.origins && Array.isArray(app.origins)) {
            app.origins.forEach((origin) => {
              if (origin?.url) {
                activeOriginUrls.add(origin.url);
              }
              this.startHealthCheck(origin);
            });
          }
        }
      }

      for (const [
        originUrl,
        intervalId,
      ] of this.healthCheckIntervals.entries()) {
        if (activeOriginUrls.has(originUrl)) continue;
        clearInterval(intervalId);
        this.healthCheckIntervals.delete(originUrl);
        this.healthCheckConfigs.delete(originUrl);
        this.originHealth.delete(originUrl);
      }

      for (const domain of this.applications.keys()) {
        if (!nextApplications.has(domain)) {
          this.certStore.remove(domain);
        }
      }

      this.applications = nextApplications;

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

  setupApplicationRefresh() {
    if (!adminDb || this.applicationRefreshIntervalMs <= 0) return;

    this.applicationRefreshInterval = setInterval(() => {
      this.scheduleApplicationsReload("interval");
    }, this.applicationRefreshIntervalMs);
  }

  /**
   * Coalesced reload of applications + policies (used by interval and realtime policy listener).
   */
  scheduleApplicationsReload(reason = "refresh") {
    if (!adminDb || this.applicationRefreshInFlight) return;
    this.applicationRefreshInFlight = this.loadApplications()
      .catch((error) => {
        console.error(`Error refreshing applications (${reason}):`, error);
      })
      .finally(() => {
        this.applicationRefreshInFlight = null;
      });
  }

  /**
   * When ATRAVAD_POLICY_REALTIME_REFRESH is true and the proxy is scoped to tenant(s),
   * subscribe to policy document changes and reload the WAF config without waiting for the poll interval.
   */
  setupPolicyRealtimeListener() {
    if (!adminDb) return;
    if (!parseBooleanEnv(process.env.ATRAVAD_POLICY_REALTIME_REFRESH, false)) {
      return;
    }
    const tenantNames = this.tenantNames;
    if (!tenantNames?.length) {
      console.warn(
        "ATRAVAD_POLICY_REALTIME_REFRESH is enabled but no tenant filter is set (ATRAVAD tenant env). Skipping policy listener to avoid watching all policies.",
      );
      return;
    }

    let query = adminDb.collection("policies");
    if (tenantNames.length === 1) {
      query = query.where("tenantName", "==", tenantNames[0]);
    } else {
      query = query.where("tenantName", "in", tenantNames);
    }

    const unsubscribe = query.onSnapshot(
      () => {
        if (this.policyRealtimeDebounceTimer) {
          clearTimeout(this.policyRealtimeDebounceTimer);
        }
        this.policyRealtimeDebounceTimer = setTimeout(() => {
          this.policyRealtimeDebounceTimer = null;
          if (this.applicationRefreshInFlight) return;
          this.scheduleApplicationsReload("policy realtime");
        }, 400);
      },
      (error) => {
        console.error("ATRAVAD: policy realtime listener error:", error);
      },
    );
    this.policyRealtimeUnsubs.push(unsubscribe);
    console.log(
      "ATRAVAD: policy realtime refresh enabled (Firestore listener on policies).",
    );
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
    const configKey = `${checkPath}|${interval}|${timeout}`;

    if (
      this.healthCheckIntervals.has(originUrl) &&
      this.healthCheckConfigs.get(originUrl) === configKey
    ) {
      return;
    }

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
    this.healthCheckConfigs.set(originUrl, configKey);
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
          "User-Agent": "ATRAVA-Defense-HealthCheck/1.0",
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
      req.secure = isSecureRequest(req);
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
            service: "atrava-defense",
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
        const inspectionReq = await buildInspectionRequest(req);
        const accessInspection = await this.modSecurity.inspectAccessControls(
          inspectionReq,
          app.policyId,
        );
        if (!accessInspection.allowed || accessInspection.blocked) {
          const clientIpInfo = getClientIpInfo(req);
          const topRule = accessInspection.matchedRules?.[0] || null;
          const topReason =
            topRule?.message || "Access control policy violation";
          if (
            shouldBypassStaticAssetBlocking(
              req,
              accessInspection.matchedRules,
              topReason,
            )
          ) {
            console.info(
              `Allowing protected static asset request for ${host}:`,
              {
                url: req.url,
                method: req.method,
                matchedRules: accessInspection.matchedRules,
                engine: accessInspection.engine,
              },
            );
          } else {
            sendBlockedResponse(res, req, {
              host,
              path: req.url,
              clientIp: clientIpInfo.clientIp,
              proxyIp: clientIpInfo.proxyIp,
              forwardedFor: clientIpInfo.forwardedFor,
              reason: topReason,
              matchedRules: accessInspection.matchedRules,
            });
            console.warn(`Access control blocked request for ${host}:`, {
              url: req.url,
              method: req.method,
              matchedRules: accessInspection.matchedRules,
              engine: accessInspection.engine,
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
              ruleMessage: topReason || null,
              response: {
                statusCode: 403,
                engine: accessInspection.engine || null,
              },
            });
            return;
          }
        }
        const inspection = await this.modSecurity.inspectRequest(
          inspectionReq,
          app.policyId,
          bodyBuffer,
        );
        if (!inspection.allowed || inspection.blocked) {
          const clientIpInfo = getClientIpInfo(req);
          const topRule = inspection.matchedRules?.[0] || null;
          const topReason = topRule?.message || "Security rule violation";
          if (
            shouldBypassStaticAssetBlocking(
              req,
              inspection.matchedRules,
              topReason,
            )
          ) {
            console.info(
              `Allowing protected static asset request for ${host}:`,
              {
                url: req.url,
                method: req.method,
                matchedRules: inspection.matchedRules,
                engine: inspection.engine,
              },
            );
          } else {
            sendBlockedResponse(res, req, {
              host,
              path: req.url,
              clientIp: clientIpInfo.clientIp,
              proxyIp: clientIpInfo.proxyIp,
              forwardedFor: clientIpInfo.forwardedFor,
              reason: topReason,
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
              ruleMessage: topReason || null,
              response: { statusCode: 403, engine: inspection.engine || null },
            });
            return;
          }
        }
      }

      await this.forwardRequest(req, res, origin, app, bodyBuffer);
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

  async handleUpgrade(clientReq, clientSocket, head, { secure = false } = {}) {
    try {
      clientReq.secure = secure;
      const upgradeHeader = String(
        clientReq.headers?.upgrade || "",
      ).toLowerCase();
      const connectionHeader = String(
        clientReq.headers?.connection || "",
      ).toLowerCase();
      if (
        upgradeHeader !== "websocket" ||
        !connectionHeader.includes("upgrade")
      ) {
        sendUpgradeError(
          clientSocket,
          400,
          "Invalid WebSocket upgrade request",
        );
        return;
      }

      const host = normalizeDomainInput(
        getHostWithoutPort(getRequestHostHeader(clientReq)) || "",
      );
      if (!host) {
        sendUpgradeError(clientSocket, 400, "Missing Host header");
        return;
      }

      const app = this.applications.get(host);
      if (!app) {
        sendUpgradeError(clientSocket, 404, "Application not found");
        return;
      }

      const origin = this.getHealthyOrigin(app);
      if (!origin?.url) {
        sendUpgradeError(clientSocket, 503, "No origin server configured");
        return;
      }
      if (origin.websocketEnabled === false) {
        this.queueSecurityLog({
          app,
          req: clientReq,
          level: "warn",
          severity: "MEDIUM",
          message: `WebSocket upgrade denied for ${host}: disabled by origin policy`,
          blocked: true,
          statusCode: 403,
          response: {
            statusCode: 403,
            origin: origin.url,
            protocol: "websocket",
          },
          decision: "websocket_denied",
        });
        sendUpgradeError(
          clientSocket,
          403,
          "WebSocket disabled for this origin",
        );
        return;
      }

      if (app.policyId && this.modSecurity) {
        const inspectionReq = await buildInspectionRequest(clientReq);
        const accessInspection = await this.modSecurity.inspectAccessControls(
          inspectionReq,
          app.policyId,
        );
        if (!accessInspection.allowed || accessInspection.blocked) {
          const topRule = accessInspection.matchedRules?.[0] || null;
          this.queueSecurityLog({
            app,
            req: clientReq,
            level: "warn",
            severity: "CRITICAL",
            message: `WebSocket handshake blocked by WAF for ${host}`,
            blocked: true,
            statusCode: 403,
            ruleId: topRule?.id || null,
            ruleMessage: topRule?.message || null,
            response: {
              statusCode: 403,
              origin: origin.url,
              protocol: "websocket",
            },
            decision: "websocket_blocked",
          });
          sendUpgradeError(clientSocket, 403, "WebSocket blocked by WAF");
          return;
        }
        const inspection = await this.modSecurity.inspectRequest(
          inspectionReq,
          app.policyId,
          null,
        );
        if (!inspection.allowed || inspection.blocked) {
          const topRule = inspection.matchedRules?.[0] || null;
          this.queueSecurityLog({
            app,
            req: clientReq,
            level: "warn",
            severity: "CRITICAL",
            message: `WebSocket handshake blocked by WAF for ${host}`,
            blocked: true,
            statusCode: 403,
            ruleId: topRule?.id || null,
            ruleMessage: topRule?.message || null,
            response: {
              statusCode: 403,
              origin: origin.url,
              protocol: "websocket",
            },
            decision: "websocket_blocked",
          });
          sendUpgradeError(clientSocket, 403, "WebSocket blocked by WAF");
          return;
        }
      }

      const { requestOptions, originUrlObj } = buildOriginRequestOptions(
        clientReq,
        origin,
      );
      requestOptions.method = clientReq.method || "GET";
      requestOptions.headers["connection"] =
        clientReq.headers["connection"] || "Upgrade";
      requestOptions.headers["upgrade"] =
        clientReq.headers["upgrade"] || "websocket";

      const protocol = originUrlObj.protocol === "https:" ? https : http;
      const proxyReq = protocol.request(requestOptions);
      const idleTimeoutMs = getWebSocketIdleTimeoutMs(origin);

      clientSocket.setTimeout(idleTimeoutMs);
      clientSocket.on("timeout", () => {
        if (!clientSocket.destroyed) clientSocket.destroy();
      });

      proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
        const statusLine = `HTTP/1.1 ${proxyRes.statusCode || 101} ${proxyRes.statusMessage || "Switching Protocols"}\r\n`;
        const headerLines = Object.entries(proxyRes.headers || {})
          .flatMap(([key, value]) => {
            if (Array.isArray(value)) {
              return value.map((entry) => `${key}: ${entry}\r\n`);
            }
            if (value === undefined) return [];
            return [`${key}: ${value}\r\n`];
          })
          .join("");

        clientSocket.write(`${statusLine}${headerLines}\r\n`);
        if (proxyHead?.length) {
          clientSocket.write(proxyHead);
        }
        if (head?.length) {
          proxySocket.write(head);
        }

        proxySocket.setTimeout(idleTimeoutMs);
        proxySocket.on("timeout", () => {
          if (!proxySocket.destroyed) proxySocket.destroy();
        });

        this.queueSecurityLog({
          app,
          req: clientReq,
          level: "info",
          severity: "INFO",
          message: `WebSocket upgrade accepted for ${host}`,
          blocked: false,
          statusCode: proxyRes.statusCode || 101,
          response: {
            statusCode: proxyRes.statusCode || 101,
            origin: origin.url,
            protocol: "websocket",
          },
          decision: "websocket_allowed",
        });

        proxySocket.pipe(clientSocket);
        clientSocket.pipe(proxySocket);

        const closeBoth = () => {
          if (!proxySocket.destroyed) proxySocket.destroy();
          if (!clientSocket.destroyed) clientSocket.destroy();
        };

        proxySocket.on("error", (error) => {
          console.error("WebSocket proxy socket error:", error);
          closeBoth();
        });
        clientSocket.on("error", (error) => {
          console.error("WebSocket client socket error:", error);
          closeBoth();
        });
        proxySocket.on("end", closeBoth);
        clientSocket.on("end", closeBoth);
      });

      proxyReq.on("response", (proxyRes) => {
        this.queueSecurityLog({
          app,
          req: clientReq,
          level: proxyRes.statusCode >= 500 ? "error" : "warn",
          severity: proxyRes.statusCode >= 500 ? "HIGH" : "MEDIUM",
          message: `WebSocket upgrade rejected by origin for ${host}`,
          blocked: proxyRes.statusCode >= 400,
          statusCode: proxyRes.statusCode || 502,
          response: {
            statusCode: proxyRes.statusCode || 502,
            origin: origin.url,
            protocol: "websocket",
          },
          decision: "websocket_origin_response",
        });
        const statusLine = `HTTP/1.1 ${proxyRes.statusCode || 502} ${proxyRes.statusMessage || "Bad Gateway"}\r\n`;
        const headerLines = Object.entries(proxyRes.headers || {})
          .flatMap(([key, value]) => {
            if (Array.isArray(value)) {
              return value.map((entry) => `${key}: ${entry}\r\n`);
            }
            if (value === undefined) return [];
            return [`${key}: ${value}\r\n`];
          })
          .join("");
        clientSocket.write(`${statusLine}${headerLines}\r\n`);
        proxyRes.pipe(clientSocket);
      });

      proxyReq.on("error", (error) => {
        console.error("WebSocket proxy request error:", error);
        this.queueSecurityLog({
          app,
          req: clientReq,
          level: "error",
          severity: "HIGH",
          message: `WebSocket proxy request error for ${host}: ${error.message}`,
          blocked: true,
          statusCode: 502,
          response: {
            statusCode: 502,
            origin: origin.url,
            protocol: "websocket",
          },
          decision: "websocket_proxy_error",
        });
        sendUpgradeError(clientSocket, 502, "Bad Gateway");
      });

      proxyReq.end();
    } catch (error) {
      console.error("Error handling WebSocket upgrade:", error);
      sendUpgradeError(clientSocket, 500, "Internal Server Error");
    }
  }

  /**
   * Forward request to origin server.
   * @param {object} clientReq - Incoming request
   * @param {object} clientRes - Response to client
   * @param {object} origin - Origin config
   * @param {object} app - Application config (policyId, etc.)
   * @param {Buffer|null} bodyBuffer - Buffered request body when already consumed for inspection
   */
  forwardRequest(clientReq, clientRes, origin, app, bodyBuffer = null) {
    try {
      const { requestOptions, originUrlObj, incomingHostHeader } =
        buildOriginRequestOptions(clientReq, origin);

      const protocol = originUrlObj.protocol === "https:" ? https : http;
      const doResponseInspection = Boolean(
        app.policyId &&
        this.modSecurity &&
        app.responseInspectionEnabled !== false &&
        origin?.responseBuffering !== false &&
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
        if (doResponseInspection && !isStreamingResponse(proxyRes)) {
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
            if (
              looksLikeNginx404(proxyRes.statusCode, proxyRes.headers, body)
            ) {
              sendCustomNotFound(clientRes, {
                host: getHostWithoutPort(incomingHostHeader),
                path: clientReq.url,
              });
              return;
            }
            if (!clientRes.headersSent) {
              const forwardedHeaders = applyProtectedDocumentHeaders(
                clientReq,
                proxyRes.headers,
                app,
              );
              clientRes.writeHead(
                proxyRes.statusCode,
                withWafFingerprintHeaders(forwardedHeaders),
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
                  host: getHostWithoutPort(incomingHostHeader),
                  path: clientReq.url,
                });
                return;
              }
              if (!clientRes.headersSent) {
                const forwardedHeaders = applyProtectedDocumentHeaders(
                  clientReq,
                  proxyRes.headers,
                  app,
                );
                clientRes.writeHead(
                  proxyRes.statusCode,
                  withWafFingerprintHeaders(forwardedHeaders),
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
            const forwardedHeaders = applyProtectedDocumentHeaders(
              clientReq,
              proxyRes.headers,
              app,
            );
            clientRes.writeHead(
              proxyRes.statusCode,
              withWafFingerprintHeaders(forwardedHeaders),
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

    this.httpServer.on("upgrade", (req, socket, head) => {
      this.handleUpgrade(req, socket, head, { secure: false });
    });

    this.httpServer.listen(this.port, () => {
      console.log(
        `ATRAVA Defense HTTP server listening on port ${this.port}`,
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

    this.httpsServer.on("upgrade", (req, socket, head) => {
      this.handleUpgrade(req, socket, head, { secure: true });
    });

    this.httpsServer.listen(this.httpsPort, () => {
      console.log(
        `ATRAVA Defense HTTPS server listening on port ${this.httpsPort} (SNI + Let's Encrypt)`,
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
    console.log("ATRAVA Defense server started");
  }

  /**
   * Stop the proxy server
   */
  stop() {
    if (this.applicationRefreshInterval) {
      clearInterval(this.applicationRefreshInterval);
      this.applicationRefreshInterval = null;
    }
    for (const unsub of this.policyRealtimeUnsubs) {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    }
    this.policyRealtimeUnsubs = [];
    if (this.policyRealtimeDebounceTimer) {
      clearTimeout(this.policyRealtimeDebounceTimer);
      this.policyRealtimeDebounceTimer = null;
    }

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

    console.log("ATRAVA Defense server stopped");
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
