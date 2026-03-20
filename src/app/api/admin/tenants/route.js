import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';
import { normalizeTenantName, normalizeEmail } from '@/lib/user-utils';

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
        
        const policiesSnapshot = await adminDb
          .collection('policies')
          .where('tenantName', '==', tenant.id)
          .get();

        return {
          ...tenant,
          userCount: usersSnapshot.size,
          appCount: appsSnapshot.size,
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

/**
 * POST /api/admin/tenants
 * Create a tenant and optionally assign an existing managed user (Super Admin only)
 * Body: { name, assignUserEmail? }
 */
export async function POST(request) {
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

    const body = await request.json();
    const rawName = typeof body?.name === 'string' ? body.name.trim() : '';
    const assignUserEmail = typeof body?.assignUserEmail === 'string' ? normalizeEmail(body.assignUserEmail) : null;

    if (!rawName) {
      return NextResponse.json(
        { error: 'Tenant name is required' },
        { status: 400 }
      );
    }

    const tenantId = normalizeTenantName(rawName);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Invalid tenant name' },
        { status: 400 }
      );
    }

    const existingTenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    if (existingTenantDoc.exists) {
      return NextResponse.json(
        { error: 'A tenant with this name already exists' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    await adminDb.collection('tenants').doc(tenantId).set({
      name: rawName,
      createdAt: now,
      createdBy: user.uid,
      createdByEmail: user.email,
    });

    if (assignUserEmail) {
      const assignedUserRef = adminDb.collection('users').doc(assignUserEmail);
      const assignedUserDoc = await assignedUserRef.get();

      if (!assignedUserDoc.exists) {
        return NextResponse.json(
          { error: 'Tenant created, but assigned user was not found' },
          { status: 404 }
        );
      }

      const assignedUserData = assignedUserDoc.data();
      if (assignedUserData.role === 'super_admin') {
        return NextResponse.json(
          { error: 'Cannot assign super admin to a tenant' },
          { status: 400 }
        );
      }

      await assignedUserRef.update({
        tenantName: tenantId,
        role: assignedUserData.role === 'admin' ? 'admin' : 'admin',
        updatedAt: now,
      });
    }

    return NextResponse.json(
      {
        id: tenantId,
        name: rawName,
        assignedUserEmail: assignUserEmail,
        createdAt: now,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
