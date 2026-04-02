'use client';

import { useEffect, useState } from 'react';
import AppLoadingState from '@/components/AppLoadingState';
import Layout from '@/components/Layout';
import TenantPlanBanner from '@/components/TenantPlanBanner';
import { PLAN_CATALOG, PLAN_IDS } from '@/lib/plans';

function OrbitIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="2.5" strokeWidth="1.8" />
      <path strokeWidth="1.8" strokeLinecap="round" d="M4.5 12c0-3.8 3.4-7 7.5-7s7.5 3.2 7.5 7-3.4 7-7.5 7-7.5-3.2-7.5-7Z" />
      <path strokeWidth="1.8" strokeLinecap="round" d="M7 6.8c3.2-2.1 7.8-1 10.3 2.4 2.5 3.4 2 7.9-1.1 10" />
    </svg>
  );
}

function ShieldIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3l7 3v5c0 4.4-2.9 8.4-7 9.7C7.9 19.4 5 15.4 5 11V6l7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m9.4 11.9 1.7 1.7 3.6-4" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="11" r="3" strokeWidth="1.8" />
      <path strokeLinecap="round" strokeWidth="1.8" d="M18.5 18a3.5 3.5 0 0 0-2.8-3.4M5.5 18a3.5 3.5 0 0 1 2.8-3.4" />
    </svg>
  );
}

function GlobeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 12h18M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9Z" />
    </svg>
  );
}

