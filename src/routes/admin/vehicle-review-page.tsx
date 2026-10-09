import { SearchX } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SuspendedCarBookings, SuspensionAction } from '@/features/admin/bookings/vehicle-suspension';
import { CalendarOverride } from '@/features/admin/listings/calendar-override';
import { ChecklistPanel } from '@/features/admin/listings/checklist-panel';
import { DocumentReview } from '@/features/admin/listings/document-review';
import { HostPanel } from '@/features/admin/listings/host-panel';
import { KeyChangesSection } from '@/features/admin/listings/key-changes';
import { useAdminVehicle } from '@/features/admin/listings/listing-api';
import { ListingDecisionBar } from '@/features/admin/listings/listing-decision-bar';
import { formatDateNz } from '@/features/admin/listings/listing-format';
import { PhotoReview } from '@/features/admin/listings/photo-review';
import { ReviewContents } from '@/features/admin/listings/review-contents';
import { VehicleStatusBadge } from '@/features/admin/listings/review-badge';
import {
  ComplianceSection,
  DeliverySection,
  PricingSection,
  VehicleDetailsSection,
} from '@/features/admin/listings/vehicle-facts';

/** Back to the list the car was opened from: the review queue, or a search of every car. */
function QueueLink() {
  return (
    <BackLink to="/admin/vehicles" previous className="mt-3">
      Vehicles
    </BackLink>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading the listing</span>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-9 w-96 max-w-full" />
      <Skeleton className="mt-3 h-5 w-64 max-w-full" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
        <Skeleton className="h-64 rounded-card" />
      </div>
    </div>
  );
}

/**
 * One listing to review (plan §9, Days 8–11): everything the Host entered, what they changed among its key
 * details since it was live (plan §3), its checks and flags, the photos and documents to approve one by one,
 * the Host, the calendar override (Days 10–11) and the decision; for a live car, suspending it, and while
 * it's suspended, its upcoming bookings to keep or cancel (plan §8.2). Designed for a desktop, still usable
 * on a phone (plan §12.6).
 */
export function AdminVehicleReviewPage() {
  const { id = '' } = useParams();
  const listing = useAdminVehicle(id);

  if (listing.isPending) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title="Vehicle review · Staff portal" noindex />
        <QueueLink />
        <div className="mt-7">
          <ReviewSkeleton />
        </div>
      </div>
    );
  }

  if (listing.isError) {
    const missing = listing.error instanceof ApiError && listing.error.status === 404;
    return (
      <div className="mx-auto max-w-6xl">
        <PageMeta title="Vehicle review · Staff portal" noindex />
        <QueueLink />
        {missing ? (
          <EmptyState
            className="mx-auto mt-11"
            visual={
              <IconBadge size="xl" tone="muted">
                <SearchX />
              </IconBadge>
            }
            title="We couldn't find that listing"
            description="It may have been deleted. The queue has everything waiting for review."
            actions={
              <Button asChild>
                <Link to="/admin/vehicles">Open the review queue</Link>
              </Button>
            }
          />
        ) : (
          <Alert
            variant="danger"
            role="alert"
            className="mt-9"
            title="We couldn't load the listing"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => listing.refetch()}
                loading={listing.isFetching}
              >
                Try again
              </Button>
            }
          >
            {listing.error.message}
          </Alert>
        )}
      </div>
    );
  }

  const { vehicle, host, keyChanges, upcomingBookings } = listing.data;
  const place = [vehicle.suburb, vehicle.city].filter(Boolean).join(', ');

  return (
    <div className="mx-auto max-w-6xl">
      <PageMeta title={`${vehicle.title} · Vehicle review · Staff portal`} noindex />
      <QueueLink />

      <header className="mt-5 flex animate-fade-up flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-primary">Listing review</p>
          <h1 className="headline mt-2 text-title-3 font-medium">{vehicle.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
            <VehicleStatusBadge status={vehicle.status} waitingForPayouts={vehicle.waitingForPayouts} />
            {vehicle.regoPlate && (
              <span className="font-semibold tracking-wide text-ink">{vehicle.regoPlate}</span>
            )}
            {place && <span>{place}</span>}
            <span>Updated {formatDateNz(vehicle.updatedAt)}</span>
          </div>
        </div>
        <SuspensionAction vehicle={vehicle} />
      </header>

      {vehicle.reviewNotes && (
        <Alert title="Last note to the Host" className="mt-6">
          <p className="whitespace-pre-line">{vehicle.reviewNotes}</p>
        </Alert>
      )}

      {vehicle.status === 'SUSPENDED' && upcomingBookings && (
        <SuspendedCarBookings bookings={upcomingBookings} className="mt-6" />
      )}

      {keyChanges.length > 0 && <KeyChangesSection changes={keyChanges} className="mt-6" />}

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid min-w-0 gap-6">
          <ChecklistPanel checklist={vehicle.checklist} />
          <PhotoReview vehicleId={vehicle.id} photos={vehicle.photos} />
          <DocumentReview vehicleId={vehicle.id} documents={vehicle.documents} />
          <VehicleDetailsSection vehicle={vehicle} />
          <ComplianceSection vehicle={vehicle} />
          <PricingSection vehicle={vehicle} />
          <DeliverySection vehicle={vehicle} />
          <CalendarOverride vehicleId={vehicle.id} />
        </div>
        <div className="grid gap-6 lg:sticky lg:top-24">
          <HostPanel host={host} />
          <ReviewContents vehicle={vehicle} keyChanges={keyChanges.length} />
        </div>
      </div>

      <ListingDecisionBar listing={listing.data} />
    </div>
  );
}
