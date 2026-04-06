import { isIP } from 'net';
import { normalizeDomainInput } from './domain-utils.js';

const HEADER_NAME_REGEX = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function normalizeOptionalHostLike(value, { allowPort = false } = {}) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    const hostname = normalizeDomainInput(parsed.hostname);
    if (!hostname) return null;
    if (!allowPort || !parsed.port) return hostname;
    return `${hostname}:${parsed.port}`;
  } catch {
    if (!allowPort) {
      const hostname = normalizeDomainInput(trimmed);
      return hostname || null;
    }

    const match = trimmed.match(/^\[?([^\]]+)\]?(?::(\d+))?$/);
    if (!match) return null;

    const hostname = normalizeDomainInput(match[1]);
    if (!hostname) return null;

    const port = match[2];
    if (!port) return hostname;

    const portNumber = Number.parseInt(port, 10);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      return null;
    }

    return `${hostname}:${portNumber}`;
  }
}

export function normalizeOptionalUpstreamHost(value) {
  return normalizeOptionalHostLike(value, { allowPort: true });
}

export function normalizeOptionalTlsServername(value) {
  return normalizeOptionalHostLike(value, { allowPort: false });
}

export function isVercelOriginHostname(value) {
  const normalized = normalizeDomainInput(typeof value === 'string' ? value : '');
  return Boolean(normalized && normalized.endsWith('.vercel.app'));
}

export function normalizeOriginConfig(origin = {}) {
  if (!origin?.url || typeof origin.url !== 'string') {
    return { valid: false, error: 'Each origin must have a URL' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(origin.url);
  } catch {
    return { valid: false, error: `Invalid origin URL: ${origin.url}` };
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return {
      valid: false,
      error: `Origin URL must use http or https: ${origin.url}`,
    };
  }

  const normalized = {
    url: parsedUrl.toString(),
    weight: Number.isFinite(origin.weight) ? origin.weight : 100,
    healthCheck: origin.healthCheck || { path: '/health', interval: 30, timeout: 5 },
  };
  const isVercelOrigin = isVercelOriginHostname(parsedUrl.hostname);

  const upstreamHost = normalizeOptionalUpstreamHost(origin.upstreamHost);
  if (origin.upstreamHost !== undefined && !upstreamHost) {
    return {
      valid: false,
      error: `Invalid upstream host header: ${origin.upstreamHost}`,
    };
  }
  if (upstreamHost) {
    normalized.upstreamHost = upstreamHost;
  } else if (isVercelOrigin) {
    normalized.upstreamHost = parsedUrl.hostname;
  }

  const tlsServername = normalizeOptionalTlsServername(origin.tlsServername);
  if (origin.tlsServername !== undefined && !tlsServername) {
    return {
      valid: false,
      error: `Invalid origin TLS server name: ${origin.tlsServername}`,
    };
  }
  if (tlsServername) {
    normalized.tlsServername = tlsServername;
  } else if (parsedUrl.protocol === 'https:' && isVercelOrigin) {
    normalized.tlsServername = parsedUrl.hostname;
  }

  if (origin.responseBuffering === false) {
    normalized.responseBuffering = false;
  }

  if (origin.websocketEnabled === false) {
    normalized.websocketEnabled = false;
  }

  if (origin.websocketIdleTimeoutSec !== undefined) {
    const timeoutSec = Number.parseInt(String(origin.websocketIdleTimeoutSec), 10);
    if (!Number.isInteger(timeoutSec) || timeoutSec < 10 || timeoutSec > 86400) {
      return {
        valid: false,
        error: 'WebSocket idle timeout must be between 10 and 86400 seconds',
      };
    }
    normalized.websocketIdleTimeoutSec = timeoutSec;
  }

  const authHeaderName =
    typeof origin.authHeaderName === 'string' ? origin.authHeaderName.trim() : '';
  const authHeaderValue =
    typeof origin.authHeaderValue === 'string' ? origin.authHeaderValue.trim() : '';

  if (isVercelOrigin && (!authHeaderName || !authHeaderValue)) {
    return {
      valid: false,
      error: 'Vercel origins require an origin auth header name and value to reduce direct origin bypass.',
    };
  }

  if (authHeaderName || authHeaderValue) {
    if (!authHeaderName || !authHeaderValue) {
      return {
        valid: false,
        error: 'Origin auth header requires both a header name and a value',
      };
    }

    if (!HEADER_NAME_REGEX.test(authHeaderName)) {
      return {
        valid: false,
        error: `Invalid origin auth header name: ${origin.authHeaderName}`,
      };
    }

    normalized.authHeader = {
      name: authHeaderName,
      value: authHeaderValue,
    };
  }

  return { valid: true, origin: normalized };
}

export function getDefaultOriginServername(originUrl, upstreamHost) {
  try {
    const parsedUrl = new URL(originUrl);
    if (parsedUrl.protocol !== 'https:') return null;

    const upstreamHostname = normalizeOptionalTlsServername(upstreamHost);
    if (upstreamHostname && !isIP(upstreamHostname)) {
      return upstreamHostname;
    }

    if (!isIP(parsedUrl.hostname)) {
      return parsedUrl.hostname;
    }
  } catch {
    return null;
  }

  return null;
}
