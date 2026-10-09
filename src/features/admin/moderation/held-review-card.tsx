import { Eye, EyeOff, RotateCcw } from 'lucide-react';
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

const REASON_TITLE: Record<ReviewState, string> = {
  HELD: 'Why it was held',
  PUBLISHED: 'Why it was published',
  HIDDEN: 'Why it was hidden',
};

/**
 * A review as staff see it: who wrote it about whom, on which booking, and the stars and words. Laid out
 * like the public review card (features/reviews/review-card). Also shown in a report about the review.
 */
export function ModerationReviewContent({ review }: { review: ModerationReview }) {
  const author = review.author.firstName;
  return (
    <>
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
    </>
  );
}

interface HeldReviewCardProps {
  review: ModerationReview;
  /** Held, published or hidden: which list it's in. */
  state: ReviewState;
  /** Held reviews only. */
  onPublish?: () => void;
  /** Held and published reviews. */
  onHide?: () => void;
  /** Hidden reviews: published again, as if never hidden. */
  onRestore?: () => void;
  className?: string;
  style?: CSSProperties;
}

/**
 * A review held back before publishing, published, or hidden: the review, why it was held or hidden (or
 * the note when a held one was published), and Publish, Hide or Restore.
 */
export function HeldReviewCard({
  review,
  state,
  onPublish,
  onHide,
  onRestore,
  className,
  style,
}: HeldReviewCardProps) {
  return (
    <li
      aria-label={`Review by ${review.author.firstName}`}
      className={cn('grid gap-4 rounded-card border border-line bg-surface p-5 sm:p-6', className)}
      style={style}
    >
      <ModerationReviewContent review={review} />

      {review.moderationReason && (
        <Alert title={REASON_TITLE[state]}>
          <p className="whitespace-pre-line">{review.moderationReason}</p>
        </Alert>
      )}

      {(onPublish || onHide || onRestore) && (
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
          {onRestore && (
            <Button variant="secondary" size="sm" onClick={onRestore}>
              <RotateCcw aria-hidden="true" />
              Restore
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
