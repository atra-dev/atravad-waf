import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { normalizeIpAddress } from '@/lib/ip-utils';
import { classifyAttack, getDecisionKey } from '@/lib/log-analytics';

function addCount(map, key, amount) {
  if (!key || !Number.isFinite(amount) || amount === 0) return;
  map.set(key, (map.get(key) || 0) + amount);
}

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

function createEmptyAnalytics() {
  return {
    summary: { totalRequests: 0, wafBlocked: 0, originDenied: 0, allowed: 0, uniqueCountries: 0 },
    countries: [],
    timeSeries: [],
    methods: [],
    statuses: [],
    topBlockedIps: [],
    attackTypes: [],
    severityCounts: { critical: 0, high: 0, medium: 0, warning: 0, low: 0, info: 0 },
    topIPs: [],
  };
}

function sortStatuses(entries) {
  return entries
    .map(([label, count]) => ({ label, count, status: Number.parseInt(label, 10) || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildAnalyticsResponse({
  countriesMap,
  methodsMap,
  statusesMap,
  blockedIpsMap,
  attackTypesMap,
  severityCounts,
  timeSeries,
  summary,
}) {
  const countries = Array.from(countriesMap.values()).sort((a, b) => b.count - a.count);
  summary.uniqueCountries = countries.length;

  const methods = Array.from(methodsMap.entries())
    .map(([method, count]) => ({ method, count }))
    .sort((a, b) => b.count - a.count);

  const statuses = sortStatuses(Array.from(statusesMap.entries()));

  const topBlockedIps = Array.from(blockedIpsMap.values())
    .sort((a, b) => b.totalBlocked - a.totalBlocked)
    .slice(0, 10);

  const attackTypes = Array.from(attackTypesMap.entries())
    .map(([name, count]) => [name, count])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return {
    summary,
    countries,
    timeSeries,
    methods,
    statuses,
    topBlockedIps,
    attackTypes,
    severityCounts,
    topIPs: topBlockedIps.map((item) => [item.ip, item.totalBlocked]),
  };
}

function aggregateRawLogs(logs) {
  const countriesMap = new Map();
  const methodsMap = new Map();
  const statusesMap = new Map();
  const blockedIpsMap = new Map();
  const attackTypesMap = new Map();
  const timeSeriesMap = new Map();
  const severityCounts = { critical: 0, high: 0, medium: 0, warning: 0, low: 0, info: 0 };
  const summary = { totalRequests: 0, wafBlocked: 0, originDenied: 0, allowed: 0, uniqueCountries: 0 };

  for (const log of logs) {
    const decision = getDecisionKey(log);
    const severity = normalizeSeverity(log.severity) || 'info';
    const method = String(log.method || log.request?.method || 'UNKNOWN').toUpperCase();
    const statusCode = Number(log.statusCode);
    const statusBucket = Number.isFinite(statusCode)
      ? `${Math.floor(statusCode / 100) * 100}xx`
      : 'unknown';
    const countryCode = String(log.geoCountryCode || '').trim().toUpperCase() || 'XX';
    const countryName = String(log.geoCountry || '').trim() || 'Unknown';
    const attackType = classifyAttack(log);
    const ip = normalizeIpAddress(log.ipAddress || log.clientIp || '');

    summary.totalRequests += 1;
    if (decision === 'waf_blocked') summary.wafBlocked += 1;
    if (decision === 'origin_denied') summary.originDenied += 1;
    if (decision === 'allowed') summary.allowed += 1;

    if (severityCounts[severity] !== undefined) {
      severityCounts[severity] += 1;
    }

    addCount(methodsMap, method, 1);
    addCount(statusesMap, statusBucket, 1);
    addCount(attackTypesMap, attackType, 1);

    const country = countriesMap.get(countryCode) || {
      code: countryCode,
      name: countryName,
      count: 0,
      blocked: 0,
      wafBlocked: 0,
      originDenied: 0,
      allowed: 0,
    };
    country.count += 1;
    if (decision === 'waf_blocked') {
      country.blocked += 1;
      country.wafBlocked += 1;
    } else if (decision === 'origin_denied') {
      country.blocked += 1;
      country.originDenied += 1;
    } else {
      country.allowed += 1;
    }
    countriesMap.set(countryCode, country);

    if (ip && decision !== 'allowed') {
      const blockedIp = blockedIpsMap.get(ip) || {
        ip,
        totalBlocked: 0,
        wafBlocked: 0,
        originDenied: 0,
      };
      blockedIp.totalBlocked += 1;
      if (decision === 'waf_blocked') blockedIp.wafBlocked += 1;
      if (decision === 'origin_denied') blockedIp.originDenied += 1;
      blockedIpsMap.set(ip, blockedIp);
    }

    const bucket = new Date(log.timestamp || Date.now());
    bucket.setMinutes(0, 0, 0);
    const bucketKey = bucket.toISOString();
    const series = timeSeriesMap.get(bucketKey) || {
      time: bucketKey,
      total: 0,
      wafBlocked: 0,
      originDenied: 0,
      allowed: 0,
      critical: 0,
      high: 0,
      medium: 0,
      warning: 0,
      low: 0,
      info: 0,
    };

    series.total += 1;
    if (decision === 'waf_blocked') series.wafBlocked += 1;
    if (decision === 'origin_denied') series.originDenied += 1;
    if (decision === 'allowed') series.allowed += 1;
    if (series[severity] !== undefined) {
      series[severity] += 1;
    }
    timeSeriesMap.set(bucketKey, series);
  }

  const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) => a.time.localeCompare(b.time));
  return buildAnalyticsResponse({
    countriesMap,
    methodsMap,
    statusesMap,
    blockedIpsMap,
    attackTypesMap,
    severityCounts,
    timeSeries,
    summary,
  });
}

function aggregateRollups(docs) {
  const countriesMap = new Map();
  const methodsMap = new Map();
  const statusesMap = new Map();
  const blockedIpsMap = new Map();
  const attackTypesMap = new Map();
  const severityCounts = { critical: 0, high: 0, medium: 0, warning: 0, low: 0, info: 0 };
  const timeSeries = [];
  const summary = { totalRequests: 0, wafBlocked: 0, originDenied: 0, allowed: 0, uniqueCountries: 0 };

  for (const doc of docs) {
    const totals = doc.totals || {};
    const seriesRow = {
      time: doc.bucketStartIso,
      total: Number(totals.total || 0),
      wafBlocked: Number(totals.wafBlocked || 0),
      originDenied: Number(totals.originDenied || 0),
      allowed: Number(totals.allowed || 0),
      critical: Number(doc.severities?.critical || 0),
      high: Number(doc.severities?.high || 0),
      medium: Number(doc.severities?.medium || 0),
      warning: Number(doc.severities?.warning || 0),
      low: Number(doc.severities?.low || 0),
      info: Number(doc.severities?.info || 0),
    };
    timeSeries.push(seriesRow);

    summary.totalRequests += seriesRow.total;
    summary.wafBlocked += seriesRow.wafBlocked;
    summary.originDenied += seriesRow.originDenied;
    summary.allowed += seriesRow.allowed;

    for (const [severity, count] of Object.entries(doc.severities || {})) {
      if (severityCounts[severity] !== undefined) {
        severityCounts[severity] += Number(count || 0);
      }
    }

    for (const [method, count] of Object.entries(doc.methods || {})) {
      addCount(methodsMap, method, Number(count || 0));
    }

    for (const [status, count] of Object.entries(doc.statuses || {})) {
      addCount(statusesMap, status, Number(count || 0));
    }

    for (const [countryCode, data] of Object.entries(doc.countries || {})) {
      const existing = countriesMap.get(countryCode) || {
        code: countryCode,
        name: data?.name || countryCode,
        count: 0,
        blocked: 0,
        wafBlocked: 0,
        originDenied: 0,
        allowed: 0,
      };
      existing.count += Number(data?.count || 0);
      existing.blocked += Number(data?.blocked || 0);
      existing.wafBlocked += Number(data?.wafBlocked || 0);
      existing.originDenied += Number(data?.originDenied || 0);
      existing.allowed += Number(data?.allowed || 0);
      countriesMap.set(countryCode, existing);
    }

    for (const [, data] of Object.entries(doc.blockedIps || {})) {
      const ip = String(data?.ip || '').trim();
      if (!ip) continue;
      const existing = blockedIpsMap.get(ip) || {
        ip,
        totalBlocked: 0,
        wafBlocked: 0,
        originDenied: 0,
      };
      existing.totalBlocked += Number(data?.totalBlocked || 0);
      existing.wafBlocked += Number(data?.wafBlocked || 0);
      existing.originDenied += Number(data?.originDenied || 0);
      blockedIpsMap.set(ip, existing);
    }

    for (const [, data] of Object.entries(doc.attackTypes || {})) {
      const label = String(data?.label || '').trim();
      if (!label) continue;
      addCount(attackTypesMap, label, Number(data?.count || 0));
    }
  }

  return buildAnalyticsResponse({
    countriesMap,
    methodsMap,
    statusesMap,
    blockedIpsMap,
    attackTypesMap,
    severityCounts,
    timeSeries: timeSeries.slice(-24),
    summary,
  });
}

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
      return NextResponse.json(createEmptyAnalytics());
    }

    const { searchParams } = new URL(request.url);
    const hoursParam = Number.parseInt(searchParams.get('hours') || '24', 10);
    const hours = Number.isFinite(hoursParam) ? Math.min(Math.max(hoursParam, 1), 24 * 30) : 24;
    const site = normalizeDomainInput(searchParams.get('site') || '');
    const severity = normalizeSeverity(searchParams.get('severity'));
    const decision = String(searchParams.get('decision') || '').trim().toLowerCase();

    // For the 24-hour dashboard views, compute analytics from the raw logs
    // collection so the counts match the logs table exactly.
    if (hours <= 24) {
      let query = adminDb
        .collection('logs')
        .where('tenantName', '==', tenantName)
        .where('timestamp', '>=', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString());

      if (site) {
        query = query.where('siteNormalized', '==', site);
      }
      if (severity) {
        query = query.where('severityNormalized', '==', severity);
      }
      if (decision) {
        query = query.where('decision', '==', decision);
      }

      const snapshot = await query.orderBy('timestamp', 'desc').get();
      const logs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json(aggregateRawLogs(logs));
    }

    let query = adminDb
      .collection('log_rollups_hourly')
      .where('tenantName', '==', tenantName)
      .where('bucketStartIso', '>=', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .orderBy('bucketStartIso', 'asc');

    if (site) {
      query = query.where('siteNormalized', '==', site);
    }

    const snapshot = await query.get();
    const docs = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json(aggregateRollups(docs));
  } catch (error) {
    console.error('Error fetching log analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
