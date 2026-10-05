import { useQueryClient } from '@tanstack/react-query';
import { CarFront, Plane, Star, Truck, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import type { VehicleCard as VehicleCardData } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { PriceWithEstimate } from '@/features/currency/price-with-estimate';
import { cn } from '@/lib/cn';
import { smallPhoto } from '@/lib/photos';
import { SaveButton } from './save-button';
import { vehicleQueryOptions } from './vehicle-api';
import {
  formatDistance,
  formatRating,
  formatTrips,
  placeLine,
  specLine,
  vehicleName,
  vehiclePhotoTransitionName,
} from './vehicle-format';

/** What a card hands the listing page, so it can show the photo straight away and link back. */
export interface ListingLinkState {
  card: { id: string; photo: VehicleCardData['photo']; title: string };
  /** The page the card was on, for "Back to results". */
  from: string;
}

/** Warms the listing page's code, so opening a card doesn't wait for the download. */
const loadListingPage = () => import('@/routes/public/vehicle/vehicle-page');

interface VehicleCardProps {
  vehicle: VehicleCardData;
  /** Carried to the listing, e.g. "?start=…&end=…", so it opens with the search's dates. */
  listingSearch?: string;
  /** For the first cards on a page: the photo loads straight away. */
  priority?: boolean;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

const photoBadge = 'bg-surface/95 text-ink shadow-card';

/**
 * A car in search results, Browse Cars, featured cars and destination pages (plan §12.6, spec §5). Every
 * card shows the same facts in the same place, so cars can be compared at a glance: photo, heart, badges,
 * name and year, rating (or New), place and distance, key specs and features, and the daily price with the
 * estimated total for the searched dates.
 *
 * On hover the photo zooms 4% and the card lifts (plan §12.4). Opening it morphs the photo into the listing's
 * gallery (a view transition named per car). The listing's data is prefetched on hover or focus, or on touch
 * screens once the card is in view, so it opens instantly (plan §12.5).
 */
export function VehicleCard({
  vehicle,
  listingSearch = '',
  priority = false,
  headingLevel: Heading = 'h3',
  className,
}: VehicleCardProps) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const cardRef = useRef<HTMLElement>(null);
  const name = vehicleName(vehicle);
  const { rating, estimate } = vehicle;

  const prefetch = useCallback(() => {
    void queryClient.prefetchQuery(vehicleQueryOptions(vehicle.slug));
    void loadListingPage().catch(() => {});
  }, [queryClient, vehicle.slug]);

  // Touch screens have no hover, so prefetch once the card is mostly on screen.
  useEffect(() => {
    const node = cardRef.current;
    if (!node || !window.matchMedia('(hover: none)').matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        prefetch();
        observer.disconnect();
      },
      { threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [prefetch]);

  const linkState: ListingLinkState = {
    card: { id: vehicle.id, photo: vehicle.photo, title: vehicle.title },
    from: location.pathname + location.search,
  };
  const where = placeLine(vehicle);

  return (
    <article
      ref={cardRef}
      onPointerEnter={prefetch}
      onFocus={prefetch}
      className={cn(
        'group/card lift-card relative flex flex-col rounded-card border border-line/80 bg-surface shadow-card has-[a:active]:scale-98',
        'has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-primary',
        className,
      )}
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-t-card bg-ink/6">
        {vehicle.photo ? (
          <img
            src={smallPhoto(vehicle.photo.url)}
            alt={vehicle.photo.alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            width={800}
            height={600}
            className="size-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-104"
            style={{ viewTransitionName: vehiclePhotoTransitionName(vehicle.id) }}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <CarFront aria-hidden="true" className="size-10" />
          </div>
        )}
        {(vehicle.instantBook || vehicle.delivery || vehicle.airportDelivery) && (
          <ul aria-label="Booking options" className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pr-3">
            {vehicle.instantBook && (
              <li>
                <Badge className={photoBadge}>
                  <Zap aria-hidden="true" className="text-primary" />
                  Instant Book
                </Badge>
              </li>
            )}
            {vehicle.delivery && (
              <li>
                <Badge className={photoBadge}>
                  <Truck aria-hidden="true" className="text-primary" />
                  Delivery
                </Badge>
              </li>
            )}
            {vehicle.airportDelivery && (
              <li>
                <Badge className={photoBadge}>
                  <Plane aria-hidden="true" className="text-primary" />
                  Airport
                </Badge>
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Above the card's link, so it can be pressed on its own. */}
      <SaveButton vehicleId={vehicle.id} name={name} className="absolute top-2.5 right-2.5 z-20" />

      <div className="flex flex-1 flex-col p-4">
        <Heading className="text-base font-semibold text-ink">
          <Link
            to={`/cars/${vehicle.slug}${listingSearch}`}
            state={linkState}
            viewTransition
            className="outline-none after:absolute after:inset-0 after:z-10 after:rounded-card"
          >
            {name} <span className="font-normal text-muted">{vehicle.year}</span>
          </Link>
        </Heading>

        <p className="mt-1 flex items-center gap-1.5 text-sm">
          {rating.count > 0 ? (
            <>
              <Star aria-hidden="true" className="size-3.5 fill-primary text-primary" />
              <span className="font-semibold text-ink">
                <span className="sr-only">Rated </span>
                {formatRating(rating.avg)}
                <span className="sr-only"> out of 5</span>
              </span>
              <span className="text-muted">({formatTrips(vehicle.tripCount)})</span>
            </>
          ) : (
            <>
              <Badge variant="primary">New</Badge>
              {vehicle.tripCount > 0 && <span className="text-muted">{formatTrips(vehicle.tripCount)}</span>}
            </>
          )}
        </p>

        {where && (
          <p className="mt-1 truncate text-sm text-muted">
            {vehicle.distanceKm !== null
              ? `${vehicle.suburb ?? vehicle.city} · ${formatDistance(vehicle.distanceKm)}`
              : where}
          </p>
        )}
        <p className="mt-1 text-sm text-ink/80">{specLine(vehicle)}</p>
        {vehicle.features.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-muted">
            <span className="sr-only">Features: </span>
            {vehicle.features.join(' · ')}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pt-4 tabular-nums">
          {estimate ? (
            <>
              <p className="text-sm text-muted">
                <PriceWithEstimate cents={vehicle.dailyCents} />
                /day
              </p>
              <p
                className="text-right"
                title={`Estimated total for ${estimate.days} ${estimate.days === 1 ? 'day' : 'days'}, including every mandatory charge${estimate.includesAirportDelivery ? ' and airport delivery' : ''}`}
              >
                <span className="font-semibold text-ink">
                  <PriceWithEstimate cents={estimate.totalCents} />
                </span>{' '}
                <span className="text-sm text-muted">
                  total{estimate.includesAirportDelivery ? ' incl. airport delivery' : ''}
                </span>
              </p>
            </>
          ) : (
            <p>
              <span className="font-semibold text-ink">
                <PriceWithEstimate cents={vehicle.dailyCents} />
              </span>
              <span className="text-sm text-muted">/day</span>
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/** A card-shaped placeholder with the same proportions, so nothing jumps when results arrive (plan §12.5). */
export function VehicleCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex flex-col rounded-card border border-line/80 bg-surface shadow-card', className)}
    >
      <div className="skeleton aspect-4/3 rounded-t-card" />
      <div className="flex flex-col p-4">
        <div className="skeleton h-5 w-3/5 rounded-md" />
        <div className="skeleton mt-2 h-4 w-2/5 rounded-md" />
        <div className="skeleton mt-2 h-4 w-1/2 rounded-md" />
        <div className="skeleton mt-2 h-4 w-3/5 rounded-md" />
        <div className="skeleton mt-1.5 h-3 w-2/3 rounded-md" />
        <div className="mt-4 flex justify-between">
          <div className="skeleton h-5 w-16 rounded-md" />
          <div className="skeleton h-5 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}
