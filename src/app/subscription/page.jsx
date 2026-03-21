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
          ? 'border-emerald-200 bg-[linear-gradient(135deg,#f3fff7_0%,#ebfff5_100%)] text-emerald-800'
          : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}
    >
      {children}
    </div>
  );
}

function CapacityCard({ icon: Icon, label, value, note, tone }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/85 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function ComparisonCard({ plan, active }) {
  return (
    <div
      className={`rounded-[26px] border p-5 shadow-sm transition-colors ${
        active
          ? 'border-cyan-300 bg-[linear-gradient(145deg,#0f172a_0%,#0b1f33_100%)] text-white shadow-[0_20px_60px_rgba(8,15,29,0.22)]'
          : 'border-slate-200 bg-white text-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${active ? 'text-cyan-300' : 'text-slate-500'}`}>
            {plan.name}
          </p>
          <p className={`mt-3 text-3xl font-semibold tracking-tight ${active ? 'text-white' : 'text-slate-950'}`}>
            {plan.websitePrice}
            {plan.websiteCadence ? <span className={`ml-1 text-base font-medium ${active ? 'text-slate-300' : 'text-slate-500'}`}>{plan.websiteCadence}</span> : null}
          </p>
        </div>
        {active ? (
          <span className="rounded-full bg-cyan-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950">
            Current
          </span>
        ) : null}
      </div>
      <p className={`mt-4 text-sm leading-7 ${active ? 'text-slate-300' : 'text-slate-600'}`}>
        {plan.description}
      </p>
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-300' : 'text-slate-500'}>Sites</span>
          <span className="font-semibold">{plan.limits.maxApps}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-300' : 'text-slate-500'}>Policies</span>
          <span className="font-semibold">{plan.limits.maxPolicies}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={active ? 'text-slate-300' : 'text-slate-500'}>Logs</span>
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
        <div className="rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,#fff9ed_0%,#fffdf7_100%)] p-8 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscription</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">
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
        <section className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fbff_0%,#edf5ff_50%,#f5fbf7_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_22%)]" />
          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">Commercial Control</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-[3.25rem]">
                  Subscription
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Review plan entitlements, retention, and managed-service coverage for {tenant.name}. This is the commercial operating envelope your tenant is currently running under.
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/70 bg-white/75 text-sky-700 shadow-sm backdrop-blur-sm">
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
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Retention</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Access Window</h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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

          <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Managed Features</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Service Profile</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
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
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Plan Comparison</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Where You Sit In The Stack</h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
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
            <section className="rounded-[30px] border border-slate-200 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_100%)] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Billing Summary</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Renewal Snapshot</h2>
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
                  ? 'border-amber-200 bg-[linear-gradient(160deg,#fffaf0_0%,#fff6e6_100%)]'
                  : 'border-emerald-200 bg-[linear-gradient(160deg,#f3fff8_0%,#ebfff4_100%)]'
              }`}
            >
              <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${suggestedUpgrade ? 'text-amber-700' : 'text-emerald-700'}`}>
                Capacity Advisory
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {suggestedUpgrade ? 'Upgrade recommended' : 'Capacity is healthy'}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {suggestedUpgrade
                  ? `Your tenant is using ${highestUsage}% of included capacity. The next commercial tier is ${suggestedUpgrade.name}, which increases headroom before service limits begin to affect operations.`
                  : 'Your tenant is operating comfortably inside plan limits. No commercial upgrade is currently recommended based on visible capacity usage.'}
              </p>
              {suggestedUpgrade ? (
                <div className="mt-5 rounded-2xl border border-white/70 bg-white/75 p-4">
                  <p className="text-sm font-semibold text-slate-900">{suggestedUpgrade.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {suggestedUpgrade.websitePrice}
                    {suggestedUpgrade.websiteCadence}
                    {suggestedUpgrade.annualPrepayLabel ? ` • ${suggestedUpgrade.annualPrepayLabel}` : ''}
                  </p>
                  <p className="mt-3 text-sm text-slate-600">
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
