import { FieldValue } from 'firebase-admin/firestore';
import { createTenantSubscription, getPlanDefinition, normalizePlanId } from './plans.js';
import { getOrSetServerCache, invalidateServerCache } from './server-cache.js';

const TENANT_CACHE_TTL_MS = 30000;
const TENANT_RETENTION_CACHE_TTL_MS = 300000;

export function invalidateTenantSubscriptionCache(tenantName) {
  if (!tenantName) return;
  invalidateServerCache(`tenant:${tenantName}:`);
  invalidateServerCache(`apps:${tenantName}:`);
  invalidateServerCache(`policies:${tenantName}:`);
  invalidateServerCache(`analytics:${tenantName}:`);
}

function normalizeUsageNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

export function hasTenantUsageSummary(tenantData) {
  const usage = tenantData?.usage;
  if (!usage || typeof usage !== 'object') return false;

  return ['currentApps', 'currentPolicies', 'currentUsers'].every((key) => (
    Number.isFinite(Number(usage[key]))
  ));
}

function normalizeTenantUsage(usage = {}) {
  return {
    currentApps: normalizeUsageNumber(usage.currentApps),
    currentPolicies: normalizeUsageNumber(usage.currentPolicies),
    currentUsers: normalizeUsageNumber(usage.currentUsers),
    currentMonthRequests: normalizeUsageNumber(usage.currentMonthRequests),
  };
}

export async function getTenantUsageSummary(adminDb, tenantName) {
  const [appsCountSnapshot, policiesSnapshot, usersCountSnapshot] = await Promise.all([
    adminDb.collection('applications').where('tenantName', '==', tenantName).count().get(),
    adminDb.collection('policies').where('tenantName', '==', tenantName).select('name').get(),
    adminDb.collection('users').where('tenantName', '==', tenantName).count().get(),
  ]);

  const uniquePolicyNames = new Set(
    policiesSnapshot.docs
      .map((doc) => String(doc.data()?.name || '').trim())
      .filter(Boolean)
  );

  return {
    currentApps: Number(appsCountSnapshot.data()?.count || 0),
    currentPolicies: uniquePolicyNames.size,
    currentUsers: Number(usersCountSnapshot.data()?.count || 0),
    currentMonthRequests: 0,
  };
}

export async function ensureTenantUsageSummary(adminDb, tenantName, tenantData = null) {
  if (!adminDb || !tenantName) return null;

  if (hasTenantUsageSummary(tenantData)) {
    return normalizeTenantUsage(tenantData.usage);
  }

  const usage = normalizeTenantUsage(await getTenantUsageSummary(adminDb, tenantName));
  await adminDb.collection('tenants').doc(tenantName).set({ usage }, { merge: true });
  invalidateTenantSubscriptionCache(tenantName);
  return usage;
}

export async function adjustTenantUsage(adminDb, tenantName, changes = {}) {
  if (!adminDb || !tenantName || !changes || typeof changes !== 'object') return;

  const tenantRef = adminDb.collection('tenants').doc(tenantName);
  const tenantDoc = await tenantRef.get();
  if (!tenantDoc.exists) return;

  const tenantData = tenantDoc.data() || {};
  await ensureTenantUsageSummary(adminDb, tenantName, tenantData);

  const updateData = {};
  for (const [key, value] of Object.entries(changes)) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount === 0) continue;
    updateData[`usage.${key}`] = FieldValue.increment(amount);
  }

  if (Object.keys(updateData).length === 0) return;

  await tenantRef.update(updateData);
  invalidateTenantSubscriptionCache(tenantName);
}

export async function getTenantSummary(adminDb, tenantName) {
  if (!adminDb || !tenantName) return null;

  return getOrSetServerCache(
    `tenant:${tenantName}:summary`,
    async () => {
      const tenantDoc = await adminDb.collection('tenants').doc(tenantName).get();
      if (!tenantDoc.exists) return null;

      const tenantData = tenantDoc.data() || {};
      const usage = await ensureTenantUsageSummary(adminDb, tenantName, tenantData);
      const normalizedPlanId = normalizePlanId(tenantData.planId);
      const baseSubscription = createTenantSubscription(normalizedPlanId, {
        subscriptionStatus: tenantData.subscriptionStatus,
        billingCycle: tenantData.billingCycle,
        limits: tenantData.limits,
        features: tenantData.features,
      });

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

export async function getTenantRetentionSettings(adminDb, tenantName) {
  if (!adminDb || !tenantName) return null;

  return getOrSetServerCache(
    `tenant:${tenantName}:retention`,
    async () => {
      const tenantDoc = await adminDb.collection('tenants').doc(tenantName).get();
      if (!tenantDoc.exists) return null;

      const tenantData = tenantDoc.data() || {};
      const normalizedPlanId = normalizePlanId(tenantData.planId);
      const subscription = createTenantSubscription(normalizedPlanId, {
        subscriptionStatus: tenantData.subscriptionStatus,
        billingCycle: tenantData.billingCycle,
        limits: tenantData.limits,
      });

      return {
        tenantName,
        planId: normalizedPlanId,
        limits: subscription.limits,
      };
    },
    { ttlMs: TENANT_RETENTION_CACHE_TTL_MS }
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
