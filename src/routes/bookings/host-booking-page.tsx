import {
  CalendarClock,
  Check,
  CircleCheck,
  Coins,
  Hourglass,
  ShieldCheck,
  Undo2,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Booking } from '@/api/types';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { ParkingBays } from '@/components/brand/patterns/parking-bays';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { BackLink } from '@/components/ui/back-link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { toast } from '@/components/ui/toast';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { useAcceptBooking, useBookingDetail } from '@/features/booking/booking-api';
import { acceptedToast } from '@/features/booking/accepted-toast';
import {
  awaitsVerification,
  formatNzDateTime,
  formatNzd,
  formatTimeLeft,
  formatTripSpan,
  hostAnswers,
  statusLabel,
} from '@/features/booking/booking-format';
import {
  BookingPageSkeleton,
  DetailCard,
  PartyDetails,
  ProtectionDetails,
  StatusBadge,
  SupportLink,
  TripStops,
} from '@/features/booking/booking-parts';
import { CancelDialogContent } from '@/features/booking/cancel-dialog';
import { DeclineDialogContent } from '@/features/booking/decline-dialog';
import { useTimeLeft } from '@/features/booking/use-time-left';
import { HostSubNav } from '@/features/host/host-nav';

/** A request's answer: Accept captures the Guest's payment and confirms the trip; Decline releases it. */
function RequestAnswer({ booking }: { booking: Booking }) {
  const accept = useAcceptBooking(booking.ref);
  const [declining, setDeclining] = useState(false);
  const left = useTimeLeft(booking.requestExpiresAt, 30_000);
  const guest = booking.guest.firstName;

  return (
    <Card className="grid gap-4 border-primary/30 p-5 ring-1 ring-primary/10 sm:p-6">
      <div className="flex items-start gap-4">
        <Hourglass aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-ink">{guest} would like to book your car</h2>
          <p className="mt-1 text-ink/85">
            {left > 0 && booking.requestExpiresAt
              ? `You have ${formatTimeLeft(left)} to answer (until ${formatNzDateTime(booking.requestExpiresAt)}, NZ time). After that the request expires.`
              : 'This request has expired.'}{' '}
            {guest}’s card is authorised, and charged only when you accept.
            {awaitsVerification(booking) &&
              ` We’re still checking ${guest}’s identity, so if you accept, the booking is confirmed once that’s approved.`}
          </p>
        </div>
      </div>
      {accept.isError && (
        <Alert variant="danger" role="alert" title="We couldn’t accept this request">
          {accept.error.message}
        </Alert>
      )}
      <div className="flex flex-wrap gap-3 sm:pl-10">
        {booking.actions.accept && (
          <Button
            loading={accept.isPending}
            onClick={() =>
              accept.mutate(undefined, {
                onSuccess: (accepted) => toast(...acceptedToast(accepted, guest)),
              })
            }
          >
            <Check aria-hidden="true" />
            Accept request
          </Button>
        )}
        {booking.actions.decline && (
          <Button variant="secondary" disabled={accept.isPending} onClick={() => setDeclining(true)}>
            <X aria-hidden="true" />
            Decline
          </Button>
        )}
      </div>
      <Dialog open={declining} onOpenChange={setDeclining}>
        {declining && (
          <DeclineDialogContent
            booking={{ ref: booking.ref, guestName: guest }}
            onDone={() => setDeclining(false)}
          />
        )}
      </Dialog>
    </Card>
  );
}

