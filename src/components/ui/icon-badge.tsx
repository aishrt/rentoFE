import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const iconBadgeVariants = cva('flex shrink-0 items-center justify-center [&_svg]:shrink-0', {
  variants: {
    size: {
      sm: 'size-9 [&_svg]:size-4.5',
      md: 'size-10 [&_svg]:size-5',
      lg: 'size-12 [&_svg]:size-6',
      xl: 'size-14 [&_svg]:size-6',
    },
    tone: {
      soft: 'bg-primary/8 text-primary',
      solid: 'bg-primary text-white inset-shadow-highlight',
      muted: 'bg-ink/5 text-muted',
      'on-dark': 'bg-canvas/10 text-canvas',
    },
    shape: {
      circle: 'rounded-full',
      square: 'rounded-card',
    },
  },
  defaultVariants: { size: 'md', tone: 'soft', shape: 'circle' },
});

type IconBadgeProps = VariantProps<typeof iconBadgeVariants> & {
  /** The icon. The badge sizes it, so pass it without a size class. */
  children: ReactNode;
  className?: string;
};

/** A decorative icon in a tinted circle or rounded square. Hidden from screen readers. */
export function IconBadge({ size, tone, shape, className, children }: IconBadgeProps) {
  return (
    <span aria-hidden="true" className={cn(iconBadgeVariants({ size, tone, shape }), className)}>
      {children}
    </span>
  );
}
