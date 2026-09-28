import { CircleAlert } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  /** Shown beside the box; clicking it ticks the box. May contain links. */
  label: ReactNode;
  error?: string;
};

/**
 * A checkbox with its label beside it and an error below, e.g. accepting the Terms (plan §12.3).
 * It's the browser's own control in the brand colour, so it works with every keyboard and screen reader.
 */
export function Checkbox({ label, error, className, id, ...props }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className={cn('flex items-start gap-3', error && 'animate-shake')}>
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
          {...props}
        />
        <label htmlFor={inputId} className="text-sm leading-6 text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
