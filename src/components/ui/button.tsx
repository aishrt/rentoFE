import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium',
    // `scale` is listed because Tailwind v4's scale utilities set the `scale` property, not `transform`.
    'transition-[background-color,border-color,color,scale] duration-120 ease-out active:scale-98',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55',
    '[&_svg]:size-4.5 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-sm inset-shadow-highlight hover:bg-primary-hover focus-visible:outline-primary',
        secondary: 'border border-line bg-surface text-ink hover:border-ink/25 hover:bg-canvas',
        ghost: 'text-ink hover:bg-ink/5',
        gold: 'bg-gold text-ink inset-shadow-highlight hover:bg-gold-hover focus-visible:outline-gold',
        'outline-light':
          'border border-canvas/30 text-canvas hover:border-canvas/60 hover:bg-canvas/10 focus-visible:outline-canvas',
        danger:
          'bg-danger text-white inset-shadow-highlight hover:bg-danger-hover focus-visible:outline-danger',
      },
      size: {
        sm: 'h-10 px-4 text-sm',
        md: 'h-11 px-5 text-ui',
        lg: 'h-12 px-6 text-base',
        icon: 'size-11',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (e.g. a router Link) with button styles. */
    asChild?: boolean;
    /** Disables the button and shows a spinner while an action runs. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, block }), className);

  if (asChild) {
    return (
      <Slot className={classes} {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
