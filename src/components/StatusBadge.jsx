export default function StatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    online: {
      bg: 'bg-green-100 dark:bg-green-950/45',
      text: 'text-green-800 dark:text-green-300',
      dot: 'bg-green-400 dark:bg-green-500',
      label: 'Online',
    },
    offline: {
      bg: 'bg-red-100 dark:bg-red-950/45',
      text: 'text-red-800 dark:text-red-300',
      dot: 'bg-red-400 dark:bg-red-500',
      label: 'Offline',
    },
    degraded: {
      bg: 'bg-yellow-100 dark:bg-yellow-950/45',
      text: 'text-yellow-800 dark:text-yellow-300',
      dot: 'bg-yellow-400 dark:bg-yellow-500',
      label: 'Degraded',
    },
    pending: {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-800 dark:text-slate-200',
      dot: 'bg-slate-400 dark:bg-slate-500',
      label: 'Pending',
    },
    completed: {
      bg: 'bg-green-100 dark:bg-green-950/45',
      text: 'text-green-800 dark:text-green-300',
      dot: 'bg-green-400 dark:bg-green-500',
      label: 'Completed',
    },
    in_progress: {
      bg: 'bg-blue-100 dark:bg-blue-950/45',
      text: 'text-blue-800 dark:text-blue-300',
      dot: 'bg-blue-400 dark:bg-blue-500',
      label: 'In Progress',
    },
  };

  const config = statusConfig[status] || statusConfig.offline;
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} ${config.bg} ${config.text} font-medium rounded-full`}
    >
      <span className={`w-2 h-2 ${config.dot} rounded-full mr-2 animate-pulse`}></span>
      {config.label}
    </span>
  );
}
