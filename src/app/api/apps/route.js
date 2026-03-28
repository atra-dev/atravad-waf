import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { getRegionByContinent, getDefaultRegion } from '@/lib/waf-config';
import { geolocateOrigin } from '@/lib/geolocation';
import { normalizeOriginConfig } from '@/lib/origin-utils';
import { validateCustomSsl, normalizePem } from '@/lib/ssl-utils';
import { hydrateAppActivation } from '@/lib/activation-utils';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { getOrSetServerCache, invalidateServerCache } from '@/lib/server-cache';
import { getTenantLimitStatus, invalidateTenantSubscriptionCache } from '@/lib/tenant-subscription';

const APPS_CACHE_TTL_MS = 60000;
const TRAFFIC_STATS_WINDOW_HOURS = 24;
const SITE_SCOPED_ROLLUP_ID_PATTERN = /_(\d{10})_([A-Za-z0-9_-]+)$/;

function normalizeLogSource(value) {
  return normalizeDomainInput(typeof value === 'string' ? value : '');
}

function deriveLogDecision(log) {
  const decision = String(log?.decision || '').trim().toLowerCase();
  if (decision === 'blocked') return 'waf_blocked';
  if (decision === 'denied') return 'origin_denied';
  if (
    decision === 'waf_blocked' ||
    decision === 'origin_denied' ||
    decision === 'allowed' ||
    decision === 'websocket_blocked' ||
    decision === 'websocket_denied' ||
    decision === 'websocket_proxy_error' ||
    decision === 'websocket_origin_response' ||
    decision === 'websocket_allowed'
  ) {
    return decision;
  }
  if (Boolean(log?.blocked)) return 'waf_blocked';
  const statusCode = Number(log?.statusCode);
  if (Number.isFinite(statusCode) && statusCode >= 400) return 'origin_denied';
  return 'allowed';
}

function getStatsEntry(statsBySource, source) {
  return (
    statsBySource.get(source) || {
      blocked: 0,
      allowed: 0,
      total: 0,
      lastSeenAt: null,
    }
  );
}

function updateLastSeen(existing, candidate) {
  if (!candidate) return;
  if (!existing.lastSeenAt || new Date(candidate).getTime() > new Date(existing.lastSeenAt).getTime()) {
    existing.lastSeenAt = candidate;
  }
}

function applyRollupStats(existing, rollup) {
  const totals = rollup?.totals || {};
  const allowed = Number(totals.allowed || 0);
  const wafBlocked = Number(totals.wafBlocked || 0);
  const originDenied = Number(totals.originDenied || 0);
  const total = Number(totals.total || allowed + wafBlocked + originDenied || 0);

  existing.allowed += allowed;
  existing.blocked += wafBlocked + originDenied;
  existing.total += total;
  updateLastSeen(existing, rollup?.updatedAt || rollup?.bucketStartIso || null);
}

function applyRawLogStats(existing, log) {
  const decision = deriveLogDecision(log);
  existing.total += 1;
  if (decision === 'allowed') {
    existing.allowed += 1;
  } else if (decision === 'waf_blocked' || decision === 'origin_denied') {
    existing.blocked += 1;
  }

  updateLastSeen(existing, log?.timestamp || log?.ingestedAt || null);
}

