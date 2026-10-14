import { useQuery } from '@tanstack/react-query';
import { CarFront, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { VehicleDetail } from '@/api/types';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilitySection } from '@/features/vehicles/availability-calendar';
import { BookingPanel } from '@/features/vehicles/booking-panel';
import { ReportLink } from '@/features/reviews/report-link';
import { HostCard } from '@/features/vehicles/host-card';
import { ListingGallery } from '@/features/vehicles/listing-gallery';
import { ListingHeader } from '@/features/vehicles/listing-header';
import { ListingReviews } from '@/features/vehicles/listing-reviews';
import { LocationMap } from '@/features/vehicles/location-map';
import { MaxMotion } from '@/features/vehicles/max-motion';
import { StickyBookingBar } from '@/features/vehicles/sticky-booking-bar';
import { useBooking } from '@/features/vehicles/use-booking';
import { vehicleQueryOptions } from '@/features/vehicles/vehicle-api';
import type { ListingLinkState } from '@/features/vehicles/vehicle-card';
import { ComplianceSection, SpecsSection } from '@/features/vehicles/vehicle-facts';
import { formatNzdFromCents } from '@/lib/format';
import { smallPhoto } from '@/lib/photos';
import {
  DeliveryOptionsSection,
  PoliciesSection,
  ProtectionSection,
} from '@/features/vehicles/vehicle-policies';
import { placeLine, vehiclePhotoTransitionName } from '@/features/vehicles/vehicle-format';

const columns =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12 xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-16';

/** "Back to results" when the car was opened from a search. */
function ResultsLink({ to }: { to?: string }) {
  if (!to || !/^\/(search|cars)(\?|$)/.test(to)) return null;
  return (
    <BackLink to={to} className="my-3">
      Back to results
    </BackLink>
  );
}

/**
 * While the listing loads. When a card was tapped, its photo is already here, under the car's transition
 * name, so it can morph into place straight away (plan §12.4).
 */
function ListingSkeleton({ card }: { card?: ListingLinkState['card'] }) {
  return (
    <Container className="pt-4 pb-16 sm:pt-6 lg:pt-8" aria-busy="true">
      <p className="sr-only" role="status">
        Loading the car
      </p>
      <div className={columns}>
        <div className="min-w-0">
          <div className="-mx-4 sm:mx-0">
            <div className="relative aspect-4/3 overflow-hidden bg-ink/6 sm:aspect-3/2 sm:rounded-sheet">
              {card?.photo ? (
                <img
                  src={smallPhoto(card.photo.url)}
                  alt={card.photo.alt}
                  className="size-full object-cover"
                  style={{ viewTransitionName: vehiclePhotoTransitionName(card.id) }}
                />
              ) : (
                <div className="skeleton size-full" />
              )}
            </div>
          </div>
          <div className="pt-8">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-10 w-3/4 max-w-md" />
            <Skeleton className="mt-3 h-5 w-1/2 max-w-xs" />
          </div>
        </div>
        <Skeleton className="hidden h-[28rem] rounded-sheet lg:block" />
      </div>
    </Container>
  );
}

function VehicleNotFound() {
  return (
    <Container className="flex justify-center py-16 sm:py-24">
      <PageMeta title="Car not found" noindex />
      <EmptyState
        visual={
          <IconBadge size="xl">
            <CarFront />
          </IconBadge>
        }
        title="This car isn't available"
        description="It may have been taken off Rento Vroom, or the link may be wrong. There are plenty more to choose from."
        actions={
          <Button asChild size="lg">
            <Link to="/cars" viewTransition>
              Browse cars
            </Link>
          </Button>
        }
      />
    </Container>
  );
}

function Listing({ vehicle, backTo }: { vehicle: VehicleDetail; backTo?: string }) {
  const booking = useBooking(vehicle);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const [pastGallery, setPastGallery] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const place = placeLine(vehicle.location);
  const name = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  // The sticky booking bar slides in once the gallery has scrolled away (plan §12.4).
  useEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setPastGallery(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(gallery);
    return () => observer.disconnect();
  }, []);

  return (
    <MaxMotion>
      <PageMeta
        title={`${name} for rent${vehicle.location.city ? ` in ${vehicle.location.city}` : ''}`}
        description={`Rent this ${name}${vehicle.variant ? ` ${vehicle.variant}` : ''}${place ? ` in ${place}` : ''} from a local host, from ${formatNzdFromCents(vehicle.pricing.dailyCents)} a day. Photos, specs, policies and reviews.`}
      />
      {/* Room at the bottom on phones for the sticky booking bar. */}
      <Container className="pt-2 pb-28 sm:pt-4 lg:pt-6 lg:pb-24">
        <ResultsLink to={backTo} />
        <div className={columns}>
          <div className="min-w-0">
            <div className="-mx-4 sm:mx-0">
              <ListingGallery vehicle={vehicle} frameRef={galleryRef} />
            </div>
            <ListingHeader vehicle={vehicle} />
            <HostCard host={vehicle.host} />
            <SpecsSection vehicle={vehicle} />
            <ComplianceSection compliance={vehicle.compliance} />
            <PoliciesSection vehicle={vehicle} />
            <DeliveryOptionsSection options={vehicle.deliveryOptions} />
            <ProtectionSection plans={vehicle.protectionPlans} />
            <AvailabilitySection vehicleId={vehicle.id} />
            <ListingReviews vehicle={vehicle} />
            <LocationMap vehicle={vehicle} />
            {/* A listing that looks wrong goes to the support team (plan §3, reports; spec §22). */}
            <div className="mt-10 flex justify-end border-t border-line pt-4">
              <ReportLink
                targetType="VEHICLE"
                targetId={vehicle.id}
                subject="this listing"
                label="Report this listing"
                ownerId={vehicle.host.id}
                className="text-muted"
              />
            </div>
          </div>

          <aside aria-label="Book this car" className="hidden lg:block">
            <div className="scrollbar-subtle sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-sheet">
              <Card variant="raised" className="p-6">
                <BookingPanel vehicle={vehicle} booking={booking} />
              </Card>
            </div>
          </aside>
        </div>
      </Container>

      <StickyBookingBar
        vehicle={vehicle}
        booking={booking}
        visible={pastGallery && !sheetOpen}
        onOpen={() => setSheetOpen(true)}
      />
      <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Your trip">
        <BookingPanel vehicle={vehicle} booking={booking} className="pt-1" />
      </BottomSheet>
    </MaxMotion>
  );
}

/**
 * The vehicle listing (spec §6, plan §12.6): gallery, the car, its host, specs and features, rego and WOF,
 * policies, pick-up and delivery, protection, availability, reviews and the approximate location, beside a
 * sticky booking panel on desktop or above a sticky booking bar on phones.
 */
export function VehiclePage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const linkState = (location.state as ListingLinkState | null) ?? undefined;
  const vehicle = useQuery(vehicleQueryOptions(slug));

  if (vehicle.isPending) return <ListingSkeleton card={linkState?.card} />;
  if (vehicle.isError) {
    if (vehicle.error instanceof ApiError && vehicle.error.status === 404) return <VehicleNotFound />;
    return (
      <Container className="py-16">
        <PageMeta title="Car" noindex />
        <Alert
          variant="danger"
          role="alert"
          title="We couldn't load this car"
          action={
            <Button variant="secondary" size="sm" onClick={() => void vehicle.refetch()}>
              <RotateCw aria-hidden="true" />
              Try again
            </Button>
          }
        >
          {vehicle.error.message}
        </Alert>
      </Container>
    );
  }
  return <Listing key={vehicle.data.id} vehicle={vehicle.data} backTo={linkState?.from} />;
}
