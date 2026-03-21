'use client';

function getUsageTone(percentUsed) {
  if (percentUsed >= 100) return 'text-red-700 bg-red-50 border-red-200';
  if (percentUsed >= 80) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-emerald-700 bg-emerald-50 border-emerald-200';
}

function formatUsage(current, limit) {
  if (!Number.isFinite(limit) || limit <= 0) return `${current}`;
  return `${current} / ${limit}`;
}

export default function TenantPlanBanner({ tenant, resources = [] }) {
  if (!tenant?.subscription) return null;

  const entries = resources
    .map((resource) => {
      const current = Number(resource.current || 0);
      const limit = Number(resource.limit || 0);
      const percentUsed = limit > 0 ? Math.round((current / limit) * 100) : 0;
      return {
        ...resource,
        current,
        limit,
        percentUsed,
      };
    })
    .filter(Boolean);

  const highestUsage = entries.reduce((max, entry) => Math.max(max, entry.percentUsed), 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#f3f7ff_100%)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Subscription</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">
            {tenant.subscription.planName}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {tenant.subscription.pricing?.websitePrice}
            {tenant.subscription.pricing?.websiteCadence}
            {tenant.subscription.pricing?.annualPrepayLabel
              ? ` • ${tenant.subscription.pricing.annualPrepayLabel}`
              : ''}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Log retention: {tenant.limits?.logRetentionDays || 0} days • Analytics retention: {tenant.limits?.analyticsRetentionDays || 0} days
          </p>
        </div>
        <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getUsageTone(highestUsage)}`}>
          {highestUsage >= 100 ? 'Limit reached' : highestUsage >= 80 ? 'Approaching plan limits' : 'Within plan capacity'}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {entries.map((entry) => (
            <div key={entry.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{entry.label}</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {formatUsage(entry.current, entry.limit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {entry.limit > 0 ? `${Math.min(entry.percentUsed, 999)}% of included capacity used` : 'Custom capacity'}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
