/**
 * ModSecurity Integration for Proxy WAF
 *
 * Uses libmodsecurity v3 via Node bindings (modsecurity npm).
 * - Request inspection (Phase 1–2) with full body
 * - Response inspection (Phase 4) when enabled
 * - Fallback to pattern-based stub if native bindings are unavailable
 */

import { createRequire } from 'module';
import { getNativeConfigCandidates, generateModSecurityConfig } from './modsecurity.js';
import { adminDb } from './firebase-admin.js';
import { normalizeIpAddress, resolveClientIp } from './ip-utils.js';

const requireMod = createRequire(import.meta.url);
let ModSecurityNapi = null;
let RulesNapi = null;
let TransactionNapi = null;
try {
  // Resolve at runtime so cloud builds without optional native addon do not warn.
  const modPackageName = process.env.MODSECURITY_NODE_PACKAGE || 'modsecurity';
  const mod = requireMod(modPackageName);
  ModSecurityNapi = mod.ModSecurity;
  RulesNapi = mod.Rules;
  TransactionNapi = mod.Transaction;
} catch {
  ModSecurityNapi = null;
  RulesNapi = null;
  TransactionNapi = null;
}

const useNativeModSecurity = Boolean(ModSecurityNapi && RulesNapi && TransactionNapi);

function compileNativeRules(configText) {
  const rules = new RulesNapi();
  const ok = rules.add(configText);
  return ok ? rules : null;
}

function extractClientIp(req) {
  return resolveClientIp({
    headers: req?.headers || {},
    remoteAddress: req?.socket?.remoteAddress,
  }).clientIp || '127.0.0.1';
}

function ipv4ToInt(ip) {
  const parts = String(ip || '').split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
}

function ipInCidr(ip, cidr) {
  const [network, bitsRaw] = String(cidr || '').split('/');
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  const bits = Number(bitsRaw);
  if (ipInt === null || networkInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function fallbackIpAccessCheck(req, policy) {
  const ipAccessControl = policy?.policy?.ipAccessControl || policy?.ipAccessControl;
  if (!ipAccessControl) {
    return { blocked: false, matchedRules: [] };
  }

  const clientIp = extractClientIp(req);
  const whitelist = Array.isArray(ipAccessControl.whitelist) ? ipAccessControl.whitelist.map((v) => String(v || '').trim()).filter(Boolean) : [];
  const blacklist = Array.isArray(ipAccessControl.blacklist) ? ipAccessControl.blacklist.map((v) => String(v || '').trim()).filter(Boolean) : [];
  const whitelistCIDR = Array.isArray(ipAccessControl.whitelistCIDR) ? ipAccessControl.whitelistCIDR.map((v) => String(v || '').trim()).filter(Boolean) : [];
  const blacklistCIDR = Array.isArray(ipAccessControl.blacklistCIDR) ? ipAccessControl.blacklistCIDR.map((v) => String(v || '').trim()).filter(Boolean) : [];

  if (blacklist.includes(clientIp)) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100001,
        message: `IP Access Control: IP Address Blacklisted (${clientIp})`,
        severity: 'CRITICAL',
        matchedData: clientIp,
        matchedVar: 'REMOTE_ADDR',
      }],
    };
  }

  if (blacklistCIDR.some((cidr) => ipInCidr(clientIp, cidr))) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100021,
        message: `IP Access Control: IP in Blacklisted CIDR (${clientIp})`,
        severity: 'CRITICAL',
        matchedData: clientIp,
        matchedVar: 'REMOTE_ADDR',
      }],
    };
  }

  if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100000,
        message: `IP Access Control: IP Address Not Whitelisted (${clientIp})`,
        severity: 'CRITICAL',
        matchedData: clientIp,
        matchedVar: 'REMOTE_ADDR',
      }],
    };
  }

  if (whitelistCIDR.length > 0 && !whitelistCIDR.some((cidr) => ipInCidr(clientIp, cidr))) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100010,
        message: `IP Access Control: IP Not in Whitelisted CIDR (${clientIp})`,
        severity: 'CRITICAL',
        matchedData: clientIp,
        matchedVar: 'REMOTE_ADDR',
      }],
    };
  }

  return { blocked: false, matchedRules: [] };
}

function getGeoCountryFromRequest(req) {
  const headers = req?.headers || {};
  const candidates = [
    headers['cf-ipcountry'],
    headers['x-vercel-ip-country'],
    headers['x-geo-country'],
    headers['x-atravad-geo-country'],
  ];

  for (const value of candidates) {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized) return normalized;
  }

  return '';
}

