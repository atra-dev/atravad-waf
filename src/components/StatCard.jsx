export default function StatCard({ title, value, icon: Icon, trend, subtitle, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
            {title}
          </p>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-semibold ${trend.type === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <Icon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
