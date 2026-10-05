import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode, type Ref } from 'react';
import { cn } from '@/lib/cn';

export interface Choice<Value extends string> {
  value: Value;
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
}

interface ChoiceCardsProps<Value extends string> {
  legend: ReactNode;
  description?: ReactNode;
  name: string;
  value: Value | '';
  onChange: (value: Value) => void;
  onBlur?: () => void;
  choices: readonly Choice<Value>[];
  error?: string;
  /** Columns from the small breakpoint up; phones always stack. */
  columns?: 1 | 2 | 3;
  /** Side by side on phones too, for short choices such as Automatic or Manual. */
  compact?: boolean;
  className?: string;
  /** The first radio, so react-hook-form's setFocus reaches the group. */
  ref?: Ref<HTMLInputElement>;
}

/**
 * Radio buttons drawn as cards, for choices that need a sentence each (transmission, fuel policy,
 * cancellation policy). They're real radios in a fieldset, so arrow keys move between them and screen
 * readers hear the group's name.
 */
export function ChoiceCards<Value extends string>({
  legend,
  description,
  name,
  value,
  onChange,
  onBlur,
  choices,
  error,
  columns = 2,
  compact = false,
  className,
  ref,
}: ChoiceCardsProps<Value>) {
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <fieldset
      aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
      aria-invalid={error ? true : undefined}
      className={cn('grid min-w-0 gap-2', className)}
    >
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      {description && (
        <p id={descriptionId} className="-mt-1 mb-1 text-sm text-muted">
          {description}
        </p>
      )}
      <div
        className={cn(
          'grid gap-3',
          error && 'animate-shake',
          columns === 2 && (compact ? 'grid-cols-2' : 'sm:grid-cols-2'),
          columns === 3 && 'sm:grid-cols-3',
        )}
      >
        {choices.map((choice, index) => (
          <label
            key={choice.value}
            className={cn(
              'group/choice relative flex min-h-14 cursor-pointer items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-input',
              'transition-[border-color,background-color,scale] duration-120 ease-out active:scale-99 hover:border-ink/25',
              'has-checked:border-primary has-checked:bg-primary/4 has-checked:ring-1 has-checked:ring-primary',
              'has-focus-visible:ring-4 has-focus-visible:ring-primary/15',
              error && 'border-danger',
            )}
          >
            <input
              ref={index === 0 ? ref : undefined}
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              onChange={() => onChange(choice.value)}
              onBlur={onBlur}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-line bg-surface transition-colors duration-120',
                'peer-checked:border-primary',
                'after:size-2.5 after:scale-0 after:rounded-full after:bg-primary after:transition-[scale] after:duration-200 after:ease-out peer-checked:after:scale-100',
              )}
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink [&_svg]:size-4.5 [&_svg]:text-primary">
                {choice.icon}
                {choice.label}
              </span>
              {choice.description && <span className="text-sm text-muted">{choice.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="flex animate-fade-in items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}
