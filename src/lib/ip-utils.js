export function normalizeIpAddress(ip) {
  if (!ip || typeof ip !== 'string') return '';
  const trimmed = ip.trim();
  if (!trimmed) return '';

  const bracketedMatch = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  const unwrapped = bracketedMatch ? bracketedMatch[1] : trimmed;

  if (unwrapped.startsWith('::ffff:')) {
    return unwrapped.slice(7);
  }

  if (unwrapped === '::1') {
    return '127.0.0.1';
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(unwrapped)) {
    return unwrapped.replace(/:\d+$/, '');
  }

  return unwrapped;
}

export function isValidIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized) return false;

  const ipv4Parts = normalized.split('.');
  if (ipv4Parts.length === 4) {
    return ipv4Parts.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
  }

  const candidate = normalized.toLowerCase();
  if (!candidate.includes(':')) return false;
  if (!/^[0-9a-f:]+$/.test(candidate)) return false;

  const doubleColonCount = candidate.split('::').length - 1;
  if (doubleColonCount > 1) return false;

  const segments = candidate.split(':');
  if (doubleColonCount === 0 && segments.length !== 8) return false;
  if (doubleColonCount === 1 && segments.length > 8) return false;

  return segments.every((segment) => segment === '' || /^[0-9a-f]{1,4}$/.test(segment));
}

export function isPrivateIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized || !isValidIp(normalized)) return false;

  if (normalized === '127.0.0.1') return true;
  if (normalized === '0.0.0.0') return true;
  if (normalized === '::1') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;

  return false;
}

export function isLoopbackIp(ip) {
  const normalized = normalizeIpAddress(ip);
  return normalized === '127.0.0.1' || normalized === '::1';
}

function ipv4ToInt(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized || !isValidIp(normalized) || normalized.includes(':')) return null;

  const parts = normalized.split('.').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return null;

  return ((parts[0] << 24) >>> 0) + ((parts[1] << 16) >>> 0) + ((parts[2] << 8) >>> 0) + parts[3];
}

function isIpv4InCidr(ip, cidr) {
  const [network, bitsRaw] = String(cidr || '').trim().split('/');
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  const bits = Number(bitsRaw);

  if (ipInt === null || networkInt === null || !Number.isInteger(bits) || bits < 0 || bits > 32) {
    return false;
  }

  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

function parseConfiguredProxyIps() {
  return String(process.env.TRUST_PROXY_IPS || '')
    .split(',')
    .map((value) => normalizeIpAddress(value))
    .filter((value) => isValidIp(value));
}

function parseConfiguredProxyCidrs() {
  return String(process.env.TRUST_PROXY_CIDRS || '')
    .split(',')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
}

function isTrustedProxyIp(ip) {
  const normalized = normalizeIpAddress(ip);
  if (!normalized || !isValidIp(normalized)) return false;
  if (isLoopbackIp(normalized)) return true;

  const trustedProxyIps = parseConfiguredProxyIps();
  if (trustedProxyIps.includes(normalized)) return true;

  const trustedProxyCidrs = parseConfiguredProxyCidrs();
  if (trustedProxyCidrs.some((cidr) => isIpv4InCidr(normalized, cidr))) return true;

  const trustPrivateProxies = ['1', 'true', 'yes'].includes(
    String(process.env.TRUST_PRIVATE_PROXY_IPS || '').trim().toLowerCase()
  );
  if (trustPrivateProxies && isPrivateIp(normalized)) return true;

  return false;
}

function parseForwardedIpList(value) {
  return String(value || '')
    .split(',')
    .map((item) => normalizeIpAddress(String(item || '')))
    .filter((item) => isValidIp(item));
}

function selectBestClientIp(candidates = []) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return (
    candidates.find((value) => isValidIp(value) && !isPrivateIp(value)) ||
    candidates.find((value) => isValidIp(value) && !isLoopbackIp(value)) ||
    candidates.find((value) => isValidIp(value)) ||
    null
  );
}

export function resolveClientIp({
  headers = {},
  remoteAddress = '',
} = {}) {
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [String(key).toLowerCase(), value])
  );

  const remoteIp = normalizeIpAddress(String(remoteAddress || ''));
  const validRemoteIp = isValidIp(remoteIp) ? remoteIp : null;
  const trustedProxy = isTrustedProxyIp(validRemoteIp);
  const forwardedFor = parseForwardedIpList(normalizedHeaders['x-forwarded-for']);

  const directCandidates = [
    normalizedHeaders['cf-connecting-ip'],
    normalizedHeaders['x-real-ip'],
    normalizedHeaders['true-client-ip'],
    normalizedHeaders['x-client-ip'],
  ]
    .map((value) => normalizeIpAddress(String(value || '')))
    .filter((value) => isValidIp(value));

  const forwardedCandidates = [...directCandidates, ...forwardedFor];
  const clientIp = trustedProxy
    ? selectBestClientIp(forwardedCandidates) || validRemoteIp
    : validRemoteIp || selectBestClientIp(forwardedCandidates);

  return {
    clientIp,
    proxyIp: validRemoteIp,
    forwardedFor,
    trustedProxy,
  };
}

export function buildForwardedForHeader({
  headers = {},
  remoteAddress = '',
} = {}) {
  const { clientIp, proxyIp, forwardedFor } = resolveClientIp({
    headers,
    remoteAddress,
  });

  const chain = Array.isArray(forwardedFor) ? [...forwardedFor] : [];

  if (clientIp && !chain.includes(clientIp)) {
    chain.unshift(clientIp);
  }

  if (proxyIp && proxyIp !== clientIp && !chain.includes(proxyIp)) {
    chain.push(proxyIp);
  }

  return chain.join(', ');
}
