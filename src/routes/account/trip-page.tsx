import { useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock,
  CarFront,
  CircleCheck,
  Hourglass,
  ReceiptText,
  ShieldCheck,
  Undo2,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { Booking } from '@/api/types';
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
import {
  bookingQueryKey,
  bookingsQueryKey,
  syncPayment,
  useBookingDetail,
} from '@/features/booking/booking-api';
import {
  awaitsVerification,
  formatNzDateTime,
  formatNzd,
  formatTripSpan,
  hostAnswers,
  refundSentence,
  statusLabel,
} from '@/features/booking/booking-format';
import {
  BookingPageSkeleton,
  DetailCard,
  PartyDetails,
  ProtectionDetails,
  Receipt,
  StatusBadge,
  SupportLink,
  TripStops,
} from '@/features/booking/booking-parts';
import { CancelDialogContent } from '@/features/booking/cancel-dialog';
import { HoldNotice } from '@/features/booking/hold-countdown';
import { PayBooking, type PaidBooking } from '@/features/booking/pay-booking';
import { CancellationPolicy } from '@/features/booking/trip-policies';
import { useNow } from '@/features/booking/use-time-left';
import { cn } from '@/lib/cn';

type Tone = 'info' | 'success' | 'danger';

const BANNER_TONES: Record<Tone, string> = {
  info: 'border-primary/15 bg-primary/5',
  success: 'border-success/25 bg-success/8',
  danger: 'border-danger/25 bg-danger/6',
};
const ICON_TONES: Record<Tone, string> = {
  info: 'text-primary',
  success: 'text-success',
  danger: 'text-danger',
};

function Banner({
  tone,
  icon: Icon,
  title,
  children,
}: {
  tone: Tone;
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn('flex animate-fade-up gap-4 rounded-card border p-5 sm:p-6', BANNER_TONES[tone])}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-6 shrink-0', ICON_TONES[tone])} />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="text-lg font-semibold text-ink">{title}</p>
        {children && <div className="grid gap-3 text-ink/85">{children}</div>}
      </div>
    </div>
  );
}

const CANCELLED_BY: Record<NonNullable<Booking['cancellation']>['by'], (host: string) => string> = {
  GUEST: () => 'You cancelled this trip',
  HOST: (host) => `${host} cancelled this trip`,
  SUPPORT: () => 'Rento Vroom support cancelled this trip',
};

