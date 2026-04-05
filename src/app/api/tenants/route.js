import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getUserByEmail, normalizeEmail, normalizeTenantName } from '@/lib/user-utils';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';
import { createTenantSubscription, normalizePlanId, SUBSCRIPTION_STATUSES } from '@/lib/plans';
import { adjustTenantUsage, getTenantSummary, invalidateTenantSubscriptionCache } from '@/lib/tenant-subscription';

// Helper to get current user from token
async function getCurrentUser(request) {
  const token = request.cookies.get('authToken')?.value;
  if (!token) return null;
  
  try {
    const { adminAuth } = await import('@/lib/firebase-admin');
    if (!adminAuth) {
      console.error('Firebase Admin Auth not initialized');
      return null;
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

export async function POST(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
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
        { error: 'Forbidden: tenant creation is restricted to the Super Admin team' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, assignUserEmail } = body;
    const planId = normalizePlanId(body?.planId);

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Normalize tenant name for use as document ID
    const normalizedTenantName = normalizeTenantName(name);
    if (!normalizedTenantName) {
      return NextResponse.json(
        { error: 'Invalid tenant name. Please use alphanumeric characters, spaces, hyphens, or underscores.' },
        { status: 400 }
      );
    }

    // Check if tenant with this name already exists
    const existingTenantDoc = await adminDb.collection('tenants').doc(normalizedTenantName).get();
    if (existingTenantDoc.exists) {
      return NextResponse.json(
        { error: 'A tenant with this name already exists' },
        { status: 400 }
      );
    }

    // Create tenant in Firestore using normalized name as document ID
    const subscription = createTenantSubscription(planId, {
      subscriptionStatus: body?.subscriptionStatus || SUBSCRIPTION_STATUSES.ACTIVE,
      billingCycle: body?.billingCycle || 'annual',
    });
    await adminDb.collection('tenants').doc(normalizedTenantName).set({
      name, // Store original name for display
      planId: subscription.planId,
      subscriptionStatus: subscription.subscriptionStatus,
      billingCycle: subscription.billingCycle,
      limits: subscription.limits,
      features: subscription.features,
      usage: {
        currentApps: 0,
        currentPolicies: 0,
        currentUsers: 0,
        currentMonthRequests: 0,
      },
      createdAt: new Date().toISOString(),
      createdBy: user.uid, // Store UID for reference
      createdByEmail: user.email, // Also store email
    });

    if (assignUserEmail) {
      const normalizedAssignedEmail = normalizeEmail(assignUserEmail);
      const assignedUserDoc = await adminDb.collection('users').doc(normalizedAssignedEmail).get();

      if (!assignedUserDoc.exists) {
        return NextResponse.json(
          { error: 'Tenant created, but assigned user was not found' },
          { status: 404 }
        );
      }

      const assignedUserData = assignedUserDoc.data();
      if (assignedUserData.role === 'super_admin') {
        return NextResponse.json(
          { error: 'Cannot assign a super admin account to a tenant' },
          { status: 400 }
        );
      }

      await adminDb.collection('users').doc(normalizedAssignedEmail).update({
        tenantName: normalizedTenantName,
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });
      if (assignedUserData.tenantName && assignedUserData.tenantName !== normalizedTenantName) {
        await adjustTenantUsage(adminDb, assignedUserData.tenantName, { currentUsers: -1 });
      }
      if (assignedUserData.tenantName !== normalizedTenantName) {
        await adjustTenantUsage(adminDb, normalizedTenantName, { currentUsers: 1 });
      }
    }

    invalidateTenantSubscriptionCache(normalizedTenantName);
    return NextResponse.json({ id: normalizedTenantName, name, planId: subscription.planId });
  } catch (error) {
    console.error('Error creating tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check your environment variables.' },
        { status: 500 }
      );
    }

    const user = await getCurrentUser(request);
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin - if so, return all tenants
    const userRole = await getUserRole(adminDb, user.email);
    if (isSuperAdmin(userRole)) {
      const tenantsSnapshot = await adminDb.collection('tenants').get();
      const tenants = await Promise.all(
        tenantsSnapshot.docs.map((doc) => getTenantSummary(adminDb, doc.id))
      );
      return NextResponse.json(tenants.filter(Boolean));
    }

    const existingUser = await getUserByEmail(adminDb, user.email);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const tenantName = existingUser.tenantName;

    if (!tenantName) {
      return NextResponse.json({ error: 'No tenant assigned' }, { status: 404 });
    }

    const tenant = await getTenantSummary(adminDb, tenantName);
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
