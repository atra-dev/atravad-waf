import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-[#d4a64f]/12 bg-[linear-gradient(180deg,rgba(20,12,10,0.88),rgba(7,5,5,0.98))] text-[#f7efe0] shadow-[0_24px_70px_rgba(0,0,0,0.34)]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-3 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-xl font-semibold text-[#fff4d8]', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm leading-7 text-[#ccbda1]', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}
