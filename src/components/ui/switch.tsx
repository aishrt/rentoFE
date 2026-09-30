import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type SwitchProps = Omit<ComponentProps<'button'>, 'onChange' | 'children' | 'role'> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Shown beside the switch; pressing it flips the switch too. */
  label: ReactNode;
  /** A short line under the label, e.g. what the filter leaves out. */
  description?: ReactNode;
};

/**
 * An on/off setting that applies straight away, such as a search filter (plan §12.3). It's a button with
 * `role="switch"`, so Space and Enter flip it and screen readers hear "on" or "off"; the label is a real
 * <label>, so pressing it flips the switch too. The row is at least 44 px tall, and the track's touch area
 * reaches 44 px around it.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  className,
  id,
  disabled,
  onClick,
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = description ? `${switchId}-description` : undefined;

  return (
    <div
      className={cn('flex min-h-11 items-center justify-between gap-4', disabled && 'opacity-55', className)}
    >
      <div className="min-w-0">
        <label
          htmlFor={switchId}
          className={cn('text-sm font-medium text-ink', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        >
          {label}
        </label>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-xs text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        {...props}
        type="button"
        role="switch"
        id={switchId}
        aria-checked={checked}
        aria-describedby={descriptionId}
        disabled={disabled}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) onCheckedChange(!checked);
        }}
        className={cn(
          'group/switch relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5',
          'transition-[background-color,scale] duration-200 ease-out active:scale-95',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          'disabled:cursor-not-allowed disabled:active:scale-100',
          // The 28 px track gets a 44 px touch area (plan §12.2).
          'before:absolute before:-inset-2 before:rounded-full',
          checked ? 'bg-primary enabled:hover:bg-primary-hover' : 'bg-ink/15 enabled:hover:bg-ink/25',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-6 rounded-full bg-surface shadow-card transition-[translate,scale] duration-200 ease-out',
            'group-active/switch:scale-90',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  );
}
