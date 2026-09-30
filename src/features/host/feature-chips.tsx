import { Plus, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';

/** Popular extras on NZ rentals, offered as one-tap chips. Hosts can add their own too. */
const FEATURE_SUGGESTIONS = [
  'Apple CarPlay',
  'Android Auto',
  'Bluetooth',
  'Reversing camera',
  'Parking sensors',
  'Cruise control',
  'Heated seats',
  'Sunroof',
  'All-wheel drive',
  'Bike rack',
  'Roof racks',
  'Tow bar',
  'Keyless entry',
  'USB charging',
  'Built-in GPS',
  'ISOFIX child seat anchors',
] as const;

const MAX_FEATURES = 20;
const MAX_FEATURE_LENGTH = 40;

interface FeatureChipsProps {
  value: string[];
  onChange: (value: string[]) => void;
  /** The field's label, for the add input's name. */
  labelId?: string;
  error?: string;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Key features as chips (plan §9, Days 8–11): the chosen ones with a remove button, suggestions to add
 * with one tap, and a field for anything else. Guests filter and compare on these, so they stay short.
 */
export function FeatureChips({ value, onChange, labelId, error }: FeatureChipsProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const full = value.length >= MAX_FEATURES;
  const suggestions = FEATURE_SUGGESTIONS.filter((feature) => !value.some((chosen) => same(chosen, feature)));

  const add = (feature: string) => {
    const text = feature.trim().replace(/\s+/g, ' ');
    if (!text) return;
    if (text.length > MAX_FEATURE_LENGTH) {
      setProblem(`Keep each feature under ${MAX_FEATURE_LENGTH} characters.`);
      return;
    }
    if (full) {
      setProblem(`You can list up to ${MAX_FEATURES} features.`);
      return;
    }
    setProblem(null);
    if (!value.some((chosen) => same(chosen, text))) onChange([...value, text]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      // Adds the feature instead of submitting the step.
      event.preventDefault();
      add(draft);
    }
  };

  const message = problem ?? error;

  return (
    <div className="grid gap-4">
      {value.length > 0 && (
        <ul aria-label="Chosen features" className="flex flex-wrap gap-2">
          {value.map((feature) => (
            <li
              key={feature}
              className="inline-flex animate-pop-in items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3.5 text-sm font-medium text-primary"
            >
              {feature}
              <button
                type="button"
                aria-label={`Remove ${feature}`}
                onClick={() => onChange(value.filter((chosen) => chosen !== feature))}
                className="flex size-8 items-center justify-center rounded-full transition-[background-color,scale] duration-120 hover:bg-primary/15 active:scale-90 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && !full && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Suggestions</p>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((feature) => (
              <li key={feature}>
                <button
                  type="button"
                  onClick={() => add(feature)}
                  className={cn(
                    'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm text-ink',
                    'transition-[border-color,background-color,scale] duration-120 ease-out hover:border-primary/40 hover:bg-primary/5 active:scale-96',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  )}
                >
                  <Plus aria-hidden="true" className="size-3.5 text-primary" />
                  {feature}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          id={inputId}
          aria-labelledby={labelId ? `${labelId} ${inputId}-hint` : undefined}
          aria-describedby={message ? `${inputId}-problem` : undefined}
          value={draft}
          maxLength={MAX_FEATURE_LENGTH + 10}
          placeholder="Add another feature"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={full}
        />
        <span id={`${inputId}-hint`} className="sr-only">
          Add another feature
        </span>
        <Button variant="secondary" size="lg" onClick={() => add(draft)} disabled={full || !draft.trim()}>
          Add
        </Button>
      </div>
      {message && (
        <p id={`${inputId}-problem`} role="alert" className="-mt-2 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
