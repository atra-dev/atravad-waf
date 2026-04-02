'use client';

function getUsageTone(percentUsed) {
  if (percentUsed >= 100) return 'text-red-700 bg-red-50/90 border-red-200 dark:text-red-300 dark:bg-red-950/35 dark:border-red-900/50';
  if (percentUsed >= 80) return 'text-amber-700 bg-amber-50/90 border-amber-200 dark:text-amber-300 dark:bg-amber-950/35 dark:border-amber-900/50';
  return 'text-emerald-700 bg-emerald-50/90 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/35 dark:border-emerald-900/50';
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
    <div className="relative overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,#fbfdff_0%,#f4f8ff_48%,#f8fcfb_100%)] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.94)_55%,rgba(17,24,39,0.98)_100%)] dark:shadow-none">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_24%)]" />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
            Subscription
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100 sm:text-[2rem]">
            {tenant.subscription.planName}
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            {tenant.subscription.pricing?.websitePrice}
            {tenant.subscription.pricing?.websiteCadence}
            {tenant.subscription.pricing?.annualPrepayLabel
              ? ` • ${tenant.subscription.pricing.annualPrepayLabel}`
              : ''}
          </p>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
            Log retention: {tenant.limits?.logRetentionDays || 0} days • Analytics retention:{' '}
            {tenant.limits?.analyticsRetentionDays || 0} days
          </p>
        </div>

        <div
          className={`inline-flex h-fit rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm ${getUsageTone(highestUsage)}`}
        >
          {highestUsage >= 100
            ? 'Limit reached'
            : highestUsage >= 80
              ? 'Approaching plan limits'
              : 'Within plan capacity'}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="relative mt-6 grid gap-3 md:grid-cols-3">
          {entries.map((entry) => (
            <div
              key={entry.label}
              className="rounded-2xl border border-white/70 bg-white/80 px-4 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {entry.label}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${getUsageTone(entry.percentUsed)}`}
                >
                  {entry.limit > 0 ? `${Math.min(entry.percentUsed, 999)}%` : 'Custom'}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                {formatUsage(entry.current, entry.limit)}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    entry.percentUsed >= 100
                      ? 'bg-red-500'
                      : entry.percentUsed >= 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(8, Math.min(entry.percentUsed, 100))}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {entry.limit > 0
                  ? `${Math.min(entry.percentUsed, 999)}% of included capacity used`
                  : 'Custom capacity'}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
