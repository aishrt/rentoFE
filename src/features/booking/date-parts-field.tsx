import { CircleAlert } from 'lucide-react';
import { useId, useState, type Ref } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

interface DatePartsFieldProps {
  legend: string;
  /** "1990-04-21", or empty while incomplete. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  description?: string;
  error?: string;
  /** "bday" for a date of birth, so browsers can fill it in. */
  autoComplete?: 'bday';
  ref?: Ref<HTMLInputElement>;
}

const pad = (value: string) => value.padStart(2, '0');

/**
 * A date typed as day, month and year, for dates people know by heart or read off a card: a date of birth,
 * or a licence's issue and expiry dates. A calendar would mean paging back decades. Each part is a labelled
 * number field; the value is "YYYY-MM-DD" once all three are filled in.
 */
export function DatePartsField({
  legend,
  value,
  onChange,
  onBlur,
  description,
  error,
  autoComplete,
  ref,
}: DatePartsFieldProps) {
  const id = useId();
  const [initialYear = '', initialMonth = '', initialDay = ''] = value ? value.split('-') : [];
  const [parts, setParts] = useState({
    day: initialDay.replace(/^0/, ''),
    month: initialMonth.replace(/^0/, ''),
    year: initialYear,
  });
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    setParts(next);
    const complete = /^\d{1,2}$/.test(next.day) && /^\d{1,2}$/.test(next.month) && /^\d{4}$/.test(next.year);
    onChange(complete ? `${next.year}-${pad(next.month)}-${pad(next.day)}` : '');
  };

  const box = (key: keyof typeof parts, label: string, width: string, maxLength: number, first?: boolean) => (
    <div className={cn('grid gap-1', width)}>
      <label htmlFor={`${id}-${key}`} className="text-xs text-muted">
        {label}
      </label>
      <Input
        ref={first ? ref : undefined}
        id={`${id}-${key}`}
        inputMode="numeric"
        autoComplete={autoComplete ? `${autoComplete}-${key}` : 'off'}
        maxLength={maxLength}
        value={parts[key]}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => update({ ...parts, [key]: event.target.value.replace(/\D/g, '') })}
        onBlur={onBlur}
        className="px-3 tabular-nums"
      />
    </div>
  );

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium text-ink">{legend}</legend>
      <div className={cn('flex gap-2', error && 'animate-shake')}>
        {box('day', 'Day', 'w-16', 2, true)}
        {box('month', 'Month', 'w-16', 2)}
        {box('year', 'Year', 'w-24', 4)}
      </div>
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
    </fieldset>
  );
}
