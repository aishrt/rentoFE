import { ClipboardCheck } from 'lucide-react';
import { Link } from 'react-router';
import type { BookingSummary } from '@/api/types';
import { staggerIndex } from '@/components/motion/presets';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBookingDetail, useBookings, type BookingRole } from '@/features/booking/booking-api';
import { BookingCard } from '@/features/booking/booking-card';
import { formatNzDateTime } from '@/features/booking/booking-format';
import { ActiveTripPanel, MessageButton, OpenTripButton, ReportIncidentButton } from './active-trip';
import { useHandover } from './handover-api';

/** How many trips under way show in full; the rest are a link away, in the Current list. */
const SHOWN = 3;

const tripPath = (role: BookingRole, ref: string) =>
  role === 'guest' ? `/trips/${ref}` : `/host/bookings/${ref}`;

/** A trip on the road: the active-trip panel, once its details have loaded. */
function ActiveTrip({ trip, role }: { trip: BookingSummary; role: BookingRole }) {
  const base = tripPath(role, trip.ref);
  const detail = useBookingDetail(trip.ref);
  if (detail.data) return <ActiveTripPanel booking={detail.data} base={base} standalone />;
  // Without its details the trip still shows, with its page a tap away.
  if (detail.isError) {
    return <BookingCard booking={trip} viewer={role === 'guest' ? 'GUEST' : 'HOST'} to={base} />;
  }
  return <Skeleton aria-hidden="true" className="h-64 rounded-card" />;
}

/** A trip whose start has passed without a check-in: the prompt to check in (plan §8.2). */
function CheckInDue({ trip, role }: { trip: BookingSummary; role: BookingRole }) {
  const base = tripPath(role, trip.ref);
  const handover = useHandover(trip.ref);
  const guest = role === 'guest';
  const other = trip.otherParty.firstName;

  return (
    <Card className="grid gap-6 border-primary/25 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ClipboardCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="eyebrow text-primary">Trip started</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              {guest ? 'Check in to start your trip' : `Check in with ${other}`}
            </h2>
            <p className="mt-1 text-sm font-medium text-ink">
              {trip.vehicle.title} <span className="font-normal text-muted">· {trip.ref}</span>
            </p>
            <p className="mt-1 text-sm text-ink/80">
              Pick-up was {formatNzDateTime(trip.start)}.{' '}
              {guest
                ? 'Take the check-in photos and readings before you drive away.'
                : `Take the check-in photos and readings with ${other} before they drive away.`}
            </p>
          </div>
        </div>
        {handover.data?.actions.checkIn && (
          <Button asChild size="lg">
            <Link to={`${base}/check-in`}>Start check-in</Link>
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <OpenTripButton to={base} label={guest ? 'Open trip' : 'Open booking'} />
        <MessageButton tripRef={trip.ref} name={other} />
        <ReportIncidentButton tripRef={trip.ref} />
      </div>
    </Card>
  );
}

/**
 * The trips under way, at the top of Trips and of the Host's Overview (plan §12.6: from check-in to check-out,
 * the trip sits at the top). These are the Current group (plan §8.2): a trip on the road gets the active-trip
 * panel, and one whose start has passed gets a prompt to check in. Nothing under way, nothing shown.
 */
export function CurrentTrips({ role }: { role: BookingRole }) {
  const trips = useBookings(role, 'current');

  if (trips.isError) {
    return (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn’t load the trips under way"
        action={
          <Button variant="secondary" size="sm" onClick={() => void trips.refetch()}>
            Try again
          </Button>
        }
      >
        {trips.error.message}
      </Alert>
    );
  }
  if (!trips.data || trips.data.length === 0) return null;
  const shown = trips.data.slice(0, SHOWN);
  const more = trips.data.length - shown.length;

  return (
    <section aria-label="Trips under way" className="grid gap-4">
      {shown.map((trip, index) => (
        <div key={trip.id} className="stagger-in" style={staggerIndex(index)}>
          {trip.status === 'ACTIVE' ? (
            <ActiveTrip trip={trip} role={role} />
          ) : (
            <CheckInDue trip={trip} role={role} />
          )}
        </div>
      ))}
      {more > 0 && (
        <p className="text-sm">
          <Link
            to={role === 'guest' ? '/trips?tab=current' : '/host/bookings?tab=current'}
            viewTransition
            className="link-underline font-medium text-primary"
          >
            {more} more under way
          </Link>
        </p>
      )}
    </section>
  );
}
