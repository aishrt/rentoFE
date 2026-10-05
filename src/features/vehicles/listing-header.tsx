import { Baby, Infinity as Unlimited, MapPin, PawPrint, Plane, Star, Truck, Zap } from 'lucide-react';
import type { VehicleDetail } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { formatNumber } from '@/lib/format';
import { BODY_TYPE_LABELS, formatRating, formatTrips, placeLine } from './vehicle-format';

/** Make, model, year and variant, rating and trips, and where the car is (spec §6), with its booking options. */
export function ListingHeader({ vehicle }: { vehicle: VehicleDetail }) {
  const place = placeLine(vehicle.location);
  const hasDelivery = vehicle.deliveryOptions.some(
    (option) => option.type === 'DELIVERY' || option.type === 'CUSTOM',
  );
  const hasAirport = vehicle.deliveryOptions.some((option) => option.type === 'AIRPORT');
  const badges = [
    vehicle.rules.instantBook && { icon: Zap, label: 'Instant Book' },
    hasDelivery && { icon: Truck, label: 'Delivery' },
    hasAirport && { icon: Plane, label: 'Airport delivery' },
    vehicle.unlimitedKm && { icon: Unlimited, label: 'Unlimited km' },
    vehicle.petFriendly && { icon: PawPrint, label: 'Pet friendly' },
    vehicle.childSeat && { icon: Baby, label: 'Child seat' },
  ].filter((badge) => badge !== false);

  return (
    <header className="pt-6 pb-8 sm:pt-8">
      <p className="eyebrow text-primary">
        {BODY_TYPE_LABELS[vehicle.bodyType]}
        {vehicle.location.region && ` · ${vehicle.location.region}`}
      </p>
      <h1 className="headline mt-2 text-title-2 font-medium text-ink">
        {vehicle.make} {vehicle.model} <span className="text-muted">{vehicle.year}</span>
      </h1>
      {vehicle.variant && <p className="mt-1 text-lg text-ink/80">{vehicle.variant}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {vehicle.rating.count > 0 ? (
          <a href="#reviews" className="inline-flex items-center gap-1.5 text-ink hover:text-primary">
            <Star aria-hidden="true" className="size-4 fill-primary text-primary" />
            <span className="font-semibold">
              <span className="sr-only">Rated </span>
              {formatRating(vehicle.rating.avg)}
              <span className="sr-only"> out of 5</span>
            </span>
            <span className="link-underline text-muted">
              {formatNumber(vehicle.rating.count)} {vehicle.rating.count === 1 ? 'review' : 'reviews'}
            </span>
          </a>
        ) : (
          <Badge variant="primary">New</Badge>
        )}
        {vehicle.tripCount > 0 && <span className="text-muted">{formatTrips(vehicle.tripCount)}</span>}
        {place && (
          <a href="#location" className="inline-flex items-center gap-1.5 text-ink hover:text-primary">
            <MapPin aria-hidden="true" className="size-4 text-primary" />
            <span className="link-underline">{place}</span>
          </a>
        )}
      </div>

      {badges.length > 0 && (
        <ul aria-label="Good to know" className="mt-5 flex flex-wrap gap-2">
          {badges.map(({ icon: Icon, label }) => (
            <li key={label}>
              <Badge variant="outline" className="px-3 py-1 text-ink">
                <Icon aria-hidden="true" className="text-primary" />
                {label}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
