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
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <FieldContext value={{ id: controlId, invalid: Boolean(error), describedBy }}>
      <div className={cn('grid gap-1.5', className)}>
        <div className={cn('flex items-baseline justify-between gap-3', hideLabel && 'sr-only')}>
          <label htmlFor={controlId} className="text-sm font-medium text-ink">
            {label}
          </label>
          {labelAside}
        </div>
        {/* Shakes once when an error appears; the global reduced-motion rule turns it off. */}
        <div className={cn(error && 'animate-shake')}>{children}</div>
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
