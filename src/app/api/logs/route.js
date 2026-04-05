import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { geolocateIpCached } from '@/lib/geolocation';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';
import { persistSecurityLog } from '@/lib/log-storage';
import { getTenantSummary } from '@/lib/tenant-subscription';
import { getTrafficLoggingConfig } from '@/lib/traffic-logging';
import { ANALYTICS_DISPLAY_HOURS } from '@/lib/analytics-window';

const LOG_INGEST_API_KEY = process.env.LOG_INGEST_API_KEY || '';
const MAX_INGEST_BATCH_SIZE = Math.max(
  Number.parseInt(process.env.WAF_LOG_INGEST_MAX_BATCH || '50', 10) || 50,
  1
);
const LOW_VALUE_PATH_PREFIXES = ['/_next/', '/static/', '/assets/'];
const LOW_VALUE_PATH_EXACT = new Set([
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
  '/health',
  '/_atravad/health',
]);
const LOW_VALUE_PATH_EXTENSIONS = [
  '.js',
  '.css',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
];
const BOT_UA_PATTERNS = [
  'googlebot',
  'bingbot',
  'yandexbot',
  'duckduckbot',
  'baiduspider',
  'slurp',
  'crawler',
  'spider',
  'bot/',
  'headlesschrome',
];

function normalizeSeverity(severity) {
  const value = String(severity || '').trim().toLowerCase();
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'warn' || value === 'warning') return 'warning';
  if (value === 'low') return 'low';
  if (value === 'info' || value === 'informational') return 'info';
  return value;
}

function normalizeLevel(level) {
  const value = String(level || '').trim().toLowerCase();
  if (value === 'warning') return 'warn';
  if (value === 'err') return 'error';
  if (value === 'information') return 'info';
  return value;
}

function normalizeRequestMethod(value) {
  const method = String(value || '').trim();
  return method ? method.toUpperCase() : null;
}

function normalizeRequestUri(value) {
  const uri = String(value || '').trim();
  return uri || null;
}

function deriveDecision(log) {
  const decision = String(log?.decision || '').trim().toLowerCase();
  if (decision === 'blocked') return 'waf_blocked';
  if (decision === 'denied') return 'origin_denied';
  if (decision === 'waf_blocked' || decision === 'origin_denied' || decision === 'allowed') {
    return decision;
  }
  if (Boolean(log?.blocked)) return 'waf_blocked';
  const statusCode = Number(log?.statusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400) return 'origin_denied';
  return 'allowed';
}

function mapLogDocument(doc) {
  return {
    id: doc.id,
    ...doc.data(),
    nodeId: doc.data().source ?? doc.data().nodeId,
  };
}

function getLogPath(log) {
  const rawPath = String(log?.uri || log?.request?.uri || '').split('?')[0] || '/';
  return rawPath.startsWith('/') ? rawPath.toLowerCase() : `/${rawPath.toLowerCase()}`;
}

