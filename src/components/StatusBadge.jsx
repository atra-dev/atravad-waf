export default function StatusBadge({ status, size = 'md' }) {
  const statusConfig = {
    online: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-400',
      label: 'Online',
    },
    offline: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      dot: 'bg-red-400',
      label: 'Offline',
    },
    degraded: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      dot: 'bg-yellow-400',
      label: 'Degraded',
    },
    pending: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      dot: 'bg-gray-400',
      label: 'Pending',
    },
    completed: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      dot: 'bg-green-400',
      label: 'Completed',
    },
    in_progress: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      dot: 'bg-blue-400',
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