/** Where the trip stands, in the Guest's words (plan §8.2), with what to do next. */
function TripStatus({ booking, onPaid }: { booking: Booking; onPaid: (paid: PaidBooking) => void }) {
  const host = booking.host.firstName;
  const [expired, setExpired] = useState(false);
  const now = useNow();

  switch (booking.status) {
    case 'PAYMENT_PENDING':
      if (booking.actions.pay && booking.holdExpiresAt && !expired) {
        return (
          <Card className="grid gap-6 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold text-ink">Finish paying to book this trip</h2>
              <p className="mt-1 text-sm text-muted">
                {booking.instantBook
                  ? 'Your booking is confirmed as soon as you pay.'
                  : `${host} has 24 hours to answer once you send the request.`}
              </p>
            </div>
            {booking.payment?.failureReason && (
              <Alert variant="danger" title="Your last payment didn’t go through">
                {booking.payment.failureReason} Try again, or use another card.
              </Alert>
            )}
            <HoldNotice expiresAt={booking.holdExpiresAt} onExpired={() => setExpired(true)} />
            <PayBooking booking={booking} onPaid={onPaid} onHoldExpired={() => setExpired(true)} />
          </Card>
        );
      }
      return (
        <Banner tone="danger" icon={Hourglass} title="These dates were released">
          <p>We held them for 30 minutes while you paid. Nothing was charged.</p>
          <div>
            <Button asChild variant="secondary" size="sm">
              <Link to={`/cars/${booking.vehicle.slug}`}>Book this car again</Link>
            </Button>
          </div>
        </Banner>
      );
    case 'PENDING':
      if (awaitsVerification(booking)) {
        // An Instant Book waits only for the check; a request also needs its Host, unless they've accepted.
        const alsoHost = hostAnswers(booking);
        return (
          <Banner tone="info" icon={ShieldCheck} title="We’re checking your details">
            <p>
              Your identity check needs a closer look from our team. The dates are held for you, and we’ll
              confirm your booking as soon as it’s approved
              {alsoHost ? ` and ${host} accepts` : ''}.
              {booking.hostAccepted ? ` ${host} has already accepted.` : ''} Your card is authorised for NZ
              {formatNzd(booking.price.totalCents)} and charged only then.
            </p>
            {booking.requestExpiresAt && (
              <p>
                If it isn’t decided by {formatNzDateTime(booking.requestExpiresAt)} (NZ time), the booking
                expires and nothing is charged.
              </p>
            )}
          </Banner>
        );
      }
      return (
        <Banner tone="info" icon={Hourglass} title={`Waiting for ${host}`}>
          <p>
            {booking.requestExpiresAt
              ? `${host} has until ${formatNzDateTime(booking.requestExpiresAt)} (NZ time) to answer.`
              : `${host} has 24 hours to answer.`}{' '}
            Your card is authorised for NZ{formatNzd(booking.price.totalCents)} and charged only if they
            accept.
          </p>
        </Banner>
      );
    case 'CONFIRMED':
      return (
        <Banner tone="success" icon={CircleCheck} title="You’re booked">
          <p>
            {new Date(booking.start).getTime() <= now
              ? `Your trip has started. ${host} is expecting you at the pick-up point.`
              : `Pick-up is ${formatNzDateTime(booking.start)} (NZ time). The address, number plate and ${host}’s mobile are below.`}
          </p>
        </Banner>
      );
    case 'ACTIVE':
      return (
        <Banner tone="success" icon={CarFront} title="On the road">
          <p>Return the car by {formatNzDateTime(booking.end)} (NZ time).</p>
        </Banner>
      );
    case 'COMPLETED':
      return (
        <Banner tone="info" icon={CircleCheck} title="Trip completed">
          <p>Thanks for travelling with Rento Vroom. Your receipt is below.</p>
        </Banner>
      );
    case 'DECLINED':
      return (
        <Banner tone="danger" icon={Undo2} title={`${host} couldn’t take this booking`}>
          <p>Your card authorisation was released, so nothing was charged.</p>
          <div>
            <Button asChild variant="secondary" size="sm">
              <Link to="/cars">Find another car</Link>
            </Button>
          </div>
        </Banner>
      );
    case 'EXPIRED':
      return (
        <Banner tone="danger" icon={Hourglass} title="This booking expired">
          <p>
            {booking.verificationReview === 'REJECTED'
              ? 'We weren’t able to verify your identity, so your card authorisation was released. Nothing was charged.'
              : booking.verificationReview === 'PENDING'
                ? 'We couldn’t finish your identity check within 24 hours, so your card authorisation was released. Nothing was charged.'
                : booking.payment?.status === 'CANCELLED'
                  ? `${host} didn’t answer within 24 hours, so your card authorisation was released. Nothing was charged.`
                  : 'The payment wasn’t finished within 30 minutes, so the dates were released. Nothing was charged.'}
          </p>
          <div>
            <Button asChild variant="secondary" size="sm">
              {booking.verificationReview === 'REJECTED' ? (
                <Link to={`/contact?category=ACCOUNT&booking=${booking.ref}`}>Contact support</Link>
              ) : (
                <Link to="/cars">Find another car</Link>
              )}
            </Button>
          </div>
        </Banner>
      );
    case 'CANCELLED': {
      const cancellation = booking.cancellation;
      const withdrawn = cancellation?.reason === 'REQUEST_WITHDRAWN';
      return (
        <Banner
          tone="danger"
          icon={Undo2}
          title={
            withdrawn
              ? 'You withdrew this request'
              : cancellation
                ? CANCELLED_BY[cancellation.by](host)
                : 'This trip was cancelled'
          }
        >
          {cancellation && (
            <p>
              {withdrawn
                ? 'Your card authorisation was released. Nothing was charged.'
                : refundSentence(cancellation)}
              {cancellation.by === 'HOST' && ' A host cancellation always gets you a full refund.'}
            </p>
          )}
        </Banner>
      );
    }
  }
}

