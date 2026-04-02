export default function SkeletonLoader({ variant = 'default', className = '' }) {
  const variants = {
    stat: (
      <div className={`rounded-[28px] border border-slate-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.94)_100%)] dark:shadow-none ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-3 h-3 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="mb-3 h-9 w-20 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
            <div className="h-3 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
        </div>
      </div>
    ),
    table: (
      <div className={`overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-none ${className}`}>
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <div className="h-6 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 flex-1 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
              <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
              <div className="h-4 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
            </div>
          ))}
        </div>
      </div>
    ),
    card: (
      <div className={`rounded-[28px] border border-slate-200/80 bg-[linear-gradient(160deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.94)_100%)] dark:shadow-none ${className}`}>
        <div className="mb-4 h-6 w-32 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"></div>
          ))}
        </div>
      </div>
    ),
    header: (
      <div className={`${className}`}>
        <div className="flex items-center space-x-3 mb-2">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          <div>
            <div className="mb-2 h-8 w-48 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
            <div className="h-4 w-64 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800"></div>
          </div>
        </div>
      </div>
    ),
    default: (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800"></div>
      </div>
    ),
  };

  return variants[variant] || variants.default;
}
