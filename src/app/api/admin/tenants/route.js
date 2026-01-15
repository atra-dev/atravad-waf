import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';

/**
 * GET /api/admin/tenants
 * List all tenants (Super Admin only)
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

    // Get all tenants
    const tenantsSnapshot = await adminDb.collection('tenants').get();
    const tenants = tenantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get user counts for each tenant
    const tenantsWithStats = await Promise.all(
      tenants.map(async (tenant) => {
        const usersSnapshot = await adminDb
          .collection('users')
          .where('tenantName', '==', tenant.id)
          .get();
        
        const appsSnapshot = await adminDb
          .collection('applications')
          .where('tenantName', '==', tenant.id)
          .get();
        
        const nodesSnapshot = await adminDb
          .collection('nodes')
          .where('tenantName', '==', tenant.id)
          .get();
        
        const policiesSnapshot = await adminDb
          .collection('policies')
          .where('tenantName', '==', tenant.id)
          .get();

        return {
          ...tenant,
          userCount: usersSnapshot.size,
          appCount: appsSnapshot.size,
          nodeCount: nodesSnapshot.size,
          policyCount: policiesSnapshot.size,
        };
      })
    );

    return NextResponse.json(tenantsWithStats);
  } catch (error) {
    console.error('Error fetching all tenants:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
