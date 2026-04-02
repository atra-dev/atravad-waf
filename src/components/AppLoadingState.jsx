'use client';

import LoadingSpinner from '@/components/LoadingSpinner';

export default function AppLoadingState({
  title = 'Loading workspace',
  variant = 'page',
  className = '',
}) {
  const isPanel = variant === 'panel';

  return (
    <div
      className={[
        'relative',
        isPanel
          ? 'p-2'
          : 'min-h-[18vh] px-2 py-4',
        className,
      ].join(' ')}
    >
      <div className={`relative flex ${isPanel ? 'min-h-[96px]' : 'min-h-[132px]'} items-center justify-center`}>
        <div className="theme-panel w-full max-w-xl rounded-[18px] p-4">
          <div className="flex items-center gap-3">
            <LoadingSpinner size={isPanel ? 'sm' : 'md'} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium theme-text-primary">{title}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[linear-gradient(90deg,var(--accent-strong)_0%,var(--text-primary)_100%)]" />
              </div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] theme-text-muted">Loading</span>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[11px] theme-text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span>Syncing secure workspace state</span>
          </div>
        </div>
      </div>
    </div>
  );
}
