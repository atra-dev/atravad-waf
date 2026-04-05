import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getCurrentUser } from '@/lib/api-helpers';
import { getUserRole, isSuperAdmin } from '@/lib/rbac';
import { normalizeTenantName, normalizeEmail } from '@/lib/user-utils';
import { createTenantSubscription, getPlanDefinition, getPlanOptions, normalizePlanId, SUBSCRIPTION_STATUSES } from '@/lib/plans';
import { adjustTenantUsage, getTenantSummary, hasTenantUsageSummary, invalidateTenantSubscriptionCache } from '@/lib/tenant-subscription';
import { getOrSetServerCache, invalidateServerCache } from '@/lib/server-cache';

const ADMIN_TENANTS_CACHE_TTL_MS = 120000;

function invalidateAdminTenantCaches() {
  invalidateServerCache('admin:tenants');
  invalidateServerCache('admin:activity:');
}

function sanitizeCustomLimits(limits) {
  if (!limits || typeof limits !== 'object') return undefined;

  const numericFields = [
    'maxApps',
    'maxPolicies',
    'maxUsers',
    'monthlyRequestsIncluded',
    'logRetentionDays',
    'analyticsRetentionDays',
    'maxLogLookbackHours',
  ];

  const sanitized = {};
  for (const field of numericFields) {
    const value = Number(limits[field]);
    if (Number.isFinite(value) && value >= 0) {
      sanitized[field] = Math.round(value);
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

function sanitizeCustomFeatures(features) {
  if (!features || typeof features !== 'object') return undefined;

  const booleanFields = [
    'prioritySupport',
    'twentyFourSevenOps',
    'virtualPatching',
    'customReporting',
    'botMitigation',
    'geoBlocking',
  ];

  const sanitized = {};
  for (const field of booleanFields) {
    if (typeof features[field] === 'boolean') {
      sanitized[field] = features[field];
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

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

    const userRole = await getUserRole(adminDb, user.email);
    if (!isSuperAdmin(userRole)) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin access required' },
        { status: 403 }
      );
    }

    const tenants = await getOrSetServerCache(
      'admin:tenants:list',
      async () => {
        const tenantsSnapshot = await adminDb.collection('tenants').get();

        return tenantsSnapshot.docs.map((doc) => {
          const tenantData = doc.data() || {};
          const normalizedPlanId = normalizePlanId(tenantData.planId);
          const subscription = createTenantSubscription(normalizedPlanId, {
            subscriptionStatus: tenantData.subscriptionStatus,
            billingCycle: tenantData.billingCycle,
            limits: tenantData.limits,
            features: tenantData.features,
          });
          const usage = hasTenantUsageSummary(tenantData)
            ? tenantData.usage
            : {
                currentApps: 0,
                currentPolicies: 0,
                currentUsers: 0,
                currentMonthRequests: 0,
              };

          return {
            id: doc.id,
            ...tenantData,
            planId: normalizedPlanId,
            plan: getPlanDefinition(normalizedPlanId),
            subscription,
            limits: subscription.limits,
            features: subscription.features,
            usage: {
              ...usage,
              currentMonthRequests: Number(usage.currentMonthRequests || 0),
            },
            userCount: usage.currentUsers,
            appCount: usage.currentApps,
            policyCount: usage.currentPolicies,
          };
        });
      },
      { ttlMs: ADMIN_TENANTS_CACHE_TTL_MS }
    );

    return NextResponse.json(tenants);
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
 * Body: { name, assignUserEmail?, planId?, subscriptionStatus?, billingCycle? }
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
    const planId = normalizePlanId(body?.planId);
    const subscriptionStatus = body?.subscriptionStatus || SUBSCRIPTION_STATUSES.ACTIVE;
    const billingCycle = body?.billingCycle || 'annual';
    const customLimits = planId === 'custom' ? sanitizeCustomLimits(body?.limits) : undefined;
    const customFeatures = planId === 'custom' ? sanitizeCustomFeatures(body?.features) : undefined;

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
    const subscription = createTenantSubscription(planId, {
      subscriptionStatus,
      billingCycle,
      limits: customLimits,
      features: customFeatures,
    });
    await adminDb.collection('tenants').doc(tenantId).set({
      name: rawName,
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
      if (assignedUserData.tenantName && assignedUserData.tenantName !== tenantId) {
        await adjustTenantUsage(adminDb, assignedUserData.tenantName, { currentUsers: -1 });
      }
      if (assignedUserData.tenantName !== tenantId) {
        await adjustTenantUsage(adminDb, tenantId, { currentUsers: 1 });
      }
    }

    invalidateTenantSubscriptionCache(tenantId);
    invalidateAdminTenantCaches();

    return NextResponse.json(
      {
        id: tenantId,
        name: rawName,
        planId: subscription.planId,
        subscriptionStatus: subscription.subscriptionStatus,
        billingCycle: subscription.billingCycle,
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

/**
 * PUT /api/admin/tenants
 * Update tenant subscription details (Super Admin only)
 * Body: { tenantId, planId, subscriptionStatus?, billingCycle? }
 */
export async function PUT(request) {
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
    const tenantId = normalizeTenantName(body?.tenantId);
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    const tenantDoc = await tenantRef.get();
    if (!tenantDoc.exists) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    const tenantData = tenantDoc.data() || {};
    const existingPlanId = normalizePlanId(tenantData.planId);
    const nextPlanId = normalizePlanId(body?.planId || tenantData.planId);
    const planChanged = nextPlanId !== existingPlanId;
    const customLimits = nextPlanId === 'custom' ? sanitizeCustomLimits(body?.limits) : undefined;
    const customFeatures = nextPlanId === 'custom' ? sanitizeCustomFeatures(body?.features) : undefined;
    const subscription = createTenantSubscription(nextPlanId, {
      subscriptionStatus: body?.subscriptionStatus || tenantData.subscriptionStatus,
      billingCycle: body?.billingCycle || tenantData.billingCycle,
      limits: customLimits || (planChanged ? undefined : tenantData.limits),
      features: customFeatures || (planChanged ? undefined : tenantData.features),
    });
    const now = new Date().toISOString();

    await tenantRef.update({
      planId: subscription.planId,
      subscriptionStatus: subscription.subscriptionStatus,
      billingCycle: subscription.billingCycle,
      limits: subscription.limits,
      features: subscription.features,
      updatedAt: now,
      updatedBy: user.uid,
      updatedByEmail: user.email,
    });

    invalidateTenantSubscriptionCache(tenantId);
    invalidateAdminTenantCaches();
    const tenant = await getTenantSummary(adminDb, tenantId);
    return NextResponse.json({
      ...tenant,
      planOptions: getPlanOptions(),
    });
  } catch (error) {
    console.error('Error updating tenant subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