function getHourBucketIso(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function isSiteScopedRollupDocId(docId) {
  return SITE_SCOPED_ROLLUP_ID_PATTERN.test(String(docId || ''));
}

async function getTenantTrafficStats(tenantName) {
  const windowStartIso = new Date(
    Date.now() - TRAFFIC_STATS_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();
  const [rollupsSnapshot, logsSnapshot] = await Promise.all([
    adminDb
      .collection('log_rollups_hourly')
      .where('tenantName', '==', tenantName)
      .where('bucketStartIso', '>=', windowStartIso)
      .get(),
    adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName)
      .where('timestamp', '>=', windowStartIso)
      .orderBy('timestamp', 'desc')
      .get(),
  ]);

  const statsBySource = new Map();
  const coveredBuckets = new Set();

  for (const doc of rollupsSnapshot.docs) {
    if (!isSiteScopedRollupDocId(doc.id)) {
      continue;
    }

    const rollup = doc.data();
    const source = normalizeLogSource(rollup?.siteNormalized);
    const bucketStartIso = String(rollup?.bucketStartIso || '').trim();
    if (!source || !bucketStartIso) continue;

    const existing = getStatsEntry(statsBySource, source);
    applyRollupStats(existing, rollup);
    statsBySource.set(source, existing);
    coveredBuckets.add(`${source}|${bucketStartIso}`);
  }

  for (const doc of logsSnapshot.docs) {
    const log = doc.data();
    const source = normalizeLogSource(
      log?.siteNormalized || log?.site || log?.source || log?.request?.host
    );
    if (!source) continue;

    const bucketKey = `${source}|${getHourBucketIso(log?.timestamp || log?.ingestedAt)}`;
    if (coveredBuckets.has(bucketKey)) {
      const existing = getStatsEntry(statsBySource, source);
      updateLastSeen(existing, log?.timestamp || log?.ingestedAt || null);
      statsBySource.set(source, existing);
      continue;
    }

    const existing = getStatsEntry(statsBySource, source);
    applyRawLogStats(existing, log);
    statsBySource.set(source, existing);
  }

  return statsBySource;
}

function invalidateTenantAppCaches(tenantName) {
  invalidateServerCache(`apps:${tenantName}:`);
  invalidateServerCache(`policies:${tenantName}:`);
  invalidateServerCache(`analytics:${tenantName}:`);
  invalidateTenantSubscriptionCache(tenantName);
}

function sanitizeAppForClient(app) {
  const { tlsManaged, ssl, origins, ...safeApp } = app || {};
  const sanitizedSsl = ssl
    ? {
        ...ssl,
        cert: ssl.customCert ? '' : ssl.cert,
        key: ssl.customCert ? '' : ssl.key,
        fullchain: ssl.customCert ? '' : ssl.fullchain,
        hasStoredCustomCert: Boolean(ssl.customCert && ssl.cert && ssl.key),
      }
    : ssl;
  const sanitizedOrigins = Array.isArray(origins)
    ? origins.map((origin) => ({
        ...origin,
        authHeader: origin?.authHeader?.name
          ? { name: origin.authHeader.name, value: '' }
          : undefined,
        authHeaderConfigured: Boolean(origin?.authHeader?.name && origin?.authHeader?.value),
      }))
    : origins;
  return {
    ...safeApp,
    ssl: sanitizedSsl,
    origins: sanitizedOrigins,
  };
}

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check authorization - only admins can create apps
    const authCheck = await checkAuthorization(adminDb, user.email, 'create', 'apps');
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: 'Forbidden', details: authCheck.error },
        { status: 403 }
      );
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 400 });
    }

    const appLimit = await getTenantLimitStatus(adminDb, tenantName, 'maxApps');
    if (!appLimit.allowed) {
      return NextResponse.json(
        {
          error: `Plan limit reached: ${appLimit.current} of ${appLimit.limit} protected site slots used`,
          code: 'PLAN_LIMIT_MAX_APPS',
          limit: appLimit.limit,
          current: appLimit.current,
          planId: appLimit.tenant?.planId || null,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, domain, origins, ssl, routing, policyId, responseInspectionEnabled } = body;

    if (!name || !domain) {
      return NextResponse.json(
        { error: 'Name and domain are required' },
        { status: 400 }
      );
    }

    const normalizedDomain = normalizeDomainInput(domain);
    if (!normalizedDomain) {
      return NextResponse.json(
        { error: 'Invalid domain. Use a valid hostname like example.com' },
        { status: 400 }
      );
    }

    let normalizedOrigins = [];

    // Validate origins if provided
    if (origins && Array.isArray(origins)) {
      for (const origin of origins) {
        const normalizedOrigin = normalizeOriginConfig(origin);
        if (!normalizedOrigin.valid) {
          return NextResponse.json(
            { error: normalizedOrigin.error },
            { status: 400 }
          );
        }
        normalizedOrigins.push(normalizedOrigin.origin);
      }
    } else if (origins !== undefined) {
      return NextResponse.json(
        { error: 'Origins must be an array' },
        { status: 400 }
      );
    }

    // Validate and normalize SSL (custom certificate)
    let sslConfig = null;
    if (ssl && ssl.customCert) {
      const validation = validateCustomSsl(ssl);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
      sslConfig = {
        autoProvision: false,
        customCert: true,
        cert: normalizePem(ssl.cert),
        key: normalizePem(ssl.key),
        fullchain: ssl.fullchain ? normalizePem(ssl.fullchain) : null,
      };
    } else if (ssl) {
      sslConfig = { autoProvision: ssl.autoProvision !== false, customCert: false };
    }

    // Auto-assign WAF region based on origin server geolocation
    let wafRegion = getDefaultRegion();
    let originGeoData = null;

    // Try to geolocate the first origin to determine best WAF region
    if (normalizedOrigins.length > 0 && normalizedOrigins[0].url) {
      try {
        originGeoData = await geolocateOrigin(normalizedOrigins[0].url);
        if (originGeoData.success && originGeoData.continentCode) {
          wafRegion = getRegionByContinent(originGeoData.continentCode);
        }
      } catch (geoError) {
        console.warn('Geolocation failed, using default region:', geoError.message);
      }
    }

    const appRef = await adminDb.collection('applications').add({
      name,
      domain: normalizedDomain,
      origins: normalizedOrigins,
      ssl: sslConfig || ssl || null,
      routing: routing || { pathPrefix: '/', stripPath: false },
      policyId: policyId || null,
      responseInspectionEnabled: responseInspectionEnabled !== false,
      tenantName,
      // Automatically assigned WAF configuration based on geolocation
      wafRegion: wafRegion.id,
      wafRegionName: wafRegion.name,
      firewallIp: wafRegion.ip,
      firewallCname: wafRegion.cname || '',
      // Origin geolocation data (for reference)
      originCountry: originGeoData?.country || null,
      originContinent: originGeoData?.continent || null,
      activated: false, // DNS not yet configured
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    });

    invalidateTenantAppCaches(tenantName);

    return NextResponse.json({
      id: appRef.id,
      ...sanitizeAppForClient({
        name,
        domain: normalizedDomain,
        origins: normalizedOrigins,
        ssl: sslConfig || ssl || null,
        routing: routing || { pathPrefix: '/', stripPath: false },
        policyId: policyId || null,
        responseInspectionEnabled: responseInspectionEnabled !== false,
        wafRegion: wafRegion.id,
        wafRegionName: wafRegion.name,
        firewallIp: wafRegion.ip,
        firewallCname: wafRegion.cname || '',
        originCountry: originGeoData?.country || null,
        originContinent: originGeoData?.continent || null,
        activated: false,
      }),
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json([]);
    }

    const apps = await getOrSetServerCache(
      `apps:${tenantName}:list`,
      async () => {
        const [appsSnapshot, statsBySource] = await Promise.all([
          adminDb
            .collection('applications')
            .where('tenantName', '==', tenantName)
            .get(),
          getTenantTrafficStats(tenantName),
        ]);

        return Promise.all(appsSnapshot.docs.map(async (doc) => {
          const app = await hydrateAppActivation({
            id: doc.id,
            ...doc.data(),
          });
          const stats = statsBySource.get(normalizeDomainInput(app.domain)) || null;
          return sanitizeAppForClient({
            ...app,
            statsBlocked: stats?.blocked ?? 0,
            statsAllowed: stats?.allowed ?? 0,
            statsTotal: stats?.total ?? 0,
            statsLastSeenAt: stats?.lastSeenAt ?? null,
          });
        }));
      },
      { ttlMs: APPS_CACHE_TTL_MS }
    );

    return NextResponse.json(apps);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
