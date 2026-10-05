import { ArrowRight, CircleCheck, Flag, RefreshCw, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import type { ReviewQueueItem } from '@/api/types';
import { PageMeta } from '@/components/layout/page-meta';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReviewQueue } from '@/features/admin/listings/listing-api';
import { formatDateNz, waitingFor } from '@/features/admin/listings/listing-format';
import { hostStatusLabel } from '@/features/admin/listings/listing-labels';
import { ReviewBadge } from '@/features/admin/listings/review-badge';
import { formatNumber } from '@/lib/format';

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

/** "3 photos, 1 document", or "Nothing new" for a listing under review that only changed its details. */
function pendingLine(item: ReviewQueueItem): string {
  const parts = [
    item.pendingPhotos > 0 && plural(item.pendingPhotos, 'photo', 'photos'),
    item.pendingDocuments > 0 && plural(item.pendingDocuments, 'document', 'documents'),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Nothing new';
}

/** New listings wait for a full review; live ones only for their new files (plan §3, changes to live listings). */
function QueueStatus({ item }: { item: ReviewQueueItem }) {
  if (item.status === 'UNDER_REVIEW') return <ReviewBadge tone="waiting">Under review</ReviewBadge>;
  const what = [item.pendingPhotos > 0 && 'photos', item.pendingDocuments > 0 && 'documents']
    .filter(Boolean)
    .join(' and ');
  return <ReviewBadge tone="quiet">Live, new {what || 'files'}</ReviewBadge>;
}

function HostCell({ host }: { host: ReviewQueueItem['host'] }) {
  const approved = host.status === 'APPROVED';
  return (
    <>
      <p className="font-medium text-ink">{host.name}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-muted">
        {approved ? (
          <CircleCheck aria-hidden="true" className="size-3.5 shrink-0 text-success" />
        ) : (
          <TriangleAlert aria-hidden="true" className="size-3.5 shrink-0 text-warning" />
        )}
        {hostStatusLabel(host.status)}
      </p>
      {!approved && (
        <p className="mt-1 max-w-56 text-xs text-muted">
          Approve their{' '}
          <Link to="/admin/host-applications" className="rounded-inner text-primary hover:underline">
            Host application
          </Link>{' '}
          before this listing.
        </p>
      )}
    </>
  );
}

function QueueSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-3 p-5">
      <span className="sr-only">Loading the queue</span>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-14 rounded-control" />
      ))}
    </div>
  );
}

/**
 * The listing review queue (plan §9, Days 8–11): new listings, and live listings with new photos or
 * documents, oldest first. A table that scrolls sideways on a phone (plan §12.6).
 */
export function AdminVehicleQueuePage() {
  const queue = useReviewQueue();

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title="Vehicles · Staff portal" noindex />

      <header className="animate-fade-up">
        <p className="eyebrow text-primary">Marketplace</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Listings to review</h1>
        <p className="mt-2 max-w-2xl text-muted">
          New listings, and live ones with new photos or documents. Live listings stay bookable with what
          you&rsquo;ve already approved. Oldest first.
        </p>
      </header>

      <section aria-labelledby="queue-heading" className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="queue-heading" className="text-base font-semibold">
            Review queue
          </h2>
          {queue.data && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <span aria-live="polite">{plural(queue.data.length, 'listing', 'listings')} waiting</span>
              <IconButton
                label="Refresh the queue"
                onClick={() => queue.refetch()}
                disabled={queue.isFetching}
              >
                <RefreshCw aria-hidden="true" className={queue.isFetching ? 'animate-spin' : undefined} />
              </IconButton>
            </div>
          )}
        </div>

        {queue.isError && (
          <Alert
            variant="danger"
            role="alert"
            title="We couldn't load the queue"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => queue.refetch()}
                loading={queue.isFetching}
              >
                Try again
              </Button>
            }
          >
            {queue.error.message}
          </Alert>
        )}

        {queue.data?.length === 0 && (
          <EmptyState
            titleAs="h2"
            className="mx-auto py-12"
            visual={
              <IconBadge size="xl" tone="muted">
                <CircleCheck />
              </IconBadge>
            }
            title="Nothing to review"
            description="Listings appear here when a Host submits one, or adds photos or documents to a live listing."
          />
        )}

        {(queue.isPending || (queue.data && queue.data.length > 0)) && (
          <Card className="overflow-hidden">
            {queue.isPending ? (
              <QueueSkeleton />
            ) : (
              <div className="scrollbar-subtle overflow-x-auto">
                <table className="w-full min-w-[56rem] text-left text-sm">
                  <caption className="sr-only">Listings waiting for review, oldest first</caption>
                  <thead className="border-b border-line bg-ink/3">
                    <tr className="text-muted">
                      <th scope="col" className="px-5 py-3 font-medium">
                        Listing
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Host
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        City
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Waiting for review
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Flags
                      </th>
                      <th scope="col" className="px-5 py-3 font-medium">
                        Waiting since
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {queue.data?.map((item, index) => (
                      <tr
                        key={item.id}
                        className="stagger-in align-top transition-colors duration-120 hover:bg-ink/3"
                        style={staggerIndex(index)}
                      >
                        <th scope="row" className="px-5 py-4 font-normal">
                          <Link
                            to={`/admin/vehicles/${item.id}`}
                            className="group inline-flex items-center gap-1.5 rounded-inner font-medium text-ink hover:text-primary"
                          >
                            {item.title}
                            <ArrowRight aria-hidden="true" className="nudge-right size-4 text-primary" />
                          </Link>
                          <div className="mt-1.5">
                            <QueueStatus item={item} />
                          </div>
                        </th>
                        <td className="px-5 py-4">
                          <HostCell host={item.host} />
                        </td>
                        <td className="px-5 py-4 text-ink">
                          {item.city ?? <span className="text-muted">—</span>}
                        </td>
                        <td className="px-5 py-4 text-ink">{pendingLine(item)}</td>
                        <td className="px-5 py-4">
                          {item.flags > 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-ink">
                              <Flag aria-hidden="true" className="size-3.5 text-warning" />
                              {plural(item.flags, 'flag', 'flags')}
                            </span>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-ink">{formatDateNz(item.updatedAt)}</p>
                          <p className="mt-0.5 text-muted">{waitingFor(item.updatedAt)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </section>
    </div>
  );
}
