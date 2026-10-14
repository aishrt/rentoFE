import { m } from 'motion/react';
import type { VehicleDetail } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RatingStars } from '@/components/ui/rating-stars';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportReviewButton } from '@/features/reviews/report-review-button';
import { formatNumber } from '@/lib/format';
import { motion } from '@/styles/tokens';
import { ListingSection } from './listing-section';
import { useVehicleReviews } from './vehicle-api';
import { formatRating } from './vehicle-format';

const monthYear = new Intl.DateTimeFormat('en-NZ', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Pacific/Auckland',
});

const CATEGORY_LABELS = {
  cleanliness: 'Cleanliness',
  communication: 'Communication',
  pickupReturn: 'Pick-up and return',
} as const;

/** One category's average as a bar that fills when it scrolls into view (transform only). */
function CategoryBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2rem] items-center gap-3 text-sm">
      <dt className="text-ink/85">{label}</dt>
      <dd className="contents">
        <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-ink/8">
          <m.span
            className="block h-full origin-left rounded-full bg-primary"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: value / 5 }}
            viewport={{ once: true }}
            transition={{ duration: motion.duration.count, ease: motion.ease.out }}
          />
        </span>
        <span className="text-right font-medium text-ink tabular-nums">
          {formatRating(value)}
          <span className="sr-only"> out of 5</span>
        </span>
      </dd>
    </div>
  );
}

/**
 * Published guest reviews of the car (plan §9, Days 21–22), with the category averages, ten at a time.
 * Anyone can report one, except their own.
 */
export function ListingReviews({ vehicle }: { vehicle: VehicleDetail }) {
  const reviews = useVehicleReviews(vehicle.id);
  const firstPage = reviews.data?.pages[0];
  const items = reviews.data?.pages.flatMap((page) => page.reviews) ?? [];
  const rating = firstPage?.rating ?? vehicle.rating;
  const categories = firstPage
    ? (Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).flatMap((key) => {
        const value = firstPage.categories[key];
        return value === null ? [] : [{ key, label: CATEGORY_LABELS[key], value }];
      })
    : [];

  return (
    <ListingSection id="reviews" title="Reviews">
      {rating.count === 0 ? (
        <p className="text-muted">
          No reviews yet. This car is new to Rento Vroom, so its first guests will be the ones to review it.
        </p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-12">
            <div>
              <p className="headline text-5xl leading-none font-medium text-ink">
                {formatRating(rating.avg)}
              </p>
              <RatingStars value={rating.avg} size="lg" className="mt-3" />
              <p className="mt-1.5 text-sm text-muted">
                {formatNumber(rating.count)} {rating.count === 1 ? 'review' : 'reviews'}
              </p>
            </div>
            {categories.length > 0 && (
              <dl className="grid max-w-md gap-3">
                {categories.map((category) => (
                  <CategoryBar key={category.key} label={category.label} value={category.value} />
                ))}
              </dl>
            )}
          </div>

          {reviews.isPending ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {[0, 1].map((item) => (
                <div key={item}>
                  <Skeleton className="h-9 w-40" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : reviews.isError ? (
            <Alert variant="danger" className="mt-8" title="We couldn't load the reviews">
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void reviews.refetch()}>
                Try again
              </Button>
            </Alert>
          ) : (
            <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {items.map((review) => (
                <li key={review.id} className="animate-fade-up">
                  <article>
                    <header className="flex items-center gap-3">
                      {review.author.avatarUrl ? (
                        <img
                          src={review.author.avatarUrl}
                          alt=""
                          width={36}
                          height={36}
                          loading="lazy"
                          className="size-9 rounded-full object-cover"
                        />
                      ) : (
                        <Avatar initials={review.author.firstName.slice(0, 1).toUpperCase()} tone="accent" />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-ink">{review.author.firstName}</h3>
                        <p className="text-xs text-muted">{monthYear.format(new Date(review.createdAt))}</p>
                      </div>
                      <ReportReviewButton reviewId={review.id} author={review.author} className="-my-1" />
                    </header>
                    <RatingStars value={review.overall} size="sm" className="mt-3" />
                    {review.body && <p className="mt-2 leading-relaxed text-ink/85">{review.body}</p>}
                  </article>
                </li>
              ))}
            </ul>
          )}

          {reviews.hasNextPage && (
            <Button
              variant="secondary"
              className="mt-8"
              loading={reviews.isFetchingNextPage}
              onClick={() => void reviews.fetchNextPage()}
            >
              Show more reviews
            </Button>
          )}
        </>
      )}
    </ListingSection>
  );
}
