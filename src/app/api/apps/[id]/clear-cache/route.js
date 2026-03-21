import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { checkAuthorization } from '@/lib/rbac';
import { getCurrentUser, getTenantName } from '@/lib/api-helpers';
import { invalidateServerCache } from '@/lib/server-cache';

export async function POST(request, { params }) {
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

    const authCheck = await checkAuthorization(adminDb, user.email, 'update', 'apps');
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

    const { id } = await params;
    const appRef = adminDb.collection('applications').doc(id);
    const appDoc = await appRef.get();

    if (!appDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const appData = appDoc.data();
    if (appData.tenantName !== tenantName) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cacheClearedAt = new Date().toISOString();
    const cachePurgeVersion = Number(appData.cachePurgeVersion || 0) + 1;
    const updateData = {
      cacheClearedAt,
      cacheClearedBy: user.email || user.uid || 'unknown',
      cachePurgeVersion,
      updatedAt: cacheClearedAt,
      updatedBy: user.uid,
    };

    await appRef.update(updateData);
    invalidateServerCache(`apps:${tenantName}:`);
    invalidateServerCache(`policies:${tenantName}:`);

    return NextResponse.json({
      success: true,
      id,
      domain: appData.domain || null,
      cacheClearedAt,
      cacheClearedBy: updateData.cacheClearedBy,
      cachePurgeVersion,
      updatedAt: cacheClearedAt,
      message: 'Cache clear request completed successfully',
    });
  } catch (error) {
    console.error('Error clearing application cache:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
