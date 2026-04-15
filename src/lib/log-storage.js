import { FieldValue } from 'firebase-admin/firestore';
import { normalizeDomainInput } from './domain-utils.js';
import { normalizeIpAddress } from './ip-utils.js';
import { classifyAttack, getDecisionKey } from './log-analytics.js';
import { deriveRuleId } from './log-rule-utils.js';
import { getTenantRetentionSettings } from './tenant-subscription.js';
import {
  getAllowedRawLogSampleRate,
  getTrafficLoggingConfig,
  shouldStoreAllowedRawLogs,
} from './traffic-logging.js';

const FIRESTORE_LOG_TTL_HOURS = 24;
const FIRESTORE_LOG_TTL_MS = FIRESTORE_LOG_TTL_HOURS * 60 * 60 * 1000;

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

function normalizeRequestMethod(value) {
  const method = String(value || '').trim();
  return method ? method.toUpperCase() : null;
}

function normalizeRequestUri(value) {
  const uri = String(value || '').trim();
  return uri || null;
}

function buildSearchIps(rawLog) {
  const values = [
    normalizeIpAddress(rawLog?.ipAddress || ''),
    normalizeIpAddress(rawLog?.clientIp || ''),
    ...(Array.isArray(rawLog?.forwardedFor)
      ? rawLog.forwardedFor.map((value) => normalizeIpAddress(String(value || '')))
      : []),
  ].filter(Boolean);

  return Array.from(new Set(values));
}

function getRollupDocumentId(tenantName, bucketKey, site) {
  const siteKey = site ? encodeCounterKey(site) : 'unknown-site';
  return `${tenantName}_${bucketKey}_${siteKey}`;
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

function shouldPersistRawLog(log, trafficLoggingConfig) {
  const decision = getDecisionKey(log);

  if (decision !== 'allowed') {
    return true;
  }

  if (shouldAlwaysPersistAllowedLog(log)) {
    return true;
  }

  if (!shouldStoreAllowedRawLogs(trafficLoggingConfig)) {
    return false;
  }

  const sampleRate = getAllowedRawLogSampleRate(trafficLoggingConfig);

  if (sampleRate <= 1) {
    return true;
  }

  return Math.random() < 1 / sampleRate;
}

function shouldAlwaysPersistAllowedLog(log) {
  if (getDecisionKey(log) !== 'allowed') {
    return false;
  }

  const severity = normalizeSeverity(log.severity);
  const attackType = classifyAttack(log);
  const derivedRuleId = deriveRuleId({
    ruleId: log?.ruleId,
    ruleMessage: log?.ruleMessage,
    message: log?.message,
    blocked: Boolean(log?.blocked),
    statusCode: log?.statusCode,
  });
  const hasRuleContext = Boolean(String(log?.ruleMessage || '').trim());
  const hasExplicitRuleId = Boolean(String(log?.ruleId || '').trim());
  const hasAttackClassification = attackType !== 'Other';
  const hasMeaningfulDerivedRuleId =
    Boolean(derivedRuleId) && !['WAF-EVENT', 'HTTP-2XX', 'HTTP-3XX'].includes(derivedRuleId);
  const hasElevatedSeverity = ['warning', 'medium', 'high', 'critical'].includes(severity);

  return (
    hasElevatedSeverity &&
    (hasRuleContext || hasExplicitRuleId || hasAttackClassification || hasMeaningfulDerivedRuleId)
  );
}

function buildRollupUpdate(log, retentionDays) {
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
  const { bucketStart, bucketStartIso } = getHourBucketParts(log.timestamp);

  const update = {
    tenantName: log.tenantName,
    siteNormalized:
      normalizeDomainInput(log.site || log.source || log.request?.host || '') || null,
    bucketStart,
    bucketStartIso,
    expiresAt: new Date(bucketStart.getTime() + retentionDays * 24 * 60 * 60 * 1000),
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

  if (decision !== 'allowed') {
    const attackKey = encodeCounterKey(attackType);
    incrementCount(update, ['attackTypes', attackKey, 'count']);
    setValue(update, ['attackTypes', attackKey, 'label'], attackType);
  }

  if (ip && decision !== 'allowed') {
    const ipKey = encodeCounterKey(ip);
    incrementCount(update, ['blockedIps', ipKey, 'totalBlocked']);
    incrementCount(update, ['blockedIps', ipKey, 'wafBlocked'], decision === 'waf_blocked' ? 1 : 0);
    incrementCount(update, ['blockedIps', ipKey, 'originDenied'], decision === 'origin_denied' ? 1 : 0);
    setValue(update, ['blockedIps', ipKey, 'ip'], ip);
  }

  return update;
}

export async function persistSecurityLog(adminDb, rawLog, options = {}) {
  if (!adminDb || !rawLog?.tenantName) return null;

  const tenant = await getTenantRetentionSettings(adminDb, rawLog.tenantName);
  const analyticsRetentionDays = Number(tenant?.limits?.analyticsRetentionDays || 1);
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
    searchIps: buildSearchIps(rawLog),
    requestMethod: normalizeRequestMethod(rawLog.method || rawLog.request?.method),
    requestUri: normalizeRequestUri(rawLog.uri || rawLog.request?.uri || rawLog.request?.path),
    expiresAt: new Date(new Date(timestamp).getTime() + FIRESTORE_LOG_TTL_MS),
  };

  const batch = adminDb.batch();
  let logRef = null;
  const trafficLoggingConfig =
    options.trafficLoggingConfig ||
    (getDecisionKey(entry) === 'allowed'
      ? await getTrafficLoggingConfig(adminDb)
      : null);
  const persistRawLog = shouldPersistRawLog(entry, trafficLoggingConfig);

  if (persistRawLog) {
    logRef = adminDb.collection('logs').doc();
    batch.set(logRef, entry);
  }

  const rollupRef = adminDb
    .collection('log_rollups_hourly')
    .doc(getRollupDocumentId(rawLog.tenantName, bucketKey, site));
  batch.set(rollupRef, buildRollupUpdate(entry, analyticsRetentionDays), { merge: true });

  await batch.commit();
  return { id: logRef?.id || null, rawStored: persistRawLog, ...entry };
}
