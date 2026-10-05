import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

const STARS = [1, 2, 3, 4, 5];

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

interface RatingStarsProps {
  /** Average stars, 0–5. Part stars are filled in proportion, so 4.5 shows four and a half. */
  value: number;
  size?: keyof typeof SIZES;
  /** Read out instead of the default "Rated 4.5 out of 5". */
  label?: string;
  className?: string;
}

/**
 * A row of five stars showing a rating (display only; reviews are written in the dashboards). It is one
 * image to screen readers, "Rated 4.5 out of 5", rather than five separate stars.
 */
export function RatingStars({ value, size = 'md', label, className }: RatingStarsProps) {
  const stars = Math.max(0, Math.min(5, value));
  const iconClasses = cn(SIZES[size], 'shrink-0 fill-current');

  return (
    <span
      role="img"
      aria-label={label ?? `Rated ${(Math.round(stars * 10) / 10).toFixed(1)} out of 5`}
      className={cn('relative inline-flex shrink-0', className)}
    >
      <span aria-hidden="true" className="flex gap-0.5 text-ink/12">
        {STARS.map((star) => (
          <Star key={star} className={iconClasses} strokeWidth={0} />
        ))}
      </span>
      {/* The filled stars on top, clipped to the rating. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 flex gap-0.5 overflow-hidden text-primary"
        style={{ width: `${(stars / 5) * 100}%` }}
      >
        {STARS.map((star) => (
          <Star key={star} className={iconClasses} strokeWidth={0} />
        ))}
      </span>
    </span>
  );
}