/** Where the booking stands for the Host (plan §8.2). */
function HostStatus({ booking }: { booking: Booking }) {
  const guest = booking.guest.firstName;
  const banner = (title: string, text: string, icon = CircleCheck) => {
    const Icon = icon;
    return (
      <div
        role="status"
        className="flex animate-fade-up gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"
      >
        <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
        <div>
          <p className="text-lg font-semibold text-ink">{title}</p>
          <p className="mt-1 text-ink/85">{text}</p>
        </div>
      </div>
    );
  };

  switch (booking.status) {
    case 'PENDING': {
      if (hostAnswers(booking)) return <RequestAnswer booking={booking} />;
      // Nothing for the Host to answer: support is checking the Guest's identity (plan §8.2).
      const held = booking.requestExpiresAt
        ? ` The dates are held until ${formatNzDateTime(booking.requestExpiresAt)} (NZ time); if the check isn’t approved by then, they open again.`
        : '';
      return booking.hostAccepted
        ? banner(
            'You accepted this request',
            `It’s confirmed as soon as we’ve finished checking ${guest}’s identity.${held}`,
            Hourglass,
          )
        : banner(
            `We’re verifying ${guest}`,
            `${guest} booked your car, and we’re finishing their identity check. There’s nothing for you to do: the booking is confirmed as soon as the check is approved.${held}`,
            Hourglass,
          );
    }
    case 'CONFIRMED':
      return banner(
        'Confirmed',
        `${guest} picks the car up ${formatNzDateTime(booking.start)} (NZ time). Their mobile is below if you need to reach them.`,
      );
    case 'ACTIVE':
      return banner('On the road', `${guest} returns the car by ${formatNzDateTime(booking.end)} (NZ time).`);
    case 'COMPLETED':
      return banner('Trip completed', 'Your payout follows the schedule below.');
    case 'DECLINED':
      return banner('You declined this request', `${guest}’s card authorisation was released.`, Undo2);
    case 'EXPIRED':
      // Ended by the Guest's identity check: always for an Instant Book, otherwise unless it was approved.
      return booking.verificationReview && (booking.instantBook || booking.verificationReview !== 'APPROVED')
        ? banner(
            'This booking didn’t go ahead',
            `We couldn’t verify ${guest} in time, so their card authorisation was released and the dates are free again. It doesn’t count against your response rate.`,
            Hourglass,
          )
        : banner(
            'This request expired',
            `It wasn’t answered within 24 hours, so ${guest}’s card authorisation was released.`,
            Hourglass,
          );
    case 'CANCELLED': {
      const cancellation = booking.cancellation;
      const byGuest = cancellation?.by === 'GUEST';
      const text = byGuest
        ? cancellation?.hostShareCents
          ? `${guest} cancelled. Your share of the kept fee, ${formatNzd(cancellation.hostShareCents)}, comes with your next payout.`
          : `${guest} cancelled.`
        : cancellation?.by === 'HOST'
          ? `You cancelled, and ${guest} was refunded in full.${cancellation.hostFeeCents ? ` A ${formatNzd(cancellation.hostFeeCents)} Host cancellation fee comes off your next payout.` : ''}`
          : `Rento Vroom support cancelled this booking, and ${guest} was refunded.`;
      return banner('Cancelled', text, Undo2);
    }
    default:
      return null;
  }
}

