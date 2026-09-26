import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FieldContext } from './field-context';

interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  error?: string;
  description?: ReactNode;
  /** Extra content on the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  hideLabel?: boolean;
  id?: string;
  className?: string;
}

/**
 * Label + control + help text + error, wired together for screen readers: the control gets the id,
 * `aria-invalid` and `aria-describedby` through context, so every form field is accessible by default.
 */
export function Field({
  label,
  children,
  error,
  description,
  labelAside,
  hideLabel,
  id,
  className,
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext value={{ id: controlId, labelId, invalid: Boolean(error), describedBy }}>
      <div className={cn('group/field grid gap-1.5', className)}>
        <div className={cn('flex items-baseline justify-between gap-3', hideLabel && 'sr-only')}>
          {/*
           * The label turns blue while its control has focus or its picker is open, so it's clear which field
           * you're in.
           */}
          <label
            id={labelId}
            htmlFor={controlId}
            className={cn(
              'text-sm font-medium text-ink transition-colors duration-120',
              'group-has-[input:focus-visible]/field:text-primary group-has-[button[aria-haspopup]:focus-visible]/field:text-primary group-has-[[aria-expanded=true]]/field:text-primary',
            )}
          >
            {label}
          </label>
          {labelAside}
        </div>
        {/*
         * Shakes once when an error appears; the global reduced-motion rule turns it off. `min-w-0` keeps
         * controls with a wide built-in size, such as time inputs, inside a narrow column.
         */}
        <div className={cn('min-w-0', error && 'animate-shake')}>{children}</div>
        {description && (
          <p id={descriptionId} className="text-sm text-muted">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext>
  );
}
