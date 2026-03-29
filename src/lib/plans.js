export const PLAN_IDS = {
  ESSENTIAL: 'essential',
  PROFESSIONAL: 'professional',
  BUSINESS: 'business',
  CUSTOM: 'custom',
};

export const SUBSCRIPTION_STATUSES = {
  ACTIVE: 'active',
  TRIALING: 'trialing',
  PAST_DUE: 'past_due',
  SUSPENDED: 'suspended',
};

export const PLAN_CATALOG = {
  [PLAN_IDS.ESSENTIAL]: {
    id: PLAN_IDS.ESSENTIAL,
    name: 'Managed Essential',
    websitePrice: '$79',
    websiteCadence: '/mo',
    annualPrepayLabel: '$790 billed annually',
    description:
      'Managed WAF protection for smaller organizations that need baseline coverage, onboarding help, and predictable operating cost.',
    highlight: false,
    features: [
      '1 protected website or application',
      'Managed WAF monitoring with scheduled support',
      '7-day TTL retention for logs and analytics data',
      'Baseline policy handling and managed SSL onboarding',
      'Email support during business hours',
      'Designed for low-touch MSME protection',
    ],
    limits: {
      maxApps: 1,
      maxPolicies: 5,
      maxUsers: 3,
      monthlyRequestsIncluded: 3_000_000,
      logRetentionDays: 7,
      analyticsRetentionDays: 7,
      maxLogLookbackHours: 24 * 7,
    },
    featuresConfig: {
      prioritySupport: false,
      twentyFourSevenOps: false,
      virtualPatching: false,
      customReporting: false,
      botMitigation: false,
      geoBlocking: true,
    },
  },
  [PLAN_IDS.PROFESSIONAL]: {
    id: PLAN_IDS.PROFESSIONAL,
    name: 'Managed Professional',
    websitePrice: '$179',
    websiteCadence: '/mo',
    annualPrepayLabel: '$1,790 billed annually',
    description:
      'Managed WAF operations for growing businesses that need deeper visibility, faster support, and more room for policy tuning.',
    highlight: true,
    features: [
      '1 protected website or application',
      'Priority managed WAF operations and regular tuning',
      '15-day TTL retention for logs and analytics data',
      'Managed bot mitigation, geo controls, and rate limiting',
      'Priority support with faster handling targets',
      'Suitable for active growth-stage MSMEs',
    ],
    limits: {
      maxApps: 1,
      maxPolicies: 12,
      maxUsers: 8,
      monthlyRequestsIncluded: 10_000_000,
      logRetentionDays: 15,
      analyticsRetentionDays: 15,
      maxLogLookbackHours: 24 * 15,
    },
    featuresConfig: {
      prioritySupport: true,
      twentyFourSevenOps: false,
      virtualPatching: true,
      customReporting: false,
      botMitigation: true,
      geoBlocking: true,
    },
  },
  [PLAN_IDS.BUSINESS]: {
    id: PLAN_IDS.BUSINESS,
    name: 'Managed Business',
    websitePrice: '$399',
    websiteCadence: '/mo',
    annualPrepayLabel: '$3,990 billed annually',
    description:
      'High-touch managed protection for business-critical workloads that need faster escalation, richer retention, and stronger operational support.',
    highlight: false,
    features: [
      'Up to 3 protected websites or applications',
      '24/7 managed WAF operations with escalation handling',
      '30-day TTL retention for logs and analytics data',
      'Advanced threat controls with hands-on tuning',
      'Priority support and richer reporting visibility',
      'Commercial-grade onboarding and service guidance',
    ],
    limits: {
      maxApps: 3,
      maxPolicies: 25,
      maxUsers: 20,
      monthlyRequestsIncluded: 30_000_000,
      logRetentionDays: 30,
      analyticsRetentionDays: 30,
      maxLogLookbackHours: 24 * 30,
    },
    featuresConfig: {
      prioritySupport: true,
      twentyFourSevenOps: true,
      virtualPatching: true,
      customReporting: true,
      botMitigation: true,
      geoBlocking: true,
    },
  },
  [PLAN_IDS.CUSTOM]: {
    id: PLAN_IDS.CUSTOM,
    name: 'Managed Multi-Site & Custom',
    websitePrice: 'Custom',
    websiteCadence: '',
    annualPrepayLabel: 'Custom commercial terms',
    description:
      'Tailored managed security service for agencies, larger organizations, and customers that require custom scope, retention, and SLA structure.',
    highlight: false,
    features: [
      'Multiple protected websites or application portfolios',
      'Tailored 24/7 cyber defense operations coverage',
      'Custom TTL retention, reporting, and workflow design',
      'Dedicated service planning and commercial alignment',
      'Custom SLA and support structure',
    ],
    limits: {
      maxApps: 25,
      maxPolicies: 200,
      maxUsers: 100,
      monthlyRequestsIncluded: 250_000_000,
      logRetentionDays: 30,
      analyticsRetentionDays: 30,
      maxLogLookbackHours: 24 * 30,
    },
    featuresConfig: {
      prioritySupport: true,
      twentyFourSevenOps: true,
      virtualPatching: true,
      customReporting: true,
      botMitigation: true,
      geoBlocking: true,
    },
  },
};

function hasObjectShape(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function matchesPlanValues(candidate, reference) {
  if (!hasObjectShape(candidate) || !hasObjectShape(reference)) {
    return false;
  }

  return Object.keys(reference).every((key) => candidate[key] === reference[key]);
}

function shouldIgnoreLegacyOverrides(planId, overrides = {}) {
  if (planId !== PLAN_IDS.CUSTOM) {
    return false;
  }

  const businessPlan = PLAN_CATALOG[PLAN_IDS.BUSINESS];
  const matchesBusinessLimits = matchesPlanValues(overrides.limits, businessPlan.limits);
  const matchesBusinessFeatures = matchesPlanValues(overrides.features, businessPlan.featuresConfig);

  return matchesBusinessLimits || matchesBusinessFeatures;
}

export function normalizePlanId(planId) {
  const normalized = String(planId || '').trim().toLowerCase();
  return PLAN_CATALOG[normalized] ? normalized : PLAN_IDS.ESSENTIAL;
}

export function getPlanDefinition(planId) {
  return PLAN_CATALOG[normalizePlanId(planId)];
}

export function createTenantSubscription(planId, overrides = {}) {
  const plan = getPlanDefinition(planId);
  const ignoreLegacyOverrides = shouldIgnoreLegacyOverrides(plan.id, overrides);

  return {
    planId: plan.id,
    subscriptionStatus: overrides.subscriptionStatus || SUBSCRIPTION_STATUSES.ACTIVE,
    billingCycle: overrides.billingCycle || 'annual',
    planName: plan.name,
    limits: {
      ...plan.limits,
      ...(ignoreLegacyOverrides ? {} : (overrides.limits || {})),
    },
    features: {
      ...plan.featuresConfig,
      ...(ignoreLegacyOverrides ? {} : (overrides.features || {})),
    },
    pricing: {
      websitePrice: plan.websitePrice,
      websiteCadence: plan.websiteCadence,
      annualPrepayLabel: plan.annualPrepayLabel,
    },
  };
}

export function getPlanOptions() {
  return Object.values(PLAN_CATALOG).map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: `${plan.websitePrice}${plan.websiteCadence}`,
  }));
}
