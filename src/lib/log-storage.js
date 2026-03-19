import { FieldValue } from 'firebase-admin/firestore';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { classifyAttack, getDecisionKey } from '@/lib/log-analytics';

const RAW_LOG_TTL_HOURS = 24;
const HOURLY_ROLLUP_TTL_DAYS = 30;

function normalizeSeverity(severity) {
  const value = String(severity || '').trim().toLowerCase();
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'medium') return 'medium';
  if (value === 'warn' || value === 'warning') return 'warning';
  if (value === 'low') return 'low';
  if (value === 'info' || value === 'informational') return 'info';
  return value || 'info';
}

function getHourBucketParts(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  const bucketStart = new Date(date);
  bucketStart.setMinutes(0, 0, 0);
  const bucketStartIso = bucketStart.toISOString();
  const bucketKey = bucketStartIso.slice(0, 13).replace(/[-:T]/g, '');
  return { bucketStart, bucketStartIso, bucketKey };
}

function encodeCounterKey(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url');
}

function incrementCount(target, path, amount = 1) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] = cursor[key] || {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = FieldValue.increment(amount);
}

function setValue(target, path, value) {
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    cursor[key] = cursor[key] || {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function buildRollupUpdate(log) {
  const decision = getDecisionKey(log);
  const severity = normalizeSeverity(log.severity);
  const method = String(log.method || log.request?.method || 'UNKNOWN').toUpperCase();
  const statusCode = Number(log.statusCode);
  const statusBucket = Number.isFinite(statusCode)
    ? `${Math.floor(statusCode / 100) * 100}xx`
    : 'unknown';
  const countryCode = String(log.geoCountryCode || '').trim().toUpperCase() || 'XX';
  const countryName = String(log.geoCountry || '').trim() || 'Unknown';
  const attackType = classifyAttack(log);
  const ip = normalizeIpAddress(log.ipAddress || log.clientIp || '');

  const update = {
    tenantName: log.tenantName,
    siteNormalized:
      normalizeDomainInput(log.site || log.source || log.request?.host || '') || null,
    bucketStart: getHourBucketParts(log.timestamp).bucketStart,
    bucketStartIso: getHourBucketParts(log.timestamp).bucketStartIso,
    expiresAt: new Date(Date.now() + HOURLY_ROLLUP_TTL_DAYS * 24 * 60 * 60 * 1000),
    updatedAt: new Date().toISOString(),
  };

  incrementCount(update, ['totals', 'total']);
  incrementCount(update, ['totals', 'allowed'], decision === 'allowed' ? 1 : 0);
  incrementCount(update, ['totals', 'wafBlocked'], decision === 'waf_blocked' ? 1 : 0);
  incrementCount(update, ['totals', 'originDenied'], decision === 'origin_denied' ? 1 : 0);
  incrementCount(update, ['severities', severity]);
  incrementCount(update, ['methods', method]);
  incrementCount(update, ['statuses', statusBucket]);

  incrementCount(update, ['countries', countryCode, 'count']);
  incrementCount(update, ['countries', countryCode, 'allowed'], decision === 'allowed' ? 1 : 0);
  incrementCount(update, ['countries', countryCode, 'wafBlocked'], decision === 'waf_blocked' ? 1 : 0);
  incrementCount(update, ['countries', countryCode, 'originDenied'], decision === 'origin_denied' ? 1 : 0);
  incrementCount(
    update,
    ['countries', countryCode, 'blocked'],
    decision === 'allowed' ? 0 : 1
  );
  setValue(update, ['countries', countryCode, 'name'], countryName);

  const attackKey = encodeCounterKey(attackType);
  incrementCount(update, ['attackTypes', attackKey, 'count']);
  setValue(update, ['attackTypes', attackKey, 'label'], attackType);

  if (ip && decision !== 'allowed') {
    const ipKey = encodeCounterKey(ip);
    incrementCount(update, ['blockedIps', ipKey, 'totalBlocked']);
    incrementCount(update, ['blockedIps', ipKey, 'wafBlocked'], decision === 'waf_blocked' ? 1 : 0);
    incrementCount(update, ['blockedIps', ipKey, 'originDenied'], decision === 'origin_denied' ? 1 : 0);
    setValue(update, ['blockedIps', ipKey, 'ip'], ip);
  }

  return update;
}

export async function persistSecurityLog(adminDb, rawLog) {
  if (!adminDb || !rawLog?.tenantName) return null;

  const timestamp = rawLog.timestamp || new Date().toISOString();
  const site =
    normalizeDomainInput(rawLog.source || rawLog.request?.host || rawLog.request?.hostname || '') ||
    null;
  const severityNormalized = normalizeSeverity(rawLog.severity);
  const decision = getDecisionKey(rawLog);
  const { bucketKey } = getHourBucketParts(timestamp);

  const entry = {
    ...rawLog,
    timestamp,
    severityNormalized,
    decision,
    site,
    siteNormalized: site,
    expiresAt: new Date(Date.now() + RAW_LOG_TTL_HOURS * 60 * 60 * 1000),
  };

  const batch = adminDb.batch();
  const logRef = adminDb.collection('logs').doc();
  batch.set(logRef, entry);

  const rollupRef = adminDb
    .collection('log_rollups_hourly')
    .doc(`${rawLog.tenantName}_${bucketKey}`);
  batch.set(rollupRef, buildRollupUpdate(entry), { merge: true });

  await batch.commit();
  return { id: logRef.id, ...entry };
}
