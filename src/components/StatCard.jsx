export default function StatCard({ title, value, icon: Icon, trend, subtitle, className = '' }) {
  return (
    <div className={`theme-surface rounded-xl p-6 transition-shadow hover:shadow-[var(--shadow-medium)] ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium uppercase tracking-wide theme-text-secondary">
            {title}
          </p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold theme-text-primary">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-semibold ${trend.type === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm theme-text-muted">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <Icon className="h-6 w-6 text-[var(--accent-strong)]" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
