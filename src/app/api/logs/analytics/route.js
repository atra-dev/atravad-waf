import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { normalizeDomainInput } from '@/lib/domain-utils';

function addCount(map, key, amount) {
  if (!key || !Number.isFinite(amount) || amount === 0) return;
  map.set(key, (map.get(key) || 0) + amount);
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
      return NextResponse.json({
        summary: { totalRequests: 0, wafBlocked: 0, originDenied: 0, allowed: 0, uniqueCountries: 0 },
        countries: [],
        timeSeries: [],
        methods: [],
        statuses: [],
        topBlockedIps: [],
        attackTypes: [],
        severityCounts: { critical: 0, high: 0, medium: 0, warning: 0, low: 0, info: 0 },
      });
    }

    const { searchParams } = new URL(request.url);
    const hoursParam = Number.parseInt(searchParams.get('hours') || '24', 10);
    const hours = Number.isFinite(hoursParam) ? Math.min(Math.max(hoursParam, 1), 24 * 30) : 24;
    const site = normalizeDomainInput(searchParams.get('site') || '');

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

    const countries = Array.from(countriesMap.values()).sort((a, b) => b.count - a.count);
    summary.uniqueCountries = countries.length;

    const methods = Array.from(methodsMap.entries())
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count);

    const statuses = Array.from(statusesMap.entries())
      .map(([label, count]) => ({ label, count, status: Number.parseInt(label, 10) || 0 }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const topBlockedIps = Array.from(blockedIpsMap.values())
      .sort((a, b) => b.totalBlocked - a.totalBlocked)
      .slice(0, 10);

    const attackTypes = Array.from(attackTypesMap.entries())
      .map(([name, count]) => [name, count])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return NextResponse.json({
      summary,
      countries,
      timeSeries: timeSeries.slice(-24),
      methods,
      statuses,
      topBlockedIps,
      attackTypes,
      severityCounts,
      topIPs: topBlockedIps.map((item) => [item.ip, item.totalBlocked]),
    });
  } catch (error) {
    console.error('Error fetching log analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