function HostBooking({ bookingRef }: { bookingRef: string }) {
  const detail = useBookingDetail(bookingRef);
  const [cancelling, setCancelling] = useState(false);
  const booking = detail.data;

  if (detail.isError) {
    const missing = detail.error instanceof ApiError && detail.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <CalendarClock />
          </IconBadge>
        }
        title={missing ? 'We couldn’t find that booking' : 'We couldn’t load this booking'}
        description={missing ? 'Check the link, or find it in your bookings.' : detail.error.message}
        actions={
          missing ? (
            <Button asChild>
              <Link to="/host/bookings">Your bookings</Link>
            </Button>
          ) : (
            <Button onClick={() => void detail.refetch()}>Try again</Button>
          )
        }
      />
    );
  }
  if (!booking) return <BookingPageSkeleton />;
  // The Guest's side of the same booking is their trip page.
  if (booking.role === 'GUEST') return <Navigate to={`/trips/${booking.ref}`} replace />;

  const guest = booking.guest.firstName;
  const status = statusLabel({ ...booking, otherPartyName: guest }, 'HOST');
  const confirmed = ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(booking.status);
  const ended = ['CANCELLED', 'DECLINED', 'EXPIRED'].includes(booking.status);

  return (
    <div className="grid gap-8">
      <HostSubNav />
      <div>
        <BackLink to="/host/bookings">All bookings</BackLink>
        <p className="eyebrow mt-4 text-primary">Booking {booking.ref}</p>
        <h1 className="headline mt-2 text-title-3 font-medium text-balance">
          {guest}’s trip in the {booking.vehicle.title}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-3 text-muted">
          {formatTripSpan(booking.start, booking.end)} · {booking.days} {booking.days === 1 ? 'day' : 'days'}
          <StatusBadge status={status} />
        </p>
      </div>

      <HostStatus booking={booking} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-6">
          <DetailCard title="Your guest" icon={UserRound}>
            <PartyDetails
              party={booking.guest}
              role="guest"
              phoneNote={
                booking.status === 'PENDING'
                  ? `${guest}’s mobile number shows here once the booking is confirmed.`
                  : confirmed
                    ? `${guest}’s mobile number isn’t available.`
                    : 'Mobile numbers are shared only while a booking is confirmed.'
              }
            />
          </DetailCard>
          <DetailCard title="Pick-up and return" icon={CalendarClock}>
            <TripStops
              booking={booking}
              hiddenNote={
                booking.status === 'PENDING' &&
                (booking.pickup.type === 'DELIVERY' || booking.dropoff.type === 'DELIVERY')
                  ? 'The delivery address shows here once the booking is confirmed.'
                  : undefined
              }
            />
          </DetailCard>
          {booking.protectionPlan && (
            <DetailCard title="Protection" icon={ShieldCheck}>
              <ProtectionDetails plan={booking.protectionPlan} />
            </DetailCard>
          )}
        </div>
        <div className="grid gap-6 lg:sticky lg:top-24">
          {/* A booking that ended without a trip pays nothing; the banner above has any kept share or fee. */}
          {booking.payout && !ended && (
            <DetailCard
              title={booking.status === 'PENDING' ? 'What you’d earn' : 'What you earn'}
              icon={Coins}
            >
              <dl className="grid gap-2">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="font-semibold text-ink">Your payout</dt>
                  <dd className="text-lg font-semibold text-ink tabular-nums">
                    NZ{formatNzd(booking.payout.hostPayoutCents)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 text-muted">
                  <dt>Platform commission</dt>
                  <dd className="tabular-nums">{formatNzd(booking.payout.platformFeeCents)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 text-muted">
                  <dt>The guest pays</dt>
                  <dd className="tabular-nums">{formatNzd(booking.price.totalCents)}</dd>
                </div>
              </dl>
              <p className="mt-4 text-muted">
                Paid to your Stripe account 24 hours after the trip starts, then to your bank on Stripe’s
                payout schedule.
              </p>
            </DetailCard>
          )}
          <Card className="grid justify-items-start gap-3 p-5 text-sm sm:p-6">
            {booking.actions.cancel && (
              <Button variant="secondary" onClick={() => setCancelling(true)}>
                Cancel booking
              </Button>
            )}
            <SupportLink bookingRef={booking.ref} />
          </Card>
        </div>
      </div>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        {cancelling && (
          <CancelDialogContent booking={booking} kind="cancel" onDone={() => setCancelling(false)} />
        )}
      </Dialog>
    </div>
  );
}

/**
 * One booking as its Host sees it (plan §6.2): the Guest (first name, verification, rating and trips, and
 * their mobile once confirmed), the dates and handover, what the Host earns, and Accept and Decline for a
 * request or Cancel, with the Guest's full refund and any Host fee shown first, for a confirmed booking.
 */
export function HostBookingPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageBackdrop art={ParkingBays} />
      <PageMeta title={ref ? `Booking ${ref}` : 'Booking'} noindex />
      <RequireSignedIn fallback={<BookingPageSkeleton />}>
        {() => <HostBooking key={ref} bookingRef={ref} />}
      </RequireSignedIn>
    </Container>
  );
}
