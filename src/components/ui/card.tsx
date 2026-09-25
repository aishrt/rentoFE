import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const cardVariants = cva('', {
  variants: {
    variant: {
      /** White card with a hairline and a soft shadow. The default. */
      elevated: 'rounded-card border border-line/80 bg-surface shadow-card',
      /** A panel that floats over imagery or colour: larger radius and a deeper shadow. */
      raised: 'rounded-sheet bg-surface shadow-lift ring-1 ring-ink/5',
      /** Quiet grouping on a white section: hairline only, no shadow. */
      flat: 'rounded-card border border-line bg-canvas',
      /** Translucent panel on dark backgrounds with a light top edge. No blur: that is kept for sticky bars (plan §12.2). */
      tinted: 'rounded-card border border-canvas/15 bg-ink/55 inset-shadow-highlight',
    },
  },
  defaultVariants: { variant: 'elevated' },
});

type CardProps = ComponentProps<'div'> &
  VariantProps<typeof cardVariants> & {
    /**
     * Render the child element (e.g. a form or list item) with card styles. Put classes on the Card,
     * not the child: the child's className is appended without resolving conflicts with the variant.
     */
    asChild?: boolean;
  };

export function Card({ className, variant, asChild = false, ...props }: CardProps) {
  const Component = asChild ? Slot : 'div';
  return <Component className={cn(cardVariants({ variant }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 p-5 sm:p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-base font-semibold text-ink', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted', className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}
