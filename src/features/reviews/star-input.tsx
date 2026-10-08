import { Star } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

const WORDS = ['', 'Poor', 'Below expectations', 'Good', 'Very good', 'Excellent'];

interface StarInputProps {
  legend: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}

/**
 * Choosing 1–5 whole stars (plan §3: ratings of 1–5 whole stars). Five real radios in a fieldset, so arrow
 * keys move between them and screen readers hear "4 stars, Very good".
 */
export function StarInput({ legend, value, onChange, error }: StarInputProps) {
  const name = useId();
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset className="grid gap-1.5" aria-invalid={error ? true : undefined}>
      <legend className="mb-1 text-sm font-medium text-ink">{legend}</legend>
      <div className="flex items-center gap-3">
        <div className="flex" onPointerLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <label
              key={star}
              className="group/star cursor-pointer p-1 has-focus-visible:rounded-full has-focus-visible:outline-2 has-focus-visible:outline-primary"
              onPointerEnter={() => setHover(star)}
            >
              <input
                type="radio"
                name={name}
                value={star}
                checked={value === star}
                onChange={() => onChange(star)}
                className="sr-only"
                aria-label={`${star} ${star === 1 ? 'star' : 'stars'}, ${WORDS[star]}`}
              />
              <Star
                aria-hidden="true"
                strokeWidth={1.5}
                className={cn(
                  'size-7 transition-[color,scale] duration-120 group-active/star:scale-90',
                  star <= shown ? 'fill-primary text-primary' : 'text-ink/25',
                )}
              />
            </label>
          ))}
        </div>
        <span className="text-sm text-muted" aria-hidden="true">
          {WORDS[shown]}
        </span>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}