function isLowValueAllowedLog(log, decision) {
  if (decision !== 'allowed') return false;

  const pathname = getLogPath(log);
  if (LOW_VALUE_PATH_EXACT.has(pathname)) return true;
  if (LOW_VALUE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  if (LOW_VALUE_PATH_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return true;

  const normalizedUa = String(log?.userAgent || '').toLowerCase();
  if (!normalizedUa) return false;
  return BOT_UA_PATTERNS.some((pattern) => normalizedUa.includes(pattern));
}

function getBatchDedupKey(log, tenantName, decision) {
  const clientIp = normalizeIpAddress(log.clientIp || log.ipAddress || '') || '';
  const host =
    normalizeDomainInput(log.source || log.request?.host || '') ||
    normalizeDomainInput(log.nodeId || '') ||
    tenantName;
  const path = getLogPath(log);
  const statusCode = Number(log?.statusCode);
  const derivedRuleId = deriveRuleId({
    ruleId: log?.ruleId,
    ruleMessage: log?.ruleMessage,
    message: log?.message,
    blocked: Boolean(log?.blocked),
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
  });

  return [
    tenantName,
    host,
    path,
    decision,
    Number.isFinite(statusCode) ? statusCode : '',
    derivedRuleId || '',
    clientIp,
  ].join('|');
}

/**
 * POST /api/logs
 * Log ingestion for WAF edge. Auth via LOG_INGEST_API_KEY + tenant name.
 * No nodes; Sucuri-style flow.
 */
export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const ingestKey = request.headers.get('x-log-api-key') || request.headers.get('X-Log-Api-Key') || body.logApiKey;
    const tenantName = request.headers.get('x-tenant-name') || request.headers.get('X-Tenant-Name') || body.tenantName;
    const { logs } = body;

    if (!LOG_INGEST_API_KEY || ingestKey !== LOG_INGEST_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing log API key. Set LOG_INGEST_API_KEY and send it via X-Log-Api-Key or body.logApiKey.' },
        { status: 401 }
      );
    }

    if (!tenantName || typeof tenantName !== 'string' || !tenantName.trim()) {
      return NextResponse.json(
        { error: 'tenantName is required (X-Tenant-Name header or body.tenantName)' },
        { status: 400 }
      );
    }

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'logs array is required' },
        { status: 400 }
      );
    }

    if (logs.length > MAX_INGEST_BATCH_SIZE) {
      return NextResponse.json(
        {
          error: `logs batch too large. Maximum ${MAX_INGEST_BATCH_SIZE} logs per request.`,
        },
        { status: 413 }
      );
    }

    const now = new Date().toISOString();
    const writtenLogs = [];
    const seenLogs = new Set();
    let skippedLowValue = 0;
    let skippedDuplicates = 0;
    const trafficLoggingConfig = await getTrafficLoggingConfig(adminDb);

    for (const log of logs) {
      const decision = deriveDecision(log);
      if (isLowValueAllowedLog(log, decision)) {
        skippedLowValue += 1;
        continue;
      }

      const dedupKey = getBatchDedupKey(log, tenantName.trim(), decision);
      if (seenLogs.has(dedupKey)) {
        skippedDuplicates += 1;
        continue;
      }
      seenLogs.add(dedupKey);

      const clientIp = normalizeIpAddress(log.clientIp || log.ipAddress || '') || null;
      const proxyIp = normalizeIpAddress(log.proxyIp || '') || null;
      const forwardedFor = Array.isArray(log.forwardedFor)
        ? log.forwardedFor.map((value) => normalizeIpAddress(String(value || ''))).filter(Boolean)
        : [];
      const geo = clientIp ? await geolocateIpCached(clientIp) : null;
      const normalizedLevel = normalizeLevel(log.level || 'info') || 'info';
      const normalizedSeverity = normalizeSeverity(log.severity || null) || null;
      const savedLog = await persistSecurityLog(adminDb, {
        source:
          normalizeDomainInput(log.source || log.request?.host || '') ||
          normalizeDomainInput(log.nodeId || '') ||
          tenantName,
        tenantName: tenantName.trim(),
        timestamp: log.timestamp || now,
        level: log.level || normalizedLevel,
        levelNormalized: normalizedLevel,
        message: log.message,
        ruleId: deriveRuleId({
          ruleId: log.ruleId,
          ruleMessage: log.ruleMessage,
          message: log.message,
          blocked: log.blocked || false,
          statusCode: log.statusCode || null,
        }),
        ruleMessage: log.ruleMessage || null,
        severity: log.severity || normalizedSeverity,
        severityNormalized: normalizedSeverity,
        request: log.request || null,
        response: log.response || null,
        clientIp,
        proxyIp,
        forwardedFor,
        trustedProxy: Boolean(log.trustedProxy),
        userAgent: log.userAgent || null,
        uri: log.uri || null,
        method: log.method || null,
        statusCode: log.statusCode || null,
        blocked: log.blocked || false,
        decision,
        ingestedAt: now,
        ipAddress: clientIp,
        geoCountry: geo?.success ? geo.country || null : null,
        geoCountryCode: geo?.success ? geo.countryCode || null : null,
        geoContinent: geo?.success ? geo.continent || null : null,
        geoContinentCode: geo?.success ? geo.continentCode || null : null,
        geoIsPrivate: geo?.success ? Boolean(geo.isPrivate) : null,
      }, { trafficLoggingConfig });
      writtenLogs.push(savedLog);
    }

    return NextResponse.json({
      success: true,
      ingested: writtenLogs.length,
      skippedLowValue,
      skippedDuplicates,
      timestamp: now,
    });
  } catch (error) {
    console.error('Error ingesting logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logs
 * Retrieve logs (analysts and admins only). Filter by tenant; no nodeId.
 */
export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authCheck = await checkAuthorization(adminDb, user.email, 'read', 'logs');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ logs: [] });
    }

    const tenant = await getTenantSummary(adminDb, tenantName);

    const { searchParams } = new URL(request.url);
    const level = normalizeLevel(searchParams.get('level'));
    const severity = normalizeSeverity(searchParams.get('severity'));
    const blockedParam = searchParams.get('blocked');
    const decisionParamRaw = String(searchParams.get('decision') || '').trim().toLowerCase();
    const decisionParam =
      decisionParamRaw === 'blocked'
        ? 'waf_blocked'
        : decisionParamRaw === 'denied'
          ? 'origin_denied'
          : decisionParamRaw;
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '100', 10);
    const pageSize = Math.min(Math.max(pageSizeRaw || 100, 1), 500);
    const cursor = String(searchParams.get('cursor') || '').trim();
    const maxLookbackHours = Number(tenant?.limits?.maxLogLookbackHours || 24);
    const hours = Math.min(ANALYTICS_DISPLAY_HOURS, maxLookbackHours);
    const site = normalizeDomainInput(searchParams.get('site') || '');
    const requestMethod = normalizeRequestMethod(searchParams.get('method'));
    const requestUri = normalizeRequestUri(searchParams.get('uri'));
    const search = String(searchParams.get('search') || '').trim();
    const normalizedSearchIp = normalizeIpAddress(search);
    const blockedFilter =
      blockedParam === 'true' ? true : blockedParam === 'false' ? false : null;
    const countOnly = String(searchParams.get('countOnly') || '')
      .trim()
      .toLowerCase() === 'true';
    const includeCount = countOnly || !cursor;

    let baseQuery = adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName)
      .where('timestamp', '>=', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

    if (level) {
      baseQuery = baseQuery.where('levelNormalized', '==', level);
    }
    if (severity) {
      baseQuery = baseQuery.where('severityNormalized', '==', severity);
    }
    if (blockedFilter !== null) {
      baseQuery = baseQuery.where('blocked', '==', blockedFilter);
    }
    if (decisionParam) {
      baseQuery = baseQuery.where('decision', '==', decisionParam);
    }
    if (site) {
      baseQuery = baseQuery.where('siteNormalized', '==', site);
    }
    if (requestMethod) {
      baseQuery = baseQuery.where('method', '==', requestMethod);
    }
    if (requestUri) {
      baseQuery = baseQuery.where('uri', '==', requestUri);
    }

    if (normalizedSearchIp) {
      const [ipSnapshot, clientIpSnapshot, forwardedForSnapshot] = await Promise.all([
        baseQuery.where('ipAddress', '==', normalizedSearchIp).get(),
        baseQuery.where('clientIp', '==', normalizedSearchIp).get(),
        baseQuery.where('forwardedFor', 'array-contains', normalizedSearchIp).get(),
      ]);

      const mergedDocs = new Map();
      for (const snapshot of [ipSnapshot, clientIpSnapshot, forwardedForSnapshot]) {
        for (const doc of snapshot.docs) {
          mergedDocs.set(doc.id, doc);
        }
      }

      const orderedLogs = Array.from(mergedDocs.values())
        .map(mapLogDocument)
        .sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));

      const totalStoredCount = orderedLogs.length;

      if (countOnly) {
        return NextResponse.json({ totalStoredCount });
      }

      const cursorIndex = cursor
        ? orderedLogs.findIndex((log) => log.id === cursor)
        : -1;
      const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const visibleLogs = orderedLogs.slice(startIndex, startIndex + pageSize);
      const hasMore = startIndex + pageSize < orderedLogs.length;
      const nextCursor = hasMore ? visibleLogs[visibleLogs.length - 1]?.id || null : null;

      return NextResponse.json({
        logs: visibleLogs,
        count: visibleLogs.length,
        totalStoredCount,
        hasMore,
        pageSize,
        nextCursor,
        maxLookbackHours,
      });
    }

    let totalStoredCount = null;
    if (includeCount) {
      const countSnapshot = await baseQuery.count().get();
      totalStoredCount = Number(countSnapshot?.data()?.count || 0);
    }

    if (countOnly) {
      return NextResponse.json({ totalStoredCount });
    }

    let query = baseQuery.orderBy('timestamp', 'desc').limit(pageSize + 1);

    if (cursor) {
      const cursorDoc = await adminDb.collection('logs').doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const logsSnapshot = await query.get();
    const docs = logsSnapshot.docs;
    const hasMore = docs.length > pageSize;
    const visibleDocs = hasMore ? docs.slice(0, pageSize) : docs;
    const logs = visibleDocs.map(mapLogDocument);
    const nextCursor = hasMore ? visibleDocs[visibleDocs.length - 1]?.id || null : null;

    return NextResponse.json({
      logs,
      count: logs.length,
      totalStoredCount,
      hasMore,
      pageSize,
      nextCursor,
      maxLookbackHours,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
