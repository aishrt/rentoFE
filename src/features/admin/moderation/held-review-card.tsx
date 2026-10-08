import { Eye, EyeOff } from 'lucide-react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import type { ModerationReview } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { formatNzDate } from '@/features/booking/booking-format';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { cn } from '@/lib/cn';
import { REVIEW_DIRECTION } from './moderation-labels';
import type { ReviewState } from './moderation-api';

const CATEGORY_LABELS: { key: 'communication' | 'pickupReturn' | 'cleanliness' | 'care'; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'pickupReturn', label: 'Pick-up and return' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'care', label: 'Care of the car' },
];

const personLink = 'link-underline font-medium text-primary';

interface HeldReviewCardProps {
  review: ModerationReview;
  /** Held or hidden: which list it's in. */
  state: ReviewState;
  /** Held reviews only: a hidden one stays hidden. */
  onPublish?: () => void;
  onHide?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A review held back before publishing, or hidden: who wrote it about whom, the stars and words, why it
 * was held, and Publish or Hide. Laid out like the public review card (features/reviews/review-card).
 */
export function HeldReviewCard({ review, state, onPublish, onHide, className, style }: HeldReviewCardProps) {
  const author = review.author.firstName;
  return (
    <li
      aria-label={`Review by ${author}`}
      className={cn('grid gap-4 rounded-card border border-line bg-surface p-5 sm:p-6', className)}
      style={style}
    >
      <header className="flex items-start gap-3">
        <PersonAvatar name={author} photoUrl={review.author.avatarUrl} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="text-ink">
            <Link to={`/admin/users/${review.author.id}`} className={personLink}>
              {author}
            </Link>{' '}
            <span className="text-muted">about</span>{' '}
            <Link to={`/admin/users/${review.subject.id}`} className={personLink}>
              {review.subject.firstName}
            </Link>
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {REVIEW_DIRECTION[review.direction]} · {review.vehicleTitle} · Booking{' '}
            <Link
              to={`/admin/bookings/${review.bookingRef}`}
              className="link-underline font-medium text-primary"
            >
              {review.bookingRef}
            </Link>{' '}
            · Written {formatNzDate(review.createdAt)}
          </p>
          <RatingStars value={review.overall} size="sm" className="mt-1.5" />
        </div>
      </header>

      {review.body ? (
        <blockquote className="border-l-2 border-line pl-4 break-words whitespace-pre-wrap text-ink/90">
          {review.body}
        </blockquote>
      ) : (
        <p className="text-sm text-muted">Stars only, no written review.</p>
      )}

      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {CATEGORY_LABELS.filter(({ key }) => review[key]).map(({ key, label }) => (
          <div key={key} className="flex gap-1">
            <dt>{label}</dt>
            <dd className="font-medium text-ink">{review[key]}/5</dd>
          </div>
        ))}
      </dl>

      <Alert title={state === 'HELD' ? 'Why it was held' : 'Why it was hidden'}>
        <p className="whitespace-pre-line">{review.moderationReason}</p>
      </Alert>

      {(onPublish || onHide) && (
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          {onHide && (
            <Button variant="secondary" size="sm" onClick={onHide}>
              <EyeOff aria-hidden="true" />
              Hide
            </Button>
          )}
          {onPublish && (
            <Button size="sm" onClick={onPublish}>
              <Eye aria-hidden="true" />
              Publish
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
