import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[#d4a64f] text-[#1a1007] hover:bg-[#ebbd62]',
        outline: 'border border-[#d4a64f]/25 bg-transparent text-[#f3e0b6] hover:border-[#d4a64f]/45 hover:bg-white/[0.03]',
        secondary: 'bg-[#2b0f13] text-[#f8ead0] hover:bg-[#3a141a]',
        ghost: 'text-[#f3e0b6] hover:bg-white/[0.04]',
      },
      size: {
        default: 'h-11 px-5 py-2.5',
        sm: 'h-9 px-4',
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? 'span' : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
