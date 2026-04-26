import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { normalizeDomainInput } from '@/lib/domain-utils';
import { ANALYTICS_DISPLAY_HOURS } from '@/lib/analytics-window';
import { getTenantSummary } from '@/lib/tenant-subscription';

function normalizeRequestMethod(value) {
  const method = String(value || '').trim();
  return method ? method.toUpperCase() : null;
}

function normalizeRequestUri(value) {
  const uri = String(value || '').trim();
  return uri || null;
}

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authCheck = await checkAuthorization(adminDb, user.email, 'read', 'logs');
    if (!authCheck.authorized) {
      return NextResponse.json({ error: 'Forbidden', details: authCheck.error }, { status: 403 });
    }

    const tenantName = await getTenantName(user);
    if (!tenantName) {
      return NextResponse.json({ totalStoredCount: 0 });
    }

    const tenant = await getTenantSummary(adminDb, tenantName);
    const { searchParams } = new URL(request.url);
    const logId = String(searchParams.get('id') || '').trim();
    if (!logId) {
      return NextResponse.json({ error: 'Log id is required' }, { status: 400 });
    }

    const maxLookbackHours = Math.min(
      Number(tenant?.limits?.maxLogLookbackHours || 24),
      24
    );
    const hours = Math.min(ANALYTICS_DISPLAY_HOURS, maxLookbackHours);

    const selectedDoc = await adminDb.collection('logs').doc(logId).get();
    if (!selectedDoc.exists) {
      return NextResponse.json({ totalStoredCount: 0 });
    }

    const selectedLog = selectedDoc.data() || {};
    if (String(selectedLog.tenantName || '') !== tenantName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const site = normalizeDomainInput(
      selectedLog.siteNormalized || selectedLog.site || selectedLog.source || selectedLog.request?.host || ''
    );
    const decision = String(selectedLog.decision || '').trim().toLowerCase();
    const method = normalizeRequestMethod(
      selectedLog.method ||
      selectedLog.request?.method ||
      selectedLog.request?.requestMethod ||
      selectedLog.request?.request_method ||
      selectedLog.request?.verb
    );
    const uri = normalizeRequestUri(
      selectedLog.uri || selectedLog.requestUri || selectedLog.request?.uri || selectedLog.request?.path
    );

    if (!site || !decision || !method || !uri) {
      return NextResponse.json({ totalStoredCount: 0 });
    }

    let query = adminDb
      .collection('logs')
      .where('tenantName', '==', tenantName)
      .where('timestamp', '>=', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())
      .where('siteNormalized', '==', site)
      .where('decision', '==', decision)
      .where('method', '==', method)
      .where('uri', '==', uri);

    const countSnapshot = await query.count().get();
    return NextResponse.json({
      totalStoredCount: Number(countSnapshot?.data()?.count || 0),
    });
  } catch (error) {
    console.error('Error counting matching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
