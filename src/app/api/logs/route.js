import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { geolocateIpCached } from '@/lib/geolocation';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';
import { persistSecurityLog } from '@/lib/log-storage';

const LOG_INGEST_API_KEY = process.env.LOG_INGEST_API_KEY || '';

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

    const rateLimitResult = await rateLimit(request, { routeGroup: '/api/logs' });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response;
    }

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'logs array is required' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const writtenLogs = [];

    for (const log of logs) {
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
        decision: deriveDecision(log),
        ingestedAt: now,
        ipAddress: clientIp,
        geoCountry: geo?.success ? geo.country || null : null,
        geoCountryCode: geo?.success ? geo.countryCode || null : null,
        geoContinent: geo?.success ? geo.continent || null : null,
        geoContinentCode: geo?.success ? geo.continentCode || null : null,
        geoIsPrivate: geo?.success ? Boolean(geo.isPrivate) : null,
      });
      writtenLogs.push(savedLog);
    }

    return NextResponse.json({
      success: true,
      ingested: writtenLogs.length,
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
    const hoursParam = Number.parseInt(searchParams.get('hours') || '24', 10);
    const hours = Number.isFinite(hoursParam) ? Math.min(Math.max(hoursParam, 1), 24) : 24;
    const site = normalizeDomainInput(searchParams.get('site') || '');
    const blockedFilter =
      blockedParam === 'true' ? true : blockedParam === 'false' ? false : null;

    let query = adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName)
      .where('timestamp', '>=', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

    if (level) {
      query = query.where('levelNormalized', '==', level);
    }
    if (severity) {
      query = query.where('severityNormalized', '==', severity);
    }
    if (blockedFilter !== null) {
      query = query.where('blocked', '==', blockedFilter);
    }
    if (decisionParam) {
      query = query.where('decision', '==', decisionParam);
    }
    if (site) {
      query = query.where('siteNormalized', '==', site);
    }

    query = query.orderBy('timestamp', 'desc').limit(pageSize + 1);

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
    const logs = visibleDocs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      nodeId: doc.data().source ?? doc.data().nodeId,
    }));
    const nextCursor = hasMore ? visibleDocs[visibleDocs.length - 1]?.id || null : null;

    return NextResponse.json({
      logs,
      count: logs.length,
      hasMore,
      pageSize,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
