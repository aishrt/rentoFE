import { BadgeCheck, CalendarClock, Fuel, Route, Star, Undo2, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { CancellationTier, PublicHost, VehicleDetail } from '@/api/types';
import { IconBadge } from '@/components/ui/icon-badge';
import { refundWindows } from '@/features/content/policies';
import { formatNzDateTime, formatNzd, freeCancellationUntil, ratingText } from './booking-format';

type Tier = Pick<CancellationTier, 'name' | 'summary' | 'refunds'>;

export function PolicyRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0">
      <IconBadge size="sm">
        <Icon />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-ink">{title}</h3>
        <div className="mt-1 text-sm text-ink/85">{children}</div>
      </div>
    </li>
  );
}

/** A tier's refund rules, with the date a full refund ends for this trip when there is one. */
export function CancellationPolicy({ tier, start }: { tier: Tier; start?: string }) {
  const until = start ? freeCancellationUntil(tier, start) : null;
  return (
    <>
      {until && (
        <p className="font-medium text-ink">
          Full refund if you cancel before {formatNzDateTime(until)} (NZ time).
        </p>
      )}
      <p className={until ? 'mt-1 text-muted' : undefined}>{tier.summary}</p>
      <dl className="mt-3 grid gap-1.5">
        {refundWindows(tier).map((window) => (
          <div
            key={window.when}
            className="flex justify-between gap-4 border-b border-dashed border-line pb-1.5 last:border-0 last:pb-0"
          >
            <dt className="text-muted">{window.when}</dt>
            <dd className="shrink-0 font-medium text-ink">{window.refund}</dd>
          </div>
        ))}
      </dl>
      <Link
        to="/cancellation-policy"
        target="_blank"
        rel="noopener"
        className="link-underline mt-3 inline-block font-medium text-primary"
      >
        Read the cancellation policy
      </Link>
    </>
  );
}

export function HostLine({
  host,
}: {
  host: Pick<PublicHost, 'firstName' | 'rating' | 'tripCount' | 'verified'>;
}) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/85">
      <span>
        Hosted by <span className="font-semibold text-ink">{host.firstName}</span>
      </span>
      <span className="flex items-center gap-1">
        <Star aria-hidden="true" className="size-3.5 fill-current text-primary" />
        <span className="sr-only">Rating</span>
        {ratingText(host.rating)}
      </span>
      <span>
        {host.tripCount} {host.tripCount === 1 ? 'trip' : 'trips'}
      </span>
      {host.verified && (
        <span className="flex items-center gap-1 text-primary">
          <BadgeCheck aria-hidden="true" className="size-4" />
          Verified
        </span>
      )}
    </p>
  );
}

/** Fuel, kilometres, trip length and cancellation, as the listing's terms apply to this trip (spec §7, step 5). */
export function TripTerms({ vehicle, start, tier }: { vehicle: VehicleDetail; start?: string; tier: Tier }) {
  const electric = vehicle.fuelType === 'EV';
  const fuel =
    vehicle.fuelPolicy === 'FULL'
      ? electric
        ? 'Return it fully charged.'
        : 'Return it with a full tank.'
      : electric
        ? 'Return it with the same battery charge as when you collected it.'
        : 'Return it with the same amount of fuel as when you collected it.';
  const { rules } = vehicle;

  return (
    <ul className="divide-y divide-line">
      <PolicyRow icon={Fuel} title={electric ? 'Charging' : 'Fuel'}>
        {fuel}
      </PolicyRow>
      <PolicyRow icon={Route} title="Kilometres">
        {vehicle.unlimitedKm || vehicle.kmAllowancePerDay === null
          ? 'Unlimited kilometres.'
          : `${vehicle.kmAllowancePerDay} km a day included, then ${formatNzd(vehicle.extraKmCents)} for each extra kilometre, charged to your saved card after the trip.`}
      </PolicyRow>
      <PolicyRow icon={CalendarClock} title="Pick-up and return">
        Your host has the car ready at the pick-up time. Bring it back by the return time: a late return may
        be charged, as the Guest Agreement explains.
      </PolicyRow>
      <PolicyRow icon={Undo2} title={`Cancellation: ${tier.name}`}>
        <CancellationPolicy tier={tier} start={start} />
      </PolicyRow>
      {rules.instantBook ? null : (
        <PolicyRow icon={BadgeCheck} title="Request to book">
          Your host has 24 hours to accept. Your card is authorised now and charged only if they accept; if
          they don’t, the authorisation is released.
        </PolicyRow>
      )}
    </ul>
  );
}
