import { cn } from '@/lib/utils';

export function Spotlight({ className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        className
      )}
    >
      <div className="absolute -left-10 top-0 h-56 w-56 rounded-full bg-[#7c1621]/25 blur-3xl" />
      <div className="absolute right-0 top-8 h-48 w-48 rounded-full bg-[#d4a64f]/16 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#874d13]/16 blur-3xl" />
    </div>
  );
}
