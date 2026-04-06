import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
  {
    variants: {
      variant: {
        default: 'border-[#d4a64f]/25 bg-[#d4a64f]/10 text-[#d4a64f]',
        maroon: 'border-[#7c1621]/40 bg-[#4f0c13]/35 text-[#f0c4b5]',
        muted: 'border-[#d4a64f]/12 bg-white/[0.04] text-[#c8b48e]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