function fallbackGeoBlockingCheck(req, policy) {
  const geoBlocking = policy?.policy?.geoBlocking || policy?.geoBlocking;
  if (!geoBlocking) {
    return { blocked: false, matchedRules: [] };
  }

  const blockedCountries = Array.isArray(geoBlocking.blockedCountries)
    ? geoBlocking.blockedCountries.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const allowedCountries = Array.isArray(geoBlocking.allowedCountries)
    ? geoBlocking.allowedCountries.map((value) => String(value || '').trim().toUpperCase()).filter(Boolean)
    : [];
  const geoCountry = getGeoCountryFromRequest(req);

  if (!geoCountry) {
    return { blocked: false, matchedRules: [] };
  }

  if (blockedCountries.includes(geoCountry)) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100900,
        message: `Geographic Blocking: Request from Blocked Country (${geoCountry})`,
        severity: 'CRITICAL',
        matchedData: geoCountry,
        matchedVar: 'REQUEST_HEADERS:X-Geo-Country',
      }],
    };
  }

  if (allowedCountries.length > 0 && !allowedCountries.includes(geoCountry)) {
    return {
      blocked: true,
      matchedRules: [{
        id: 100901,
        message: `Geographic Blocking: Request from Non-Allowed Country (${geoCountry})`,
        severity: 'CRITICAL',
        matchedData: geoCountry,
        matchedVar: 'REQUEST_HEADERS:X-Geo-Country',
      }],
    };
  }

  return { blocked: false, matchedRules: [] };
}

function interventionToMatchedRules(intervention) {
  const matchedRules = [];
  if (!intervention || typeof intervention !== 'object') return matchedRules;
  if (intervention.log && typeof intervention.log === 'string') {
    matchedRules.push({
      id: 0,
      message: intervention.log,
      severity: intervention.status >= 400 ? 'CRITICAL' : 'WARNING',
      matchedData: null,
      matchedVar: null,
    });
  }
  if (intervention.status) {
    matchedRules.push({
      id: 0,
      message: `ModSecurity intervention: ${intervention.status}`,
      severity: intervention.status >= 400 ? 'CRITICAL' : 'WARNING',
      matchedData: null,
      matchedVar: null,
    });
  }
  return matchedRules;
}

function normalizePolicyConfig(policy) {
  return policy?.policy && typeof policy.policy === 'object'
    ? policy.policy
    : (policy || {});
}

function getRequestPathname(req) {
  const rawUrl = String(req?.url || '');
  try {
    return new URL(rawUrl, 'https://atravad-waf.local').pathname || '/';
  } catch {
    return rawUrl.split('?')[0] || '/';
  }
}

function getFallbackExcludedRuleIds(req, policy) {
  const normalizedPolicy = normalizePolicyConfig(policy);
  const exceptions = Array.isArray(normalizedPolicy.exceptions) ? normalizedPolicy.exceptions : [];
  if (exceptions.length === 0) return new Set();

  const pathname = getRequestPathname(req);
  const excludedRuleIds = new Set();

  for (const exception of exceptions) {
    const path = String(exception?.path || '').trim();
    if (!path) continue;

    const escapedPath = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    const matcher = new RegExp(`^${escapedPath}`);
    if (!matcher.test(pathname)) continue;

    const ruleIds = Array.isArray(exception?.ruleIds) ? exception.ruleIds : [];
    for (const ruleId of ruleIds) {
      const normalizedRuleId = String(ruleId || '').trim();
      if (normalizedRuleId) excludedRuleIds.add(normalizedRuleId);
    }
  }

  return excludedRuleIds;
}

function decodeVariants(value, maxDepth = 3) {
  const variants = new Set();
  let current = String(value ?? '');
  variants.add(current);

  for (let i = 0; i < maxDepth; i += 1) {
    try {
      const next = decodeURIComponent(current.replace(/\+/g, '%20'));
      if (!next || variants.has(next)) break;
      variants.add(next);
      current = next;
    } catch {
      break;
    }
  }

  return Array.from(variants);
}

