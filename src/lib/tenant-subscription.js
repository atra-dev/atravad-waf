import { createTenantSubscription, getPlanDefinition, normalizePlanId } from './plans.js';
import { getOrSetServerCache, invalidateServerCache } from './server-cache.js';

const TENANT_CACHE_TTL_MS = 30000;

export function invalidateTenantSubscriptionCache(tenantName) {
  if (!tenantName) return;
  invalidateServerCache(`tenant:${tenantName}:`);
  invalidateServerCache(`apps:${tenantName}:`);
  invalidateServerCache(`policies:${tenantName}:`);
  invalidateServerCache(`analytics:${tenantName}:`);
}

export async function getTenantUsageSummary(adminDb, tenantName) {
  const [appsSnapshot, policiesSnapshot, usersSnapshot] = await Promise.all([
    adminDb.collection('applications').where('tenantName', '==', tenantName).get(),
    adminDb.collection('policies').where('tenantName', '==', tenantName).get(),
    adminDb.collection('users').where('tenantName', '==', tenantName).get(),
  ]);

  return {
    currentApps: appsSnapshot.size,
    currentPolicies: policiesSnapshot.size,
    currentUsers: usersSnapshot.size,
    currentMonthRequests: 0,
  };
}

export async function getTenantSummary(adminDb, tenantName) {
  if (!adminDb || !tenantName) return null;

  return getOrSetServerCache(
    `tenant:${tenantName}:summary`,
    async () => {
      const tenantDoc = await adminDb.collection('tenants').doc(tenantName).get();
      if (!tenantDoc.exists) return null;

      const tenantData = tenantDoc.data() || {};
      const normalizedPlanId = normalizePlanId(tenantData.planId);
      const baseSubscription = createTenantSubscription(normalizedPlanId, {
        subscriptionStatus: tenantData.subscriptionStatus,
        billingCycle: tenantData.billingCycle,
        limits: tenantData.limits,
        features: tenantData.features,
      });
      const usage = await getTenantUsageSummary(adminDb, tenantName);

      return {
        id: tenantDoc.id,
        ...tenantData,
        planId: normalizedPlanId,
        plan: getPlanDefinition(normalizedPlanId),
        subscription: baseSubscription,
        limits: baseSubscription.limits,
        features: baseSubscription.features,
        usage,
      };
    },
    { ttlMs: TENANT_CACHE_TTL_MS }
  );
}

export async function getTenantLimitStatus(adminDb, tenantName, limitKey, nextValue = null) {
  const tenant = await getTenantSummary(adminDb, tenantName);
  if (!tenant) {
    return {
      allowed: false,
      error: 'Tenant not found',
      tenant: null,
      current: 0,
      limit: 0,
    };
  }

  const usageMap = {
    maxApps: tenant.usage.currentApps || 0,
    maxPolicies: tenant.usage.currentPolicies || 0,
    maxUsers: tenant.usage.currentUsers || 0,
  };

  const limit = Number(tenant.limits?.[limitKey] || 0);
  const current = nextValue ?? usageMap[limitKey] ?? 0;
  const allowed = !Number.isFinite(limit) || limit <= 0 ? true : current < limit;

  return {
    allowed,
    tenant,
    current,
    limit,
    error: allowed ? null : `Plan limit reached for ${limitKey}`,
  };
}
