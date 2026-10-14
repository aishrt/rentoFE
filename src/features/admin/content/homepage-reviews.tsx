import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, CircleAlert, Plus, Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router';
import type { AdminFeaturedReviews, AdminReviewChoice } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { RatingStars } from '@/components/ui/rating-stars';
import { toast } from '@/components/ui/toast';
import { ListSkeleton, LoadError } from '@/features/admin/ops/query-feedback';
import { useDebouncedValue } from '@/features/search/use-debounced-value';
import {
  MAX_FEATURED_REVIEWS,
  contentErrorMessage,
  featuredReviewsQueryKey,
  saveFeaturedReviewsRequest,
  useFeaturedReviews,
  useReviewChoices,
} from './content-api';

/** How long typing pauses before the search runs, in ms. */
const SEARCH_DELAY = 300;

const sameOrder = (a: readonly AdminReviewChoice[], b: readonly AdminReviewChoice[]) =>
  a.length === b.length && a.every((review, index) => review.id === b[index]?.id);

/** "Kiri on the 2021 Toyota Corolla" and its town: how the homepage credits a review. */
const credit = (review: AdminReviewChoice) =>
  `${review.authorName} · ${[review.vehicleTitle, review.city].filter(Boolean).join(', ')}`;

/**
 * The homepage's customer reviews (plan §12.6): up to six published Guest reviews, in order. With none
 * picked, the homepage shows the newest well-rated ones. Either way the section stays hidden until enough
 * reviews are published (the threshold in settings), and a picked review hidden since is left off.
 */
export function HomepageReviewsPanel() {
  const featured = useFeaturedReviews();

  if (featured.isPending) return <ListSkeleton label="Loading the homepage’s reviews" rows={4} />;
  if (featured.isError) {
    return (
      <LoadError
        title="We couldn’t load the homepage’s reviews"
        error={featured.error}
        onRetry={() => featured.refetch()}
        retrying={featured.isFetching}
      />
    );
  }
  return <ReviewsEditor saved={featured.data} />;
}