function FeatureBadge({ enabled, children }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
        enabled
          ? 'border-emerald-500 bg-emerald-100 text-emerald-900 shadow-[0_10px_24px_rgba(5,150,105,0.10)] dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-300'
          : 'border-[var(--border-soft)] bg-[var(--surface-3)] theme-text-muted'
      }`}
    >
      {children}
    </div>
  );
}

function CapacityCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="theme-surface rounded-[26px] p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] theme-text-muted">{label}</p>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight theme-text-primary">{value}</p>
      <p className="mt-2 text-sm theme-text-muted">{note}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-soft)] py-3 last:border-b-0">
      <dt className="text-sm theme-text-muted">{label}</dt>
      <dd className="text-sm font-semibold theme-text-primary">{value}</dd>
    </div>
  );
}

function ComparisonCard({ plan, active }) {
  return (
    <div
        className={`rounded-[26px] border p-5 shadow-sm transition-colors ${
          active
          ? 'border-cyan-500 bg-[linear-gradient(145deg,#dff6ff,#e9f8ff_48%,#f3fbff)] text-slate-950 shadow-[0_20px_60px_rgba(14,116,144,0.16)] ring-1 ring-cyan-400/35 dark:bg-[linear-gradient(145deg,color-mix(in_srgb,var(--surface-2)_92%,#0f172a),color-mix(in_srgb,var(--surface-3)_88%,#0b1f33))] dark:text-[var(--text-primary)] dark:shadow-[0_20px_60px_rgba(8,15,29,0.22)] dark:ring-cyan-500/20'
          : 'theme-surface text-[var(--text-primary)]'
        }`}
      >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? 'text-cyan-900 dark:text-cyan-300' : 'theme-text-muted'}`}>
            {plan.name}
          </p>
          <p className={`mt-3 text-3xl font-semibold tracking-tight ${active ? 'text-slate-950 dark:text-white' : 'theme-text-primary'}`}>
            {plan.websitePrice}
            {plan.websiteCadence ? <span className={`ml-1 text-base font-medium ${active ? 'text-slate-700 dark:text-slate-300' : 'theme-text-muted'}`}>{plan.websiteCadence}</span> : null}
          </p>
        </div>
        {active ? (
          <span className="rounded-full bg-cyan-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950">
            Current
          </span>
        ) : null}
      </div>
      <p className={`mt-4 text-sm leading-7 ${active ? 'text-slate-800 dark:text-slate-300' : 'theme-text-secondary'}`}>
        {plan.description}
      </p>
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-700 dark:text-slate-300' : 'theme-text-muted'}>Sites</span>
          <span className="font-semibold">{plan.limits.maxApps}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-700 dark:text-slate-300' : 'theme-text-muted'}>Policies</span>
          <span className="font-semibold">{plan.limits.maxPolicies}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-700 dark:text-slate-300' : 'theme-text-muted'}>Logs</span>
          <span className="font-semibold">{plan.limits.logRetentionDays} days</span>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTenant = async () => {
      try {
        const response = await fetch('/api/tenants/current');
        const payload = await response.json();
        setTenant(payload?.id ? payload : null);
      } catch (error) {
        console.error('Error fetching tenant subscription:', error);
        setTenant(null);
      } finally {
        setLoading(false);
      }
    };

    loadTenant();
  }, []);

  if (!loading && !tenant) {
    return (
      <Layout>
        <div className="theme-surface rounded-[30px] p-8">
          <h1 className="text-2xl font-bold tracking-tight theme-text-primary">Subscription</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 theme-text-secondary">
            Your account is not yet assigned to an active tenant subscription. Contact the ATRAVA Defense operations team to complete onboarding.
          </p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="space-y-8">
          <AppLoadingState
            variant="panel"
            title="Loading subscription"
            message="Reviewing your tenant plan, included limits, retention windows, and managed service access."
          />
        </div>
      </Layout>
    );
  }

  const resources = [
    {
      label: 'Sites',
      current: tenant.usage?.currentApps || 0,
      limit: tenant.limits?.maxApps || 0,
    },
    {
      label: 'Policies',
      current: tenant.usage?.currentPolicies || 0,
      limit: tenant.limits?.maxPolicies || 0,
    },
    {
      label: 'Users',
      current: tenant.usage?.currentUsers || 0,
      limit: tenant.limits?.maxUsers || 0,
    },
  ];

  const highestUsage = resources.reduce((max, item) => {
    const limit = Number(item.limit || 0);
    const current = Number(item.current || 0);
    const percent = limit > 0 ? Math.round((current / limit) * 100) : 0;
    return Math.max(max, percent);
  }, 0);

  const comparisonPlans = [
    PLAN_CATALOG[PLAN_IDS.ESSENTIAL],
    PLAN_CATALOG[PLAN_IDS.PROFESSIONAL],
    PLAN_CATALOG[PLAN_IDS.BUSINESS],
  ];

  const subscriptionStatusLabel = String(tenant.subscriptionStatus || 'active')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const billingCycleLabel = String(tenant.subscription?.billingCycle || tenant.billingCycle || 'annual')
    .replace(/\b\w/g, (char) => char.toUpperCase());
  const currentPlanIndex = comparisonPlans.findIndex((plan) => plan.id === tenant.planId);
  const suggestedUpgrade =
    highestUsage >= 80 && currentPlanIndex >= 0 && currentPlanIndex < comparisonPlans.length - 1
      ? comparisonPlans[currentPlanIndex + 1]
      : null;

  const planSummary = [
    {
      icon: GlobeIcon,
      label: 'Protected Sites',
      value: tenant.limits?.maxApps || 0,
      note: 'Included website or application slots',
      tone: 'bg-sky-100 text-sky-700',
    },
    {
      icon: ShieldIcon,
      label: 'Policies',
      value: tenant.limits?.maxPolicies || 0,
      note: 'Managed policy capacity included in plan',
      tone: 'bg-cyan-100 text-cyan-700',
    },
    {
      icon: UsersIcon,
      label: 'Managed Users',
      value: tenant.limits?.maxUsers || 0,
      note: 'Accounts included under this subscription',
      tone: 'bg-emerald-100 text-emerald-700',
    },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <section className="theme-panel relative overflow-hidden rounded-[34px] px-6 py-7 sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_22%)]" />
          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] theme-text-muted">Commercial Control</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight theme-text-primary sm:text-[3.25rem]">
                  Subscription
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 theme-text-secondary sm:text-base">
                  Review plan entitlements, retention, and managed-service coverage for {tenant.name}. This is the commercial operating envelope your tenant is currently running under.
                </p>
              </div>
              <div className="theme-soft-surface flex h-16 w-16 items-center justify-center rounded-[22px] text-sky-700">
                <OrbitIcon className="h-8 w-8" />
              </div>
            </div>

            <TenantPlanBanner tenant={tenant} resources={resources} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {planSummary.map((item) => (
            <CapacityCard
              key={item.label}
              icon={item.icon}
              label={item.label}
              value={item.value}
              note={item.note}
              tone={item.tone}
            />
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="theme-surface rounded-[30px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] theme-text-muted">Retention</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight theme-text-primary">Access Window</h2>
              </div>
              <div className="theme-soft-surface rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                Active Scope
              </div>
            </div>
            <dl className="mt-6">
              <DetailRow label="Log retention" value={`${tenant.limits?.logRetentionDays || 0} days`} />
              <DetailRow label="Analytics retention" value={`${tenant.limits?.analyticsRetentionDays || 0} days`} />
              <DetailRow
                label="Max log lookback"
                value={`${Math.round((tenant.limits?.maxLogLookbackHours || 0) / 24)} days`}
              />
              <DetailRow
                label="Subscription status"
                value={subscriptionStatusLabel}
              />
              <DetailRow
                label="Billing cycle"
                value={billingCycleLabel}
              />
            </dl>
          </section>

          <section className="theme-surface rounded-[30px] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] theme-text-muted">Managed Features</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight theme-text-primary">Service Profile</h2>
            <p className="mt-3 text-sm leading-7 theme-text-secondary">
              The toggles below reflect the service capabilities currently enabled for your tenant under this subscription.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FeatureBadge enabled={Boolean(tenant.features?.prioritySupport)}>Priority support</FeatureBadge>
              <FeatureBadge enabled={Boolean(tenant.features?.twentyFourSevenOps)}>24/7 managed operations</FeatureBadge>
              <FeatureBadge enabled={Boolean(tenant.features?.virtualPatching)}>Virtual patching</FeatureBadge>
              <FeatureBadge enabled={Boolean(tenant.features?.customReporting)}>Custom reporting</FeatureBadge>
              <FeatureBadge enabled={Boolean(tenant.features?.botMitigation)}>Bot mitigation</FeatureBadge>
              <FeatureBadge enabled={Boolean(tenant.features?.geoBlocking)}>Geo blocking</FeatureBadge>
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="theme-surface rounded-[30px] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] theme-text-muted">Plan Comparison</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight theme-text-primary">Where You Sit In The Stack</h2>
              </div>
              <div className="theme-soft-surface rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
                Client View
              </div>
            </div>
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              {comparisonPlans.map((plan) => (
                <ComparisonCard key={plan.id} plan={plan} active={plan.id === tenant.planId} />
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="theme-surface rounded-[30px] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] theme-text-muted">Billing Summary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight theme-text-primary">Renewal Snapshot</h2>
              <dl className="mt-6">
                <DetailRow
                  label="Current commercial plan"
                  value={tenant.subscription?.planName || tenant.plan?.name || 'Managed Essential'}
                />
                <DetailRow
                  label="Commercial rate"
                  value={`${tenant.subscription?.pricing?.websitePrice || ''}${tenant.subscription?.pricing?.websiteCadence || ''}`}
                />
                <DetailRow
                  label="Annual prepay"
                  value={tenant.subscription?.pricing?.annualPrepayLabel || 'Custom commercial terms'}
                />
                <DetailRow
                  label="Renewal handling"
                  value="Managed by ATRAVA Defense operations"
                />
              </dl>
            </section>

            <section
              className={`rounded-[30px] border p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] ${
                suggestedUpgrade
                  ? 'border-amber-400 bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/20'
                  : 'border-emerald-400 bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/20'
              }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${suggestedUpgrade ? 'text-amber-900 dark:text-amber-300' : 'text-emerald-900 dark:text-emerald-300'}`}>
                Capacity Advisory
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight theme-text-primary">
                {suggestedUpgrade ? 'Upgrade recommended' : 'Capacity is healthy'}
              </h2>
              <p className="mt-3 text-sm leading-7 theme-text-secondary">
                {suggestedUpgrade
                  ? `Your tenant is using ${highestUsage}% of included capacity. The next commercial tier is ${suggestedUpgrade.name}, which increases headroom before service limits begin to affect operations.`
                  : 'Your tenant is operating comfortably inside plan limits. No commercial upgrade is currently recommended based on visible capacity usage.'}
              </p>
              {suggestedUpgrade ? (
                <div className="theme-soft-surface mt-5 rounded-2xl p-4">
                  <p className="text-sm font-semibold theme-text-primary">{suggestedUpgrade.name}</p>
                  <p className="mt-1 text-sm theme-text-secondary">
                    {suggestedUpgrade.websitePrice}
                    {suggestedUpgrade.websiteCadence}
                    {suggestedUpgrade.annualPrepayLabel ? ` • ${suggestedUpgrade.annualPrepayLabel}` : ''}
                  </p>
                  <p className="mt-3 text-sm theme-text-secondary">
                    {suggestedUpgrade.limits.maxApps} sites • {suggestedUpgrade.limits.maxPolicies} policies • {suggestedUpgrade.limits.logRetentionDays} day logs
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
