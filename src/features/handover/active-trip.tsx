import {
  CarFront,
  LifeBuoy,
  MapPin,
  MessagesSquare,
  Navigation,
  Phone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router';
import type { Booking } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatNzDateTime, formatNzd } from '@/features/booking/booking-format';
import { useNow } from '@/features/booking/use-time-left';
import { usePolicies } from '@/features/content/content-api';
import { roadsidePhone } from '@/features/content/roadside';

const HOUR_MS = 60 * 60 * 1000;

/** Directions to an address in the phone's maps app. */
const directionsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

/**
 * The active trip (spec §28, "use vehicle"; plan §12.6): from check-in to check-out, everything needed on the
 * road. The return time and place with directions, message and call, the protection and its excess, reporting
 * an incident and emergency help, and Start check-out as the return time nears.
 */
export function ActiveTripPanel({ booking, base }: { booking: Booking; base: string }) {
  const now = useNow();
  const policies = usePolicies();
  // The protection plan's own roadside number when the insurer gives one, else the platform-wide one.
  const roadside = roadsidePhone(policies.data, booking.protectionPlan?.code);
  const guest = booking.role === 'GUEST';
  const other = guest ? booking.host : booking.guest;
  const returnAt = new Date(booking.end).getTime();
  const nearReturn = returnAt - now <= 3 * HOUR_MS;
  const place = booking.dropoff.address ?? booking.dropoff.label;

  return (
    <Card className="grid gap-6 border-primary/25 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
            <CarFront aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="eyebrow text-primary">On the road</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {guest ? 'Return' : `${other.firstName} returns it`} by {formatNzDateTime(booking.end)}
            </h2>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-ink/80">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted" />
              {place}
            </p>
          </div>
        </div>
        {nearReturn && (
          <Button asChild size="lg">
            <Link to={`${base}/check-out`}>Start check-out</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {guest && booking.dropoff.address && (
          <Button asChild variant="secondary">
            <a href={directionsUrl(booking.dropoff.address)} target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" />
              Directions
            </a>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to={`/messages/${booking.ref}`}>
            <MessagesSquare aria-hidden="true" />
            Message {other.firstName}
          </Link>
        </Button>
        {other.phone && (
          <Button asChild variant="secondary">
            <a href={`tel:${other.phone}`}>
              <Phone aria-hidden="true" />
              Call {other.firstName}
            </a>
          </Button>
        )}
        <Button asChild variant="secondary">
          <Link to={`/incidents/new?booking=${booking.ref}`}>
            <TriangleAlert aria-hidden="true" />
            Report an incident
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {booking.protectionPlan && (
          <div className="flex items-start gap-3 rounded-control bg-canvas p-4 text-sm">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
            <p>
              <span className="block font-medium text-ink">{booking.protectionPlan.name} protection</span>
              <span className="text-ink/80">
                {booking.protectionPlan.coverSummary} Excess {formatNzd(booking.protectionPlan.excessCents)}.
              </span>
            </p>
          </div>
        )}
        <div className="flex items-start gap-3 rounded-control border border-danger/25 bg-danger/6 p-4 text-sm">
          <LifeBuoy aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger" />
          <p>
            <span className="block font-medium text-ink">
              In an emergency,{' '}
              <a href="tel:111" className="font-semibold text-danger underline">
                call 111
              </a>
            </span>
            <span className="text-ink/80">
              {roadside ? (
                <>
                  Breakdown or flat battery? Roadside assistance:{' '}
                  <a href={`tel:${roadside}`} className="font-medium text-primary underline">
                    {roadside}
                  </a>
                  .
                </>
              ) : (
                'For a breakdown, contact your host, then report it here.'
              )}
            </span>
          </p>
        </div>
      </div>
    </Card>
  );
}
