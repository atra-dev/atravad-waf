'use client';

import LoadingSpinner from '@/components/LoadingSpinner';

function SurfaceGlow({ className }) {
  return <div className={`absolute rounded-full blur-3xl ${className}`} aria-hidden="true" />;
}

export default function AppLoadingState({
  title = 'Loading workspace',
  message = 'Preparing your managed security workspace and syncing the latest data.',
  variant = 'page',
  className = '',
}) {
  const isPanel = variant === 'panel';

  return (
    <div
      className={[
        'relative overflow-hidden',
        isPanel ? 'rounded-[28px] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fbff_0%,#eef6ff_55%,#f5fbf8_100%)] p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)]' : 'min-h-[55vh] rounded-[32px] border border-slate-200/80 bg-[linear-gradient(145deg,#f8fbff_0%,#eef6ff_55%,#f5fbf8_100%)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)]',
        className,
      ].join(' ')}
    >
      <SurfaceGlow className="left-8 top-8 h-32 w-32 bg-cyan-200/40" />
      <SurfaceGlow className="right-8 top-12 h-40 w-40 bg-emerald-200/30" />
      <SurfaceGlow className="bottom-0 left-1/3 h-36 w-36 bg-blue-200/30" />

      <div className={`relative flex ${isPanel ? 'min-h-[220px]' : 'min-h-[420px]'} items-center justify-center`}>
        <div className="w-full max-w-3xl rounded-[28px] border border-white/70 bg-white/80 p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">ATRAVA Defense</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
            </div>

            <div className="flex shrink-0 items-center gap-4 rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4">
              <LoadingSpinner size={isPanel ? 'md' : 'lg'} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
                <p className="mt-2 text-sm font-medium text-slate-700">Loading latest state</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              'Syncing tenant context',
              'Preparing protection data',
              'Rendering managed workspace',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <div className="h-2 w-16 animate-pulse rounded-full bg-slate-200" />
                <p className="mt-3 text-sm text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