function Trip({ tripRef }: { tripRef: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const trip = useBookingDetail(tripRef);
  const [cancelling, setCancelling] = useState(false);
  const booking = trip.data;

  // An unpaid trip may have been paid moments ago (webhooks can lag, and local development has none): ask
  // the API to apply the payment's state once.
  const synced = useRef(false);
  useEffect(() => {
    if (!booking || booking.role !== 'GUEST' || booking.status !== 'PAYMENT_PENDING' || synced.current)
      return;
    synced.current = true;
    void syncPayment(booking.ref)
      .then((fresh) => {
        if (fresh.status !== booking.status) queryClient.setQueryData(bookingQueryKey(fresh.ref), fresh);
      })
      .catch(() => undefined);
  }, [booking, queryClient]);

  if (trip.isError) {
    const missing = trip.error instanceof ApiError && trip.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <CalendarClock />
          </IconBadge>
        }
        title={missing ? 'We couldn’t find that trip' : 'We couldn’t load this trip'}
        description={missing ? 'Check the link, or find it in your trips.' : trip.error.message}
        actions={
          missing ? (
            <Button asChild>
              <Link to="/trips">Your trips</Link>
            </Button>
          ) : (
            <Button onClick={() => void trip.refetch()}>Try again</Button>
          )
        }
      />
    );
  }
  if (!booking) return <BookingPageSkeleton />;
  // The Host's side of the same booking has its own page.
  if (booking.role === 'HOST') return <Navigate to={`/host/bookings/${booking.ref}`} replace />;

  const status = statusLabel({ ...booking, otherPartyName: booking.host.firstName }, 'GUEST');
  const confirmed = ['CONFIRMED', 'ACTIVE', 'COMPLETED'].includes(booking.status);
  // Still to be paid for or answered: the address and the Host's mobile are on their way.
  const waiting = booking.status === 'PAYMENT_PENDING' || booking.status === 'PENDING';
  const cancelKind = booking.actions.withdraw
    ? 'withdraw'
    : booking.actions.cancel
      ? 'cancel'
      : booking.actions.pay
        ? 'release'
        : null;

  const paid = (updated: PaidBooking) => {
    void queryClient.invalidateQueries({ queryKey: bookingQueryKey(booking.ref) });
    void queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
    const held = updated.verificationReview === 'PENDING';
    toast(held ? 'Your booking is held' : updated.status === 'PENDING' ? 'Request sent' : 'You’re booked', {
      description: held
        ? 'We’re finishing your identity check. You’re only charged once it’s approved.'
        : updated.status === 'PENDING'
          ? `${booking.host.firstName} has 24 hours to answer.`
          : `Your trip in the ${booking.vehicle.title} is confirmed.`,
    });
  };

  return (
    <div className="grid gap-8">
      <div>
        <BackLink to="/trips">All trips</BackLink>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow text-primary">Trip {booking.ref}</p>
            <h1 className="headline mt-2 text-title-3 font-medium text-balance">{booking.vehicle.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-muted">
              {formatTripSpan(booking.start, booking.end)} · {booking.days}{' '}
              {booking.days === 1 ? 'day' : 'days'}
              <StatusBadge status={status} />
            </p>
          </div>
          {booking.vehicle.photoUrl && (
            <img
              src={booking.vehicle.photoUrl}
              alt=""
              width={160}
              height={120}
              className="aspect-4/3 w-40 shrink-0 rounded-card bg-canvas object-cover max-sm:hidden"
            />
          )}
        </div>
      </div>

      <TripStatus booking={booking} onPaid={paid} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-6">
          <DetailCard title="Pick-up and return" icon={CalendarClock}>
            <TripStops
              booking={booking}
              hiddenNote={
                waiting
                  ? 'The exact address and any instructions show here once your booking is confirmed.'
                  : undefined
              }
            />
            {booking.vehicle.regoPlate && (
              <p className="mt-4">
                Number plate{' '}
                <span className="font-semibold tracking-wide text-ink">{booking.vehicle.regoPlate}</span>
              </p>
            )}
          </DetailCard>
          <DetailCard title="Your host" icon={UserRound}>
            <PartyDetails
              party={booking.host}
              role="host"
              phoneNote={
                waiting
                  ? `${booking.host.firstName}’s mobile number shows here once your booking is confirmed.`
                  : confirmed
                    ? `${booking.host.firstName}’s mobile number isn’t available.`
                    : 'Mobile numbers are shared only while a booking is confirmed.'
              }
            />
          </DetailCard>
          {booking.protectionPlan && (
            <DetailCard title="Protection" icon={ShieldCheck}>
              <ProtectionDetails plan={booking.protectionPlan} />
            </DetailCard>
          )}
          {booking.cancellationTier && (
            <DetailCard title={`Cancellation: ${booking.cancellationTier.name}`} icon={Undo2}>
              <CancellationPolicy
                tier={booking.cancellationTier}
                start={confirmed || booking.status === 'PENDING' ? booking.start : undefined}
              />
            </DetailCard>
          )}
        </div>
        <div className="grid gap-6 lg:sticky lg:top-24">
          <DetailCard title="Receipt" icon={ReceiptText}>
            <Receipt booking={booking} />
          </DetailCard>
          <Card className="grid justify-items-start gap-3 p-5 text-sm sm:p-6">
            {cancelKind && cancelKind !== 'release' && (
              <Button variant="secondary" onClick={() => setCancelling(true)}>
                {cancelKind === 'withdraw' ? 'Withdraw request' : 'Cancel trip'}
              </Button>
            )}
            {cancelKind === 'release' && (
              <Button variant="ghost" size="sm" onClick={() => setCancelling(true)}>
                Release these dates
              </Button>
            )}
            <SupportLink bookingRef={booking.ref} />
          </Card>
        </div>
      </div>

      <Dialog open={cancelling} onOpenChange={setCancelling}>
        {cancelling && cancelKind && (
          <CancelDialogContent
            booking={booking}
            kind={cancelKind}
            onDone={() => {
              setCancelling(false);
              if (cancelKind === 'release') navigate('/trips');
            }}
          />
        )}
      </Dialog>
    </div>
  );
}

/**
 * One trip as the Guest sees it (spec §8): where it stands, when and where to collect and return the car, the
 * host, protection, the cancellation policy and the receipt, and cancelling with the refund shown first.
 */
export function TripPage() {
  const { ref = '' } = useParams();
  return (
    <Container className="py-8 sm:py-12">
      <PageMeta title={ref ? `Trip ${ref}` : 'Trip'} noindex />
      <RequireSignedIn fallback={<BookingPageSkeleton />}>
        {() => <Trip key={ref} tripRef={ref} />}
      </RequireSignedIn>
    </Container>
  );
}
