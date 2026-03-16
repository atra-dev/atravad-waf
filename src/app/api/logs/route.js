import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { geolocateIpCached } from '@/lib/geolocation';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { deriveRuleId } from '@/lib/log-rule-utils';

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
    const batch = adminDb.batch();

    for (const log of logs) {
      const clientIp = normalizeIpAddress(log.clientIp || log.ipAddress || '') || null;
      const geo = clientIp ? await geolocateIpCached(clientIp) : null;
      const normalizedLevel = normalizeLevel(log.level || 'info') || 'info';
      const normalizedSeverity = normalizeSeverity(log.severity || null) || null;
      const logRef = adminDb.collection('logs').doc();
      batch.set(logRef, {
        source: tenantName,
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
        userAgent: log.userAgent || null,
        uri: log.uri || null,
        method: log.method || null,
        statusCode: log.statusCode || null,
        blocked: log.blocked || false,
        ingestedAt: now,
        ipAddress: clientIp,
        geoCountry: geo?.success ? geo.country || null : null,
        geoCountryCode: geo?.success ? geo.countryCode || null : null,
        geoContinent: geo?.success ? geo.continent || null : null,
        geoContinentCode: geo?.success ? geo.continentCode || null : null,
        geoIsPrivate: geo?.success ? Boolean(geo.isPrivate) : null,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      ingested: logs.length,
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
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const startAfter = searchParams.get('startAfter');

    let query = adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName);

    // Mixed historical values (INFO/info, warning/warn, MEDIUM, etc.) make strict
    // Firestore equality filters unreliable. Fetch a wider tenant slice and filter
    // normalized values in-memory for stable behavior.
    const fetchLimit = startAfter ? limit * 4 : (level || severity ? limit * 5 : limit);
    const logsSnapshot = await query.limit(fetchLimit).get();

    let logs = logsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        nodeId: doc.data().source ?? doc.data().nodeId,
      }))
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
      });

    if (level) {
      logs = logs.filter((log) => normalizeLevel(log.levelNormalized || log.level) === level);
    }
    if (severity) {
      logs = logs.filter((log) => normalizeSeverity(log.severityNormalized || log.severity) === severity);
    }

    if (startAfter) {
      const startAfterIndex = logs.findIndex((log) => log.id === startAfter);
      if (startAfterIndex !== -1) {
        logs = logs.slice(startAfterIndex + 1);
      }
    }

    const hasMore = logs.length > limit;
    logs = logs.slice(0, limit);

    return NextResponse.json({
      logs,
      count: logs.length,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
