import { PenLine, Star } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { DotGrid } from '@/components/brand/patterns/dot-grid';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { AccountPageHeader, AccountShell } from '@/features/account/account-shell';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzDate } from '@/features/booking/booking-format';
import { PersonAvatar } from '@/features/messages/person-avatar';
import { ReportReviewButton } from '@/features/reviews/report-review-button';
import { ReviewCard } from '@/features/reviews/review-card';
import { useMyReviews } from '@/features/reviews/reviews-api';

const TABS = [
  { value: 'received', label: 'About you' },
  { value: 'written', label: 'By you' },
] as const;
type Tab = (typeof TABS)[number]['value'];

function Reviews() {
  const reviews = useMyReviews();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'written' ? 'written' : 'received';

  if (reviews.isError) {
    return (
      <Alert variant="danger" role="alert" title="We couldn’t load your reviews">
        {reviews.error.message}
      </Alert>
    );
  }
  if (!reviews.data) return <ReviewsSkeleton />;
  const { toWrite, written, received } = reviews.data;
  const list = tab === 'written' ? written : received;

  return (
    <div className="grid gap-8">
      {toWrite.length > 0 && (
        <Card asChild className="p-5 sm:p-6">
          <section aria-labelledby="to-write">
            <h2 id="to-write" className="font-semibold text-ink">
              Waiting for your review
            </h2>
            <ul className="mt-3 divide-y divide-line/70">
              {toWrite.map((item) => (
                <li
                  key={item.bookingRef}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <PersonAvatar name={item.otherParty.firstName} photoUrl={item.otherParty.avatarUrl} />
                    <div>
                      <p className="font-medium text-ink">
                        {item.role === 'GUEST'
                          ? `${item.otherParty.firstName}’s ${item.vehicleTitle}`
                          : item.otherParty.firstName}
                      </p>
                      <p className="text-sm text-muted">
                        {item.role === 'GUEST' ? 'Your trip' : 'Your guest'} · Review by{' '}
                        {formatNzDate(item.closesAt)}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <Link
                      to={
                        item.role === 'GUEST'
                          ? `/trips/${item.bookingRef}/review`
                          : `/host/bookings/${item.bookingRef}/review`
                      }
                    >
                      <PenLine aria-hidden="true" />
                      Write a review
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </Card>
      )}

      <SegmentedTabs
        idPrefix="reviews"
        label="Reviews"
        options={TABS}
        value={tab}
        onChange={(value) => setParams(value === 'received' ? {} : { tab: value }, { replace: true })}
        className="max-w-sm"
      />
      <div role="tabpanel" id={tabPanelId('reviews', tab)} aria-labelledby={tabId('reviews', tab)}>
        {list.length === 0 ? (
          <EmptyState
            className="mx-auto py-8"
            titleAs="h2"
            visual={
              <IconBadge size="xl">
                <Star />
              </IconBadge>
            }
            title={tab === 'written' ? 'No reviews written yet' : 'No reviews about you yet'}
            description={
              tab === 'written'
                ? 'After each trip you can review the other side.'
                : 'Reviews show here once they’re published, after both sides have written one.'
            }
          />
        ) : (
          <ul className="grid gap-4">
            {list.map((review) => (
              <li key={review.id} className="grid gap-2">
                {tab === 'written' && review.status !== 'PUBLISHED' && (
                  <Badge variant="outline" className="justify-self-start">
                    {review.moderation === 'HELD'
                      ? 'Being checked by our team'
                      : review.status === 'HIDDEN'
                        ? 'Hidden by our team'
                        : `Published when ${review.subject.firstName} reviews you${review.revealAt ? `, or on ${formatNzDate(review.revealAt)}` : ''}`}
                  </Badge>
                )}
                <ReviewCard
                  review={review}
                  show={tab === 'written' ? 'subject' : 'author'}
                  action={
                    tab === 'received' && (
                      <ReportReviewButton
                        reviewId={review.id}
                        author={review.author}
                        className="-mt-2 -mr-2"
                      />
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReviewsSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-32 rounded-card" />
      <Skeleton className="h-13 max-w-sm rounded-full" />
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

/**
 * Reviews (spec §8, §9, §16): trips waiting for the user's review, then reviews about them, which they can
 * report, and by them.
 */
export function ReviewsPage() {
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={DotGrid} />
      <PageMeta title="Reviews" noindex />
      <AccountShell>
        <div className="grid max-w-3xl gap-8">
          <AccountPageHeader
            title="Reviews"
            description="Reviews are published once both sides have written one, or when the time to review runs out."
          />
          <RequireSignedIn fallback={<ReviewsSkeleton />}>{() => <Reviews />}</RequireSignedIn>
        </div>
      </AccountShell>
    </Container>
  );
}
