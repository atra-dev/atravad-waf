import { normalizeDomainInput } from './domain-utils.js';

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

export async function getTenantTrafficStats(
  adminDb,
  tenantName,
  lookbackHours,
  { includeRawBackfill = true, includeRollups = true } = {}
) {
  const windowStartIso = new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000
  ).toISOString();
  const rollupsQuery = includeRollups
    ? adminDb
        .collection('log_rollups_hourly')
        .where('tenantName', '==', tenantName)
        .where('bucketStartIso', '>=', windowStartIso)
    : null;

  const logsQuery = includeRawBackfill
    ? adminDb
        .collection('logs')
        .where('tenantName', '==', tenantName)
        .where('timestamp', '>=', windowStartIso)
        .orderBy('timestamp', 'desc')
    : null;

  const [rollupsSnapshot, logsSnapshot] = await Promise.all([
    rollupsQuery ? rollupsQuery.get() : Promise.resolve(null),
    logsQuery ? logsQuery.get() : Promise.resolve(null),
  ]);

  const statsBySource = new Map();
  const coveredBuckets = new Set();

  if (rollupsSnapshot) {
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
  }

  if (logsSnapshot) {
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
  }

  return statsBySource;
}
