import type { ReactNode } from 'react';
import type { Review } from '@/api/types';
import { RatingStars } from '@/components/ui/rating-stars';
import { formatNzDate } from '@/features/booking/booking-format';
import { PersonAvatar } from '@/features/messages/person-avatar';

const CATEGORY_LABELS: { key: 'communication' | 'pickupReturn' | 'cleanliness' | 'care'; label: string }[] = [
  { key: 'communication', label: 'Communication' },
  { key: 'pickupReturn', label: 'Pick-up and return' },
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'care', label: 'Care of the car' },
];

interface ReviewCardProps {
  review: Review;
  show: 'author' | 'subject';
  /** Beside the name, such as Report. */
  action?: ReactNode;
}

/** One review: who wrote it, the stars for each category and what they said. */
export function ReviewCard({ review, show, action }: ReviewCardProps) {
  const person = show === 'author' ? review.author.firstName : review.subject.firstName;
  return (
    <article className="grid gap-3 rounded-card border border-line bg-surface p-5">
      <header className="flex items-start gap-3">
        <PersonAvatar
          name={person}
          photoUrl={show === 'author' ? review.author.avatarUrl : undefined}
          className="size-10"
        />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">
            {show === 'author' ? person : `About ${person}`}
            <span className="ml-2 text-sm font-normal text-muted">
              {review.vehicleTitle} · {formatNzDate(review.createdAt)}
            </span>
          </p>
          <RatingStars value={review.overall} size="sm" />
        </div>
        {action}
      </header>
      {review.body && <p className="whitespace-pre-wrap text-ink/90">{review.body}</p>}
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        {CATEGORY_LABELS.filter(({ key }) => review[key]).map(({ key, label }) => (
          <div key={key} className="flex gap-1">
            <dt>{label}</dt>
            <dd className="font-medium text-ink">{review[key]}/5</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
