import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const iconButtonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center',
    'transition-[background-color,color,scale] duration-120 ease-out active:scale-94',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-5 [&_svg]:shrink-0',
  ],
  {
    variants: {
      tone: {
        default: 'text-ink/75 hover:bg-ink/6 hover:text-ink',
        'on-dark': 'text-canvas/80 hover:bg-canvas/10 hover:text-canvas focus-visible:outline-canvas',
      },
      size: {
        /** 44 px round: the minimum touch target (plan §12.2). */
        md: 'size-11 rounded-full',
        /** 44 px wide and as tall as the input it sits inside (see Input's `trailing`). */
        inset: 'h-full w-11 rounded-inner',
      },
    },
    defaultVariants: { tone: 'default', size: 'md' },
  },
);

type IconButtonProps = Omit<ComponentProps<'button'>, 'aria-label'> &
  VariantProps<typeof iconButtonVariants> & {
    /** The accessible name. Icon-only buttons have no visible text, so this is required. */
    label: string;
    /**
     * Where the label shows as a tooltip on hover and keyboard focus. Defaults to below, or above for
     * `inset` buttons so it doesn't cover the next field. `none` turns it off.
     */
    tooltip?: 'top' | 'bottom' | 'none';
  };

/** A button that shows only an icon. Pass the icon as the child, with `aria-hidden`. */
export function IconButton({
  label,
  tone,
  size,
  tooltip,
  className,
  type,
  children,
  ...props
}: IconButtonProps) {
  const tooltipSide = tooltip ?? (size === 'inset' ? 'top' : 'bottom');

  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      className={cn(iconButtonVariants({ tone, size }), className)}
      {...props}
    >
      {children}
      {tooltipSide !== 'none' && (
        // A visual copy of the aria-label, so screen readers don't hear the name twice.
        <span
          aria-hidden="true"
          className={cn('tooltip', tooltipSide === 'top' ? 'tooltip-top' : 'tooltip-bottom')}
        >
          {label}
        </span>
      )}
    </button>
  );
}
