import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';
import { getOrSetServerCache } from '@/lib/server-cache';

const ADMIN_ACTIVITY_CACHE_TTL_MS = 120000;

async function getCollectionCount(collectionName) {
  const snapshot = await adminDb.collection(collectionName).count().get();
  return snapshot.data().count || 0;
}

/**
 * GET /api/admin/activity
 * Get platform-wide activity across all tenants (Super Admin only)
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
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(requestedLimit || 50, 1), 100);

    const payload = await getOrSetServerCache(
      `admin:activity:${limit}`,
      async () => {
        const logsSnapshot = await adminDb
          .collection('logs')
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        const tenantNames = [
          ...new Set(
            logsSnapshot.docs
              .map((doc) => doc.data()?.tenantName)
              .filter(Boolean)
          ),
        ];

        const tenantDocs = await Promise.all(
          tenantNames.map((tenantName) => adminDb.collection('tenants').doc(tenantName).get())
        );

        const tenantMap = new Map(
          tenantDocs
            .filter((doc) => doc.exists)
            .map((doc) => [
              doc.id,
              {
                id: doc.id,
                name: doc.data().name,
              },
            ])
        );

        const logs = logsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            tenant: data.tenantName ? tenantMap.get(data.tenantName) || null : null,
          };
        });

        const [totalTenants, totalUsers, totalApps, totalPolicies] = await Promise.all([
          getCollectionCount('tenants'),
          getCollectionCount('users'),
          getCollectionCount('applications'),
          getCollectionCount('policies'),
        ]);

        return {
          logs,
          stats: {
            totalTenants,
            totalUsers,
            totalApps,
            totalPolicies,
          },
        };
      },
      { ttlMs: ADMIN_ACTIVITY_CACHE_TTL_MS }
    );

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching platform activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
