import { isPrivateIp, normalizeIpAddress } from './ip-utils.js';

const reputationCache = new Map();
const REPUTATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ABUSE_IPDB_TIMEOUT_MS = 2000;

function mapScoreToLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 2000) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function fetchAbuseIpDbScore(ip) {
  const apiKey = String(process.env.ABUSEIPDB_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }

  try {
    const url = new URL('https://api.abuseipdb.com/api/v2/check');
    url.searchParams.set('ipAddress', ip);
    url.searchParams.set('maxAgeInDays', '90');
    url.searchParams.set('verbose', 'true');

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          Accept: 'application/json',
          Key: apiKey,
        },
      },
      ABUSE_IPDB_TIMEOUT_MS
    );
    if (!response.ok) return null;

    const json = await response.json();
    const data = json?.data || {};
    const score = Number(data.abuseConfidenceScore);
    if (!Number.isFinite(score)) return null;

    return {
      source: 'AbuseIPDB',
      score: Math.max(0, Math.min(100, Math.round(score))),
      reportCount: Number.isFinite(Number(data.totalReports)) ? Number(data.totalReports) : 0,
      usageType: String(data.usageType || '').trim() || null,
      isp: String(data.isp || '').trim() || null,
      domain: String(data.domain || '').trim() || null,
      lastReportedAt: String(data.lastReportedAt || '').trim() || null,
      raw: data,
    };
  } catch {
    return null;
  }
}

export async function getIpReputationIntelCached(ip) {
  const normalizedIp = normalizeIpAddress(ip);
  if (!normalizedIp) {
    return {
      success: false,
      ip: null,
      score: null,
      level: null,
      sources: [],
      reasons: [],
    };
  }

  if (isPrivateIp(normalizedIp)) {
    return {
      success: true,
      ip: normalizedIp,
      score: 0,
      level: 'low',
      sources: ['private-network'],
      reasons: ['Private/local IP address'],
      reportCount: 0,
    };
  }

  const cached = reputationCache.get(normalizedIp);
  if (cached && Date.now() - cached.timestamp < REPUTATION_CACHE_TTL_MS) {
    return cached.value;
  }

  const abuse = await fetchAbuseIpDbScore(normalizedIp);

  let value;
  if (abuse) {
    const reasons = [];
    if (abuse.reportCount > 0) {
      reasons.push(`${abuse.reportCount} AbuseIPDB reports`);
    } else {
      reasons.push('AbuseIPDB score available');
    }
    value = {
      success: true,
      ip: normalizedIp,
      score: abuse.score,
      level: mapScoreToLevel(abuse.score),
      sources: [abuse.source],
      reasons,
      reportCount: abuse.reportCount,
      providerUsageType: abuse.usageType,
      providerIsp: abuse.isp,
      providerDomain: abuse.domain,
      lastReportedAt: abuse.lastReportedAt,
    };
  } else {
    value = {
      success: false,
      ip: normalizedIp,
      score: null,
      level: null,
      sources: [],
      reasons: [],
      reportCount: 0,
    };
  }

  reputationCache.set(normalizedIp, {
    value,
    timestamp: Date.now(),
  });
  return value;
}