function ReviewsEditor({ saved }: { saved: AdminFeaturedReviews }) {
  const headingId = useId();
  const queryClient = useQueryClient();
  // Changes not saved yet; null while the list is as saved.
  const [draft, setDraft] = useState<AdminReviewChoice[] | null>(null);
  // What the last move or removal did, for screen readers.
  const [announcement, setAnnouncement] = useState('');
  const chosen = draft ?? saved.reviews;
  const changed = draft !== null && !sameOrder(draft, saved.reviews);
  const full = chosen.length >= MAX_FEATURED_REVIEWS;
  const belowThreshold = saved.publishedCount < saved.homepageThreshold;

  const save = useMutation({
    mutationFn: saveFeaturedReviewsRequest,
    onSuccess: (response) => {
      queryClient.setQueryData(featuredReviewsQueryKey, response);
      setDraft(null);
      toast('Homepage reviews saved', {
        description:
          response.reviews.length > 0
            ? 'The homepage shows them within a minute.'
            : 'The homepage shows the newest well-rated reviews within a minute.',
      });
    },
  });

  const update = (next: AdminReviewChoice[], message: string) => {
    save.reset();
    setDraft(next);
    setAnnouncement(message);
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...chosen];
    const [review] = next.splice(index, 1);
    if (!review) return;
    next.splice(index + by, 0, review);
    update(next, `${review.authorName}’s review moved to number ${index + by + 1}`);
  };

  const remove = (review: AdminReviewChoice) =>
    update(
      chosen.filter((item) => item.id !== review.id),
      `${review.authorName}’s review removed`,
    );

  const add = (review: AdminReviewChoice) => {
    if (full || chosen.some((item) => item.id === review.id)) return;
    update([...chosen, review], `${review.authorName}’s review added as number ${chosen.length + 1}`);
  };

  return (
    <div className="grid gap-6">
      {belowThreshold && (
        <Alert
          title="The homepage isn’t showing reviews yet"
          action={
            <Button variant="secondary" size="sm" asChild>
              <Link to="/admin/settings?tab=platform&section=reviewsAndTrips">Change the number</Link>
            </Button>
          }
        >
          It shows them once {saved.homepageThreshold} reviews are published, and {saved.publishedCount}{' '}
          {saved.publishedCount === 1 ? 'is' : 'are'} so far.
        </Alert>
      )}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <Card asChild className="p-6 sm:p-8">
          <section aria-labelledby={headingId}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id={headingId} className="text-lg font-semibold text-ink">
                On the homepage
              </h2>
              <p className="text-sm text-muted tabular-nums">
                {chosen.length} of {MAX_FEATURED_REVIEWS} chosen
              </p>
            </div>
            <p className="mt-1 text-sm text-muted">
              Up to {MAX_FEATURED_REVIEWS} published reviews, shown in this order. With none chosen, the
              homepage shows the newest reviews of 4 or 5 stars.
            </p>

            <p aria-live="polite" className="sr-only">
              {announcement}
            </p>

            {chosen.length === 0 ? (
              <p className="mt-6 rounded-inner border border-dashed border-line p-5 text-sm text-muted">
                No reviews chosen, so the homepage shows the newest reviews of 4 or 5 stars.
              </p>
            ) : (
              <ol aria-label="Homepage reviews" className="mt-6 divide-y divide-line">
                {chosen.map((review, index) => (
                  <li
                    key={review.id}
                    aria-label={`${review.authorName}: ${review.body}`}
                    className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 first:pt-0 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink/5 text-sm font-semibold text-ink tabular-nums"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <RatingStars value={review.overall} size="sm" />
                      <p className="mt-1 line-clamp-3 text-sm text-ink">“{review.body}”</p>
                      <p className="mt-1 text-sm text-muted">{credit(review)}</p>
                      {!review.shown && (
                        <p className="mt-1 flex items-start gap-1.5 text-sm text-ink">
                          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                          Hidden since it was picked, so it’s left off the homepage
                        </p>
                      )}
                    </div>
                    <div className="ml-11 flex items-center sm:ml-0">
                      <IconButton
                        label={`Move ${review.authorName}’s review up`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Move ${review.authorName}’s review down`}
                        disabled={index === chosen.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Remove ${review.authorName}’s review`}
                        onClick={() => remove(review)}
                      >
                        <X aria-hidden="true" />
                      </IconButton>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            {save.isError && (
              <Alert variant="danger" role="alert" title="The reviews weren’t saved" className="mt-6">
                {contentErrorMessage(save.error)}
              </Alert>
            )}

            <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
              <Button
                loading={save.isPending}
                disabled={!changed}
                onClick={() => save.mutate(chosen.map((review) => review.id))}
              >
                Save homepage reviews
              </Button>
              {draft !== null && (
                <Button
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => {
                    save.reset();
                    setDraft(null);
                    setAnnouncement('Changes undone');
                  }}
                >
                  Undo changes
                </Button>
              )}
            </div>
          </section>
        </Card>

        <AddReview chosen={chosen} full={full} onAdd={add} />
      </div>
    </div>
  );
}

function AddReview({
  chosen,
  full,
  onAdd,
}: {
  chosen: readonly AdminReviewChoice[];
  full: boolean;
  onAdd: (review: AdminReviewChoice) => void;
}) {
  const headingId = useId();
  const [search, setSearch] = useState('');
  const query = useDebouncedValue(search, SEARCH_DELAY).trim();
  const choices = useReviewChoices(query);

  return (
    <Card asChild className="p-6 sm:p-8">
      <section aria-labelledby={headingId}>
        <h2 id={headingId} className="text-lg font-semibold text-ink">
          Add a review
        </h2>
        <p className="mt-1 text-sm text-muted">
          Only published reviews by Guests, with words to quote. Hidden reviews never show.
        </p>

        <Field label="Find a review" className="mt-6">
          <Input
            type="search"
            autoComplete="off"
            placeholder="Words in the review"
            leadingIcon={<Search />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>

        {full && (
          <Alert className="mt-4">
            {MAX_FEATURED_REVIEWS} reviews are chosen, the most the homepage shows. Remove one to add another.
          </Alert>
        )}

        <div className="mt-4">
          {choices.isPending && <ListSkeleton label="Loading published reviews" rows={4} height="h-16" />}
          {choices.isError && (
            <LoadError
              title="We couldn’t load the published reviews"
              error={choices.error}
              onRetry={() => choices.refetch()}
              retrying={choices.isFetching}
            />
          )}
          {choices.data && (
            <>
              <p className="text-sm text-muted">
                {choices.data.length === 0
                  ? query
                    ? `No published reviews mention “${query}”.`
                    : 'No reviews are published yet.'
                  : query
                    ? `Published reviews mentioning “${query}”`
                    : 'Published reviews, newest first'}
              </p>
              {choices.data.length > 0 && (
                <ul
                  aria-label="Published reviews to add"
                  aria-busy={choices.isFetching || undefined}
                  className="scrollbar-subtle mt-2 max-h-[28rem] divide-y divide-line overflow-y-auto"
                >
                  {choices.data.map((review) => {
                    const added = chosen.some((item) => item.id === review.id);
                    return (
                      <li
                        key={review.id}
                        aria-label={`${review.authorName}: ${review.body}`}
                        className="flex items-start gap-3 py-3 pr-1"
                      >
                        <div className="min-w-0 flex-1">
                          <RatingStars value={review.overall} size="sm" />
                          <p className="mt-1 line-clamp-2 text-sm text-ink">“{review.body}”</p>
                          <p className="mt-0.5 truncate text-sm text-muted">{credit(review)}</p>
                        </div>
                        {added ? (
                          <Badge variant="neutral">Added</Badge>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            aria-label={`Add ${review.authorName}’s review`}
                            disabled={full}
                            onClick={() => onAdd(review)}
                          >
                            <Plus aria-hidden="true" />
                            Add
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </Card>
  );
}
