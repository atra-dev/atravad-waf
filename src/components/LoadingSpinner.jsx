export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-[3px]',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full border-[color:var(--border-soft)] bg-[var(--accent-soft)]`} />
        <div
          className={`absolute inset-0 ${sizeClasses[size]} animate-spin rounded-full border-transparent border-t-[var(--accent-strong)] border-r-[var(--text-primary)]`}
        />
      </div>
    </div>
  );
}
