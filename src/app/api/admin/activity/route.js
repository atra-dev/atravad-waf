import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';

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

    // Check if user is super admin
    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get recent logs across all tenants
    const logsSnapshot = await adminDb
      .collection('logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    // Get tenant info for each log entry
    const logs = await Promise.all(
      logsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        let tenantData = null;
        
        if (data.tenantName) {
          const tenantDoc = await adminDb
            .collection('tenants')
            .doc(data.tenantName)
            .get();
          
          if (tenantDoc.exists) {
            tenantData = {
              id: tenantDoc.id,
              name: tenantDoc.data().name,
            };
          }
        }

        return {
          id: doc.id,
          ...data,
          tenant: tenantData,
        };
      })
    );

    // Get platform statistics (no nodes — Sucuri-style: add site → point DNS → done)
    const [tenantsSnapshot, usersSnapshot, appsSnapshot, policiesSnapshot] = await Promise.all([
      adminDb.collection('tenants').get(),
      adminDb.collection('users').get(),
      adminDb.collection('applications').get(),
      adminDb.collection('policies').get(),
    ]);

    const stats = {
      totalTenants: tenantsSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalApps: appsSnapshot.size,
      totalPolicies: policiesSnapshot.size,
    };

    return NextResponse.json({
      logs,
      stats,
    });
  } catch (error) {
    console.error('Error fetching platform activity:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