function decodeHtmlEntities(value) {
  return String(value ?? '').replace(
    /&(?:#(\d{1,7})|#x([0-9a-fA-F]{1,6})|lt|gt|quot|apos|amp|colon|sol);?/gi,
    (match, dec, hex) => {
      if (dec) {
        const codePoint = Number.parseInt(dec, 10);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }
      if (hex) {
        const codePoint = Number.parseInt(hex, 16);
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
      }

      switch (match.toLowerCase().replace(/;$/, '')) {
        case '&lt':
          return '<';
        case '&gt':
          return '>';
        case '&quot':
          return '"';
        case '&apos':
          return "'";
        case '&amp':
          return '&';
        case '&colon':
          return ':';
        case '&sol':
          return '/';
        default:
          return match;
      }
    },
  );
}

function decodeHtmlEntitiesRecursively(value, maxDepth = 3) {
  let current = String(value ?? '');
  for (let i = 0; i < maxDepth; i += 1) {
    const next = decodeHtmlEntities(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

function decodeUnicodeEscapes(value) {
  return String(value ?? '')
    .replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

function normalizeTraversalValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/(?:^|\/)\.(?:\/|$)/g, '/');
}

function stripSqlNoise(value) {
  return String(value ?? '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\r\n]*/g, '')
    .replace(/#[^\r\n]*/g, '')
    .replace(/[\s"'`()]+/g, '');
}

function stripXssNoise(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, '')
    .replace(/\s+/g, '')
    .replace(/["'`]+/g, '');
}

function pushInspectionValue(target, source, value) {
  if (value === undefined || value === null) return;
  const raw = String(value);
  if (!raw) return;

  const seen = new Set();
  for (const variant of decodeVariants(raw, 5)) {
    const base = decodeHtmlEntitiesRecursively(decodeUnicodeEscapes(variant), 5).replace(/\0/g, '');
    if (!base) continue;

    const candidates = [
      base,
      normalizeTraversalValue(base),
      stripSqlNoise(base),
      stripXssNoise(base),
      stripXssNoise(normalizeTraversalValue(base)),
    ];

    for (const candidate of candidates) {
      const normalized = String(candidate || '').trim();
      if (!normalized) continue;
      const key = `${source}:${normalized}`;
      if (seen.has(key)) continue;
      seen.add(key);
      target.push({
        source,
        value: normalized,
        normalized: normalized.toLowerCase(),
      });
    }
  }
}

function matchSupplementalRule(req, inputs, rule) {
  if (!rule) return null;

  if (typeof rule.when === 'function' && !rule.when(req)) {
    return null;
  }

  if (!Array.isArray(rule.regexes) || rule.regexes.length === 0) {
    return null;
  }

  return matchInspectionRule(inputs, rule.regexes);
}

function hasAnyHeader(headers, names = []) {
  return names.some((name) => {
    const value = headers?.[name];
    if (Array.isArray(value)) return value.some((entry) => String(entry || '').trim());
    return String(value || '').trim();
  });
}

function runSupplementalInspectRequest(req, bodyBuffer = null) {
  const headers = req?.headers || {};
  const inputs = collectInspectionInputs(req, bodyBuffer);
  const matchedRules = [];
  const clientIpInfo = resolveClientIp({
    headers,
    remoteAddress: req?.socket?.remoteAddress,
  });

  const supplementalRules = [
    {
      id: 109001,
      message: 'Cross-site scripting bypass payload detected',
      regexes: [
        /(?:^|[^\w])\\?\$\{[^}]{1,256}\}/i,
        /<\s*(?:script|svg|img|iframe|object|embed|math)\b/i,
        /(?:javascript|vbscript|livescript|data:text\/html)\s*:/i,
      ],
    },
    {
      id: 109002,
      message: 'Encoded HTML entity XSS payload detected',
      regexes: [
        /(?:&#(?:x[0-9a-f]{1,7}|[0-9]{1,7});?){2,}/i,
        /&(?:lt|#x0*3c|#0*60);?\s*(?:script|svg|img|iframe)\b/i,
      ],
    },
    {
      id: 109003,
      message: 'Brace expansion command injection payload detected',
      regexes: [
        /\{\s*(?:cat|bash|sh|curl|wget|nc|python|perl|php|node|powershell)\s*,[^{}]{1,256}\}/i,
      ],
    },
    {
      id: 109004,
      message: 'Spoofed proxy forwarding header detected',
      when: () => !clientIpInfo.trustedProxy && hasAnyHeader(headers, [
        'x-forwarded-host',
        'x-forwarded-for',
        'x-real-ip',
        'true-client-ip',
        'x-client-ip',
        'cf-connecting-ip',
        'forwarded',
      ]),
      regexes: [
        /.+/i,
      ],
    },
  ];

  for (const rule of supplementalRules) {
    const match = matchSupplementalRule(req, inputs, rule);
    if (!match) continue;

    matchedRules.push({
      id: rule.id,
      message: `${rule.message} (supplemental)`,
      severity: 'CRITICAL',
      matchedData: match.matchedData,
      matchedVar: match.matchedVar,
    });
  }

  return {
    allowed: matchedRules.length === 0,
    blocked: matchedRules.length > 0,
    matchedRules,
    severity: matchedRules.length ? 'CRITICAL' : 'INFO',
    engine: 'supplemental',
  };
}

function collectInspectionInputs(req, bodyBuffer = null) {
  const values = [];
  const url = String(req?.url || '');
  const headers = req?.headers || {};
  const body = (bodyBuffer && Buffer.isBuffer(bodyBuffer))
    ? bodyBuffer.toString('utf8', 0, 65536)
    : ((req?.body && Buffer.isBuffer(req.body)) ? req.body.toString('utf8', 0, 65536) : '');

  pushInspectionValue(values, 'REQUEST_URI', url);
  pushInspectionValue(values, 'REQUEST_METHOD', req?.method || '');
  pushInspectionValue(values, 'REQUEST_BODY', body);

  try {
    const parsed = new URL(url, 'https://atravad-waf.local');
    pushInspectionValue(values, 'REQUEST_FILENAME', parsed.pathname || '/');
    pushInspectionValue(values, 'QUERY_STRING', parsed.search || '');
    for (const [key, value] of parsed.searchParams.entries()) {
      pushInspectionValue(values, `ARGS_NAME:${key}`, key);
      pushInspectionValue(values, `ARGS:${key}`, value);
    }
  } catch {
    // Best-effort only. Raw URL is already included above.
  }

  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (Array.isArray(headerValue)) {
      for (const item of headerValue) {
        pushInspectionValue(values, `REQUEST_HEADERS:${headerName}`, item);
      }
    } else {
      pushInspectionValue(values, `REQUEST_HEADERS:${headerName}`, headerValue);
    }
  }

  return values;
}

function matchInspectionRule(inputs, regexes) {
  for (const input of inputs) {
    for (const regex of regexes) {
      const matched = input.value.match(regex) || input.normalized.match(regex);
      if (matched) {
        return {
          matchedData: matched[0],
          matchedVar: input.source,
        };
      }
    }
  }
  return null;
}

function runFallbackInspectRequest(req, policy, bodyBuffer = null, engineLabel = 'fallback') {
  const headers = req.headers || {};
  const normalizedPolicy = normalizePolicyConfig(policy);
  const strictMode = policy?.includeOWASPCRS !== false;
  const inputs = collectInspectionInputs(req, bodyBuffer);
  const matchedRules = [];
  const excludedRuleIds = getFallbackExcludedRuleIds(req, policy);

  const ipCheck = fallbackIpAccessCheck(req, policy);
  if (ipCheck.blocked) {
    return {
      allowed: false,
      blocked: true,
      matchedRules: ipCheck.matchedRules,
      severity: 'CRITICAL',
      engine: engineLabel,
    };
  }

  const geoCheck = fallbackGeoBlockingCheck(req, policy);
  if (geoCheck.blocked) {
    return {
      allowed: false,
      blocked: true,
      matchedRules: geoCheck.matchedRules,
      severity: 'CRITICAL',
      engine: engineLabel,
    };
  }

  const ruleChecks = [
    {
      enabled: strictMode || normalizedPolicy.sqlInjection,
      id: 100000,
      message: 'SQL Injection pattern detected',
      regexes: [
        /\b(?:union(?:\s+all)?\s+select|select\b.{0,80}\bfrom|insert\b.{0,40}\binto|update\b.{0,40}\bset|delete\b.{0,40}\bfrom|drop\b.{0,40}\btable|sleep\s*\(|benchmark\s*\(|waitfor\s+delay)\b/i,
        /(?:^|[\s"'`(])(?:or|and)\s+(?:[\d'"]+\s*=\s*[\d'"]+|true|false|1=1)\b/i,
        /(?:--|#|\/\*|\*\/|;\s*(?:select|union|drop|delete|insert|update|exec))/i,
        /\b(?:or|and)(?:\/\*.*?\*\/|\s|['"`=()])+?(?:true|false|null|\d+|[a-z_][\w$]*)(?:\/\*.*?\*\/|\s|['"`=()])+?(?:=|like|regexp|rlike)(?:\/\*.*?\*\/|\s|['"`=()])+?(?:true|false|null|\d+|[a-z_][\w$]*)/i,
        /\b(?:pg_sleep|sleep|benchmark|waitfor\s+delay|dbms_pipe\.receive_message)\s*\(/i,
        /\b(?:information_schema|@@version|version\s*\(|load_file\s*\(|into\s+outfile)\b/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.xss,
      id: 100100,
      message: 'Cross-site scripting payload detected',
      regexes: [
        /<script\b[^>]*>|<\/script>|javascript:|vbscript:|livescript:|data:text\/html/i,
        /on(?:error|load|click|mouseover|focus|blur|mouseenter|mouseleave|animationstart|submit)\s*=/i,
        /<\s*(?:img|svg|iframe|object|embed|math)\b/i,
        /\b(?:alert|prompt|confirm|document\.cookie|document\.domain|window\.location)\s*\(/i,
        /<(?:script|svg|img|iframe|object|embed|math|video|body|details|input)\b/i,
        /\bon[a-z]{3,24}\s*=/i,
        /\b(?:eval|settimeout|setinterval|fetch|atob)\s*\(/i,
        /&#(?:x0*3c|0*60);?\s*(?:script|svg|img)|&lt;?\s*(?:script|svg|img)/i,
        /\$\{\s*(?:alert|prompt|confirm|document\.|window\.|fetch\()/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.pathTraversal,
      id: 100200,
      message: 'Path traversal payload detected',
      regexes: [
        /(?:\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c|\/etc\/passwd|\\windows\\win\.ini|boot\.ini|system32|\/proc\/self\/environ)/i,
        /(?:^|[\\/])\.\.(?:[\\/]|$)|(?:%2e|\.){2,}(?:%2f|%5c|[\\/])/i,
        /(?:\/|\\)(?:etc\/(?:passwd|shadow|hosts)|proc\/self\/environ|windows\/(?:win\.ini|system32)|boot\.ini)\b/i,
        /(?:%00|%252e%252e%252f|%c0%ae%c0%ae%c0%af|%c0%af|%c1%9c|%e0%80%af|%e0%80%bc|%25c0%25af|%25c1%259c|%25e0%2580%25af|%25e0%2580%25bc)/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.rce,
      id: 100300,
      message: 'Remote code execution payload detected',
      regexes: [
        /\b(?:cmd(?:\.exe)?|powershell(?:\.exe)?|bash|sh|zsh|ksh|nc|netcat|curl|wget|perl|python|php|ruby|node)\b/i,
        /(?:\$\(|`[^`]+`|\|\||&&|;\s*(?:cat|ls|id|whoami|uname|curl|wget|powershell|bash|sh))/i,
        /(?:^|[?&][^=]{1,48}=)[^\s]{0,256}(?:\|{1,2}|&&|;)[^=&]{0,64}/i,
        /(?:^|[?&][^=]{1,48}=)(?:%0a|%0d|%09|\\n|\\r|\\t)/i,
        /\|\s*(?:whoami|id|uname|pwd|cat|ls|curl|wget|bash|sh|powershell|python|perl|php|node)\b/i,
        /(?:%0a|%0d|%09|\\n|\\r|\\t)+\s*(?:whoami|id|uname|pwd|cat|ls|curl|wget|bash|sh|powershell|python|perl|php|node)\b/i,
        /\{\s*(?:cat|bash|sh|curl|wget|nc|python|perl|php|node|powershell)\s*,[^{}]{1,128}\}/i,
        /<\([^)]{1,128}\)/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.ssrf,
      id: 100400,
      message: 'Server-side request forgery payload detected',
      regexes: [
        /\b(?:file|gopher|dict|ftp):\/\/|@(?:127\.0\.0\.1|localhost)\b/i,
        /\b(?:127\.0\.0\.1|0\.0\.0\.0|169\.254\.169\.254|metadata\.google\.internal|localhost)(?::\d+)?\b/i,
        /(?:^|[?&])(?:redirect|redir|url|next|return|returnto|continue|dest|destination|callback|target)=(?:(?:https?:)?\/\/|%2f%2f)/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.xxe,
      id: 100500,
      message: 'XXE payload detected',
      regexes: [
        /<!DOCTYPE|<!ENTITY|SYSTEM\s+["'][^"']+["']/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.authBypass || normalizedPolicy.brokenAccessControl,
      id: 100600,
      message: 'Authentication bypass payload detected',
      regexes: [
        /\b(?:username|user|login|email|password|pass|auth|token)\b.{0,80}(?:or|and)\s+(?:[\d'"]+\s*=\s*[\d'"]+|true|1=1)\b/i,
        /\b(?:admin|administrator|root|guest|test)\b.{0,32}(?:or|and)\s+(?:[\d'"]+\s*=\s*[\d'"]+|true|1=1)\b/i,
        /\*\)\s*(?:\(|\||&)?\s*\(?\s*(?:uid|cn|mail|memberof|samaccountname)\s*=\*|\(\|\(uid=\*\)\)|\)\(&\(uid=\*\)\)/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.securityMisconfig,
      id: 100700,
      message: 'Security misconfiguration probe detected',
      regexes: [
        /(?:^|\/)(?:\.env|\.git\/config|web\.config|wp-config\.php|config\.php|composer\.json|package\.json|id_rsa)(?:$|[/?#])/i,
      ],
    },
    {
      enabled: strictMode || normalizedPolicy.fileUpload,
      id: 100800,
      message: 'Dangerous file upload detected',
      regexes: [
        /filename\s*=\s*["'][^"']+\.(?:php\d*|phtml|phar|cgi|pl|exe|sh|bat|cmd|com|js|jar|war|py|rb|ps1)["']/i,
      ],
    },
  ];

  for (const rule of ruleChecks) {
    if (!rule.enabled) continue;
    if (excludedRuleIds.has(String(rule.id))) continue;
    const match = matchInspectionRule(inputs, rule.regexes);
    if (!match) continue;

    matchedRules.push({
      id: rule.id,
      message: `${rule.message} (fallback)`,
      severity: 'CRITICAL',
      matchedData: match.matchedData,
      matchedVar: match.matchedVar,
    });
  }

  const ua = (headers['user-agent'] || '').toLowerCase();
  if (
    /(sqlmap|nikto|wafw00f|acunetix|netsparker|nessus|openvas|nmap|masscan|zgrab|dirbuster|gobuster|ffuf|wpscan|nuclei|jaeles|zaproxy|burp)/i.test(ua)
  ) {
    matchedRules.push({
      id: 100002,
      message: 'Known security scanner User-Agent detected',
      severity: 'WARNING',
      matchedData: headers['user-agent'],
      matchedVar: 'REQUEST_HEADERS:User-Agent',
    });
  }

  const method = String(req.method || '').toUpperCase();
  if (['TRACE', 'TRACK', 'CONNECT'].includes(method)) {
    matchedRules.push({
      id: 100003,
      message: `Disallowed HTTP method detected (${method})`,
      severity: 'CRITICAL',
      matchedData: method,
      matchedVar: 'REQUEST_METHOD',
    });
  }

  const headerEntries = Object.entries(headers);
  for (const [headerName, headerValue] of headerEntries) {
    const serialized = Array.isArray(headerValue) ? headerValue.join(',') : String(headerValue || '');
    if (/[\r\n]/.test(serialized)) {
      matchedRules.push({
        id: 100004,
        message: `Header injection payload detected in ${headerName}`,
        severity: 'CRITICAL',
        matchedData: serialized,
        matchedVar: `REQUEST_HEADERS:${headerName}`,
      });
      continue;
    }

    if (/(?:%0d|%0a|\\r|\\n|content-length\s*:|set-cookie\s*:|location\s*:)/i.test(serialized)) {
      matchedRules.push({
        id: 100005,
        message: `Suspicious header smuggling payload detected in ${headerName}`,
        severity: 'CRITICAL',
        matchedData: serialized,
        matchedVar: `REQUEST_HEADERS:${headerName}`,
      });
    }
  }

  return {
    allowed: matchedRules.length === 0,
    blocked: matchedRules.length > 0,
    matchedRules,
    severity: matchedRules.length ? 'CRITICAL' : 'INFO',
    engine: engineLabel,
  };
}

export class ModSecurityProxy {
  constructor(options = {}) {
    this.policies = new Map();
    this.rulesCache = new Map(); // policyId -> { modsec, rules }
    this.modsec = null;
    this.bodyLimit = options.bodyLimit ?? 13107200;
    this.responseBodyLimit = options.responseBodyLimit ?? 524288;
    this.inspectionTimeout = options.inspectionTimeout ?? 5000;
    this.failOpen = options.failOpen === true;
    this.responseInspectionEnabled = options.responseInspectionEnabled !== false;
    if (useNativeModSecurity) {
      try {
        this.modsec = new ModSecurityNapi();
        this.modsec.setLogCallback && this.modsec.setLogCallback(() => {});
      } catch {
        this.modsec = null;
      }
    }
  }

  async loadPolicy(policyId) {
    try {
      if (!adminDb) return null;
      const policyDoc = await adminDb.collection('policies').doc(policyId).get();
      if (!policyDoc.exists) return null;
      const policy = policyDoc.data();
      // Regenerate config from structured policy data when available so GUI-created
      // policies keep working even if an older stored config string is stale/broken.
      if (policy.policy || policy.sqlInjection !== undefined) {
        policy.modSecurityConfig = generateModSecurityConfig(policy.policy || policy, {
          includeOWASPCRS: policy.includeOWASPCRS !== false,
          mode: policy.mode || 'prevention',
        });
      }
      this.policies.set(policyId, policy);

      if (useNativeModSecurity && this.modsec && policy.modSecurityConfig) {
        const candidates = getNativeConfigCandidates(policy.modSecurityConfig);
        for (const candidate of candidates) {
          try {
            const rules = compileNativeRules(candidate.config);
            if (rules) {
              this.rulesCache.set(policyId, {
                modsec: this.modsec,
                rules,
                engineVariant: candidate.name,
              });
              break;
            }
            console.warn(`ModSecurity rules add returned false for policy ${policyId} using ${candidate.name}`);
          } catch (err) {
            console.warn(`ModSecurity rules load failed for policy ${policyId} using ${candidate.name}:`, err.message);
          }
        }
        if (!this.rulesCache.has(policyId)) {
          console.warn(`ModSecurity native rules unavailable for policy ${policyId}; fallback engine will be used`);
        }
      }
      return policy;
    } catch (err) {
      console.error('loadPolicy error:', err);
      return null;
    }
  }

  _getRules(policyId) {
    return this.rulesCache.get(policyId) || null;
  }

  async inspectAccessControls(req, policyId) {
    if (!policyId) {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    if (!this.policies.has(policyId)) await this.loadPolicy(policyId);
    const policy = this.policies.get(policyId);
    if (!policy) {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    const ipCheck = fallbackIpAccessCheck(req, policy);
    if (ipCheck.blocked) {
      return {
        allowed: false,
        blocked: true,
        matchedRules: ipCheck.matchedRules,
        severity: 'CRITICAL',
        engine: 'access-control',
      };
    }

    const geoCheck = fallbackGeoBlockingCheck(req, policy);
    if (geoCheck.blocked) {
      return {
        allowed: false,
        blocked: true,
        matchedRules: geoCheck.matchedRules,
        severity: 'CRITICAL',
        engine: 'access-control',
      };
    }

    return { allowed: true, blocked: false, matchedRules: [], engine: 'access-control' };
  }

  async inspectRequest(req, policyId, bodyBuffer = null) {
    if (!this.policies.has(policyId)) await this.loadPolicy(policyId);
    const policy = this.policies.get(policyId);
    if (!policy || !policy.modSecurityConfig) {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    const supplementalInspection = runSupplementalInspectRequest(req, bodyBuffer);
    if (!supplementalInspection.allowed || supplementalInspection.blocked) {
      return supplementalInspection;
    }

    if (useNativeModSecurity && this.modsec) {
      const cached = this._getRules(policyId);
      if (!cached) await this.loadPolicy(policyId);
      const { rules, engineVariant } = this._getRules(policyId) || {};
      if (!rules) {
        console.warn(`ModSecurity native rules unavailable for policy ${policyId}; using fallback inspection`);
        return runFallbackInspectRequest(req, policy, bodyBuffer);
      }

      const run = () => {
        const tx = new TransactionNapi(this.modsec, rules);
        const remoteAddr = extractClientIp(req);
        const remotePort = req.socket?.remotePort || 0;
        const localAddr = req.socket?.localAddress || '127.0.0.1';
        const localPort = req.socket?.localPort || 0;

        let res = tx.processConnection(remoteAddr, remotePort, localAddr, localPort);
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${engineVariant || 'native'}` };
        }

        res = tx.processURI(req.url || '/', req.method || 'GET', req.httpVersion || '1.1');
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${engineVariant || 'native'}` };
        }

        const raw = req.rawHeaders || [];
        for (let i = 0; i < raw.length; i += 2) {
          tx.addRequestHeader(raw[i], raw[i + 1] ?? '');
        }
        res = tx.processRequestHeaders();
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${engineVariant || 'native'}` };
        }

        if (bodyBuffer && bodyBuffer.length > 0) {
          res = tx.appendRequestBody(bodyBuffer);
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${engineVariant || 'native'}` };
          }
        }

        // Phase 2 must still run for methods without a request body so query-string
        // and header-based rules execute on GET/HEAD requests.
        res = tx.processRequestBody();
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${engineVariant || 'native'}` };
        }

        tx.processLogging && tx.processLogging();
        return { allowed: true, blocked: false, matchedRules: [], engine: `libmodsecurity:${engineVariant || 'native'}` };
      };

      try {
        return await Promise.race([
          Promise.resolve(run()),
          new Promise((_, rej) => setTimeout(() => rej(new Error('inspection timeout')), this.inspectionTimeout)),
        ]);
      } catch (err) {
        if (this.failOpen) {
          console.warn('ModSecurity inspectRequest failed, fail-open:', err.message);
          return { allowed: true, blocked: false, matchedRules: [], engine: 'fail-open' };
        }
        console.warn('ModSecurity inspectRequest failed, fail-closed:', err.message);
        return {
          allowed: false,
          blocked: true,
          matchedRules: [{ id: 0, message: err.message, severity: 'WARNING', matchedData: null, matchedVar: null }],
          engine: 'fail-closed',
        };
      }
    }

    return runFallbackInspectRequest(req, policy, bodyBuffer);
  }

  /**
   * Inspect a request using an arbitrary ModSecurity config (e.g. for policy test API).
   * Uses native libmodsecurity when available; otherwise fallback pattern-based engine.
   * @param {object} req - Node IncomingMessage (url, method, rawHeaders, socket)
   * @param {string} modSecurityConfig - Full or standalone ModSecurity config text
   * @param {Buffer|null} bodyBuffer - Request body
   * @returns {Promise<{allowed: boolean, blocked: boolean, matchedRules: array, engine: string}>}
   */
  async inspectRequestWithConfig(req, modSecurityConfig, bodyBuffer = null) {
    if (!modSecurityConfig || typeof modSecurityConfig !== 'string') {
      return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
    }

    if (useNativeModSecurity && this.modsec) {
      const candidates = getNativeConfigCandidates(modSecurityConfig);
      if (candidates.length === 0) return { allowed: true, blocked: false, matchedRules: [], engine: 'none' };
      for (const candidate of candidates) {
        try {
          const rules = compileNativeRules(candidate.config);
          if (!rules) {
            console.warn(`ModSecurity rules add returned false for ad-hoc config using ${candidate.name}; trying next candidate`);
            continue;
          }

          const run = () => {
            const tx = new TransactionNapi(this.modsec, rules);
            const remoteAddr = extractClientIp(req);
            const remotePort = req.socket?.remotePort || 0;
            const localAddr = req.socket?.localAddress || '127.0.0.1';
            const localPort = req.socket?.localPort || 0;

            let res = tx.processConnection(remoteAddr, remotePort, localAddr, localPort);
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${candidate.name}` };
            }
            res = tx.processURI(req.url || '/', req.method || 'GET', req.httpVersion || '1.1');
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${candidate.name}` };
            }
            const raw = req.rawHeaders || [];
            for (let i = 0; i < raw.length; i += 2) {
              tx.addRequestHeader(raw[i], raw[i + 1] ?? '');
            }
            res = tx.processRequestHeaders();
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${candidate.name}` };
            }
            if (bodyBuffer && bodyBuffer.length > 0) {
              res = tx.appendRequestBody(bodyBuffer);
              if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
                return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${candidate.name}` };
              }
            }

            res = tx.processRequestBody();
            if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
              return { allowed: false, blocked: true, matchedRules: interventionToMatchedRules(res), engine: `libmodsecurity:${candidate.name}` };
            }
            tx.processLogging && tx.processLogging();
            return { allowed: true, blocked: false, matchedRules: [], engine: `libmodsecurity:${candidate.name}` };
          };

          return await Promise.race([
            Promise.resolve(run()),
            new Promise((_, rej) => setTimeout(() => rej(new Error('inspection timeout')), this.inspectionTimeout)),
          ]);
        } catch (err) {
          console.warn(`ModSecurity ad-hoc inspect failed using ${candidate.name}:`, err.message);
        }
      }
      if (this.failOpen) {
        return { allowed: true, blocked: false, matchedRules: [], engine: 'fail-open' };
      }
      return {
        allowed: false,
        blocked: true,
        matchedRules: [{ id: 0, message: 'Native ModSecurity config compilation failed', severity: 'WARNING', matchedData: null, matchedVar: null }],
        engine: 'fail-closed',
      };
    }

    return runFallbackInspectRequest(req, null, bodyBuffer);
  }

  async inspectResponse(responseMeta, policyId) {
    if (!this.responseInspectionEnabled) return { allowed: true, matchedRules: [] };
    if (!this.policies.has(policyId)) await this.loadPolicy(policyId);
    const policy = this.policies.get(policyId);
    if (!policy || !policy.modSecurityConfig) return { allowed: true, matchedRules: [] };

    if (useNativeModSecurity && this.modsec) {
      const cached = this._getRules(policyId);
      if (!cached) return { allowed: true, matchedRules: [] };
      const { rules } = cached;
      if (!rules) return { allowed: true, matchedRules: [] };

      try {
        const tx = new TransactionNapi(this.modsec, rules);
        const status = responseMeta.statusCode ?? 200;
        const protocol = responseMeta.httpVersion || '1.1';
        const headers = responseMeta.headers || {};
        const rawHeaders = responseMeta.rawHeaders || [];
        for (let i = 0; i < rawHeaders.length; i += 2) {
          tx.addResponseHeader(rawHeaders[i], rawHeaders[i + 1] ?? '');
        }
        let res = tx.processResponseHeaders(status, protocol);
        if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
          return { allowed: false, matchedRules: interventionToMatchedRules(res) };
        }
        const body = responseMeta.body;
        if (body && body.length > 0) {
          const chunk = body.length > this.responseBodyLimit ? body.subarray(0, this.responseBodyLimit) : body;
          res = tx.appendResponseBody(chunk);
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, matchedRules: interventionToMatchedRules(res) };
          }
          res = tx.processResponseBody();
          if (typeof res === 'object' && res !== null && (res.status || res.disruptive)) {
            return { allowed: false, matchedRules: interventionToMatchedRules(res) };
          }
        }
        tx.processLogging && tx.processLogging();
        return { allowed: true, matchedRules: [] };
      } catch {
        return { allowed: true, matchedRules: [] };
      }
    }
    return { allowed: true, matchedRules: [] };
  }

  getBodyLimit() {
    return this.bodyLimit;
  }

  getResponseBodyLimit() {
    return this.responseBodyLimit;
  }

  isNativeEngineAvailable() {
    return useNativeModSecurity && Boolean(this.modsec);
  }
}

export function createModSecurityProxy(options = {}) {
  return new ModSecurityProxy(options);
}
