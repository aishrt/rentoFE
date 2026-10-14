import {
  CalendarClock,
  Check,
  CircleCheck,
  Coins,
  Fuel,
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
  formatNzDate,
  formatNzDateTime,
  formatNzd,
  formatTimeLeft,
  formatTripSpan,
  hostAnswers,
  statusLabel,
} from '@/features/booking/booking-format';
import {
  BookedTermsDetails,
  BookingPageSkeleton,
  DetailCard,
  PartyDetails,
  ProtectionDetails,
  StatusBadge,
  MessageLink,
  ReviewLink,
  SupportLink,
  TripStops,
} from '@/features/booking/booking-parts';
import { CancelDialogContent } from '@/features/booking/cancel-dialog';
import { DeclineDialogContent } from '@/features/booking/decline-dialog';
import { ExtraCharges } from '@/features/booking/extra-charges';
import { useTimeLeft } from '@/features/booking/use-time-left';
import { ActiveTripPanel } from '@/features/handover/active-trip';
import { ReportIncidentLink } from '@/features/incidents/report-incident-link';
import { HandoverCard } from '@/features/handover/handover-card';
import { HostShell } from '@/features/host/host-shell';

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
const HOLD_WORDS: Record<NonNullable<NonNullable<Booking['payout']>['holdReason']>, string> = {
  PAYOUT_SETUP: 'Held until your payout setup is finished.',
  TRIP_NOT_STARTED: 'Sent once check-in is done.',
  INCIDENT: 'Held while an incident on this booking is open.',
  DISPUTE: 'Held while a card dispute is settled.',
  SUSPENDED: 'Held while the account is suspended.',
  MANUAL: 'Held while our team checks something. We’ll be in touch.',
};

/** Where the trip's payout stands (plan §8.1, item 19), once there is one. */
function payoutStatusLine(payout: NonNullable<Booking['payout']>): string | null {
  if (payout.status === 'PAID' && payout.paidAt)
    return `Paid ${formatNzDateTime(payout.paidAt)} to your Stripe account${payout.expectedInBankBy ? `, usually in your bank by ${formatNzDate(payout.expectedInBankBy)}` : ''}.`;
  if (payout.status === 'HELD' && payout.holdReason) return HOLD_WORDS[payout.holdReason];
  if (payout.status === 'FAILED') return 'The payout didn’t go through. Our team is on it.';
  if (payout.status === 'SCHEDULED' && payout.scheduledFor)
    return `Paid to your Stripe account from ${formatNzDateTime(payout.scheduledFor)}, then to your bank on Stripe’s schedule.`;
  return null;
}

type PayoutRefund = NonNullable<NonNullable<Booking['payout']>['refunds']>[number];

/** Who funds a refund: one the Host funds costs them their share of it, not Rento Vroom's commission. */
function fundedWords(refund: PayoutRefund): string {
  if (refund.cancellation) return 'Under the cancellation policy';
  if (refund.fundedBy !== 'HOST') return 'Funded by Rento Vroom';
  if (refund.hostCents !== undefined && refund.hostCents < refund.amountCents)
    return `Funded by you: your share, ${formatNzd(refund.hostCents)}, comes off your payout`;
  return 'Funded by you: it comes off your payout';
}

type Settled = NonNullable<NonNullable<Booking['payout']>['settled']>[number];

/** What a payout of this booking settled for another booking, as on the payout email. */
function settledLabel(line: Settled): string {
  if (line.type === 'HOST_CANCELLATION_FEE') return 'Host cancellation fee';
  if (line.payoutSent)
    return line.bookingRef ? `Payout already sent for ${line.bookingRef}` : 'A payout already sent';
  return line.bookingRef ? `Refund for ${line.bookingRef}` : 'Refund to a guest';
}

/** A muted line of the money card, with a note under its label. */
function MoneyLine({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-muted">
      <dt>
        {label}
        {note && <span className="block text-xs">{note}</span>}
      </dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * What the booking earned, net, with its parts: the same figures as its row on the earnings page and the
 * statement (plan §8.1, items 19 and 22).
 */
function Earned({ earnings }: { earnings: NonNullable<NonNullable<Booking['payout']>['earnings']> }) {
  const trip = earnings.rentalCents + earnings.deliveryCents;
  return (
    <dl className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="font-semibold text-ink">
          You earn
          <span className="block text-xs font-normal text-muted">As on your earnings page</span>
        </dt>
        <dd className="text-lg font-semibold text-ink tabular-nums">NZ{formatNzd(earnings.netCents)}</dd>
      </div>
      {trip > 0 && <MoneyLine label="Rental and delivery" value={formatNzd(trip)} />}
      {earnings.extraChargesCents > 0 && (
        <MoneyLine label="Extra charges" value={formatNzd(earnings.extraChargesCents)} />
      )}
      {earnings.keptFeeCents > 0 && (
        <MoneyLine label="Your part of the fee kept" value={formatNzd(earnings.keptFeeCents)} />
      )}
      {/* As on the payout and its email (plan §8.1, item 22): the commission with the GST in it. */}
      {earnings.commissionCents > 0 && (
        <MoneyLine
          label="Platform commission"
          note={`incl. ${formatNzd(earnings.commissionGstCents)} GST`}
          value={`−${formatNzd(earnings.commissionCents)}`}
        />
      )}
      {earnings.hostFundedRefundsCents > 0 && (
        <MoneyLine
          label="Refunds you fund"
          note="Your share of them"
          value={`−${formatNzd(earnings.hostFundedRefundsCents)}`}
        />
      )}
      {earnings.hostCancellationFeeCents > 0 && (
        <MoneyLine
          label="Host cancellation fee"
          note="Comes off your next payout"
          value={`−${formatNzd(earnings.hostCancellationFeeCents)}`}
        />
      )}
    </dl>
  );
}

/**
 * Refunds made to the Guest on the booking and its extra charges with who funds each, what the Host was
 * actually paid for it (plan §8.1, items 15 and 19), and why that can differ from what the booking earned:
 * what its payouts settled for other bookings, what other payouts took for this one, and what's still owed.
 */
function PaidAndRefunded({ payout, guest }: { payout: NonNullable<Booking['payout']>; guest: string }) {
  const refunds = payout.refunds ?? [];
  const settled = payout.settled ?? [];
  const elsewhere = payout.settledElsewhere ?? [];
  const owed = payout.owed;
  if (
    refunds.length === 0 &&
    payout.paidCents === undefined &&
    settled.length === 0 &&
    elsewhere.length === 0 &&
    !owed
  ) {
    return null;
  }
  return (
    <dl className="mt-4 grid gap-2 border-t border-line pt-4">
      {refunds.map((refund, index) => (
        <div key={`${refund.at}-${index}`} className="flex items-baseline justify-between gap-4 text-muted">
          <dt>
            Refund to {guest}
            {refund.extraCharge ? ' of an extra charge' : ''}, {formatNzDate(refund.at)}
            <span className="block text-xs">{fundedWords(refund)}</span>
          </dt>
          <dd className="tabular-nums">{formatNzd(refund.amountCents)}</dd>
        </div>
      ))}
      {payout.paidCents !== undefined && (
        <div className="flex items-baseline justify-between gap-4">
          <dt className="font-semibold text-ink">Paid to you so far</dt>
          <dd className="font-semibold text-ink tabular-nums">{formatNzd(payout.paidCents)}</dd>
        </div>
      )}
      {/* Taken off this booking's payouts for what was owed elsewhere: earned here, though not paid out. */}
      {settled.map((line, index) => (
        <MoneyLine
          key={`settled-${index}`}
          label={`Settled: ${settledLabel(line)}`}
          note="Taken off these payouts, so it counts as paid"
          value={formatNzd(line.amountCents)}
        />
      ))}
      {elsewhere.map((line, index) => (
        <MoneyLine
          key={`elsewhere-${index}`}
          label={line.payoutSent ? 'Payout already sent, taken back' : 'Refunds you fund'}
          note={`Taken off your payout for ${line.bookingRef}`}
          value={`−${formatNzd(line.amountCents)}`}
        />
      ))}
      {owed && owed.payoutSentCents > 0 && (
        <MoneyLine
          label="Payout already sent, owed back"
          note="Comes off your next payout"
          value={`−${formatNzd(owed.payoutSentCents)}`}
        />
      )}
      {owed && owed.refundsCents > 0 && (
        <MoneyLine
          label="Refunds you fund, still owed"
          note="Comes off your next payout"
          value={`−${formatNzd(owed.refundsCents)}`}
        />
      )}
    </dl>
  );
}

/** Why a booking expired, for its Host (plan §8.2: each labelled). */
function expiredWords(booking: Booking, guest: string): { title: string; text: string } {
  // Before the API said why: ended by the Guest's identity check (always for an Instant Book, otherwise
  // unless it was approved), or the request wasn't answered.
  const reason =
    booking.expiry?.reason ??
    (booking.verificationReview && (booking.instantBook || booking.verificationReview !== 'APPROVED')
      ? 'VERIFICATION_EXPIRED'
      : 'HOST_NO_ANSWER');
  const notAhead = 'This booking didn’t go ahead';
  switch (reason) {
    case 'HOST_NO_ANSWER':
      return {
        title: 'This request expired',
        text: `It wasn’t answered in time, so ${guest}’s card authorisation was released.`,
      };
    case 'VERIFICATION_EXPIRED':
    case 'VERIFICATION_REJECTED':
      return {
        title: notAhead,
        text: `We couldn’t verify ${guest}${reason === 'VERIFICATION_EXPIRED' ? ' in time' : ''}, so their card authorisation was released and the dates are free again. It doesn’t count against your response rate.`,
      };
    case 'DATES_TAKEN':
      return {
        title: notAhead,
        text: `${guest}’s payment came through after the dates were booked by someone else, so it was given back. Nothing changes for you.`,
      };
    case 'CAR_UNAVAILABLE':
      return {
        title: notAhead,
        text: `${guest}’s payment came through after the car was taken off Rento Vroom, so it was given back.`,
      };
    default:
      return { title: notAhead, text: `${guest} didn’t finish paying, so the dates are free again.` };
  }
}

type CancellationReason = NonNullable<NonNullable<Booking['cancellation']>['reason']>;

/** Why support cancelled, for the Host. */
const SUPPORT_REASONS: Partial<Record<CancellationReason, string>> = {
  GUEST_NO_SHOW: ' as a guest no-show',
  HOST_NO_SHOW: ' because the car wasn’t handed over',
  HOST_CANCELLED: ' for you',
  GUEST_CANCELLED: ' for the guest',
};

/**
 * The Host's share of a fee kept, and when it's paid: as its own payout, from its scheduled time (24 hours
 * after the trip's start), or kept from a trip payout already sent.
 */
function keptShareWords(shareCents: number, payout: Booking['payout']): string {
  const share = formatNzd(shareCents);
  if (payout?.type === 'CANCELLATION_FEE') {
    if (payout.status === 'PAID' && payout.paidAt)
      return `Your share of the fee kept, ${share}, was paid to your Stripe account on ${formatNzDate(payout.paidAt)}.`;
    if (payout.scheduledFor)
      return `Your share of the fee kept, ${share}, is paid on its own, from ${formatNzDateTime(payout.scheduledFor)}.`;
  }
  if (payout?.type === 'TRIP' && payout.status === 'PAID')
    return `The trip’s payout was already sent: you keep ${share} of it, your share of the fee kept.`;
  return `Your share of the fee kept, ${share}, is paid on its own, 24 hours after the trip’s start.`;
}

/** Who cancelled, what the guest got back, and what it means for the Host's money (plan §8.2). */
function cancelledWords(booking: Booking, guest: string): string {
  const cancellation = booking.cancellation;
  const reason = cancellation?.reason ? (SUPPORT_REASONS[cancellation.reason] ?? '') : '';
  const refunded = cancellation?.refundCents
    ? `, and ${guest} was refunded ${formatNzd(cancellation.refundCents)}`
    : '';
  const who =
    cancellation?.by === 'GUEST'
      ? `${guest} cancelled.`
      : cancellation?.by === 'HOST'
        ? `You cancelled, and ${guest} was refunded in full.`
        : `Rento Vroom support cancelled this booking${reason}${refunded}.`;
  const share = cancellation?.hostShareCents
    ? ` ${keptShareWords(cancellation.hostShareCents, booking.payout)}`
    : '';
  const fee = cancellation?.hostFeeCents
    ? ` A ${formatNzd(cancellation.hostFeeCents)} Host cancellation fee comes off your next payout.`
    : '';
  return `${who}${share}${fee}`;
}

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
    case 'EXPIRED': {
      const { title, text } = expiredWords(booking, guest);
      return banner(title, text, Hourglass);
    }
    case 'CANCELLED':
      return banner('Cancelled', cancelledWords(booking, guest), Undo2);
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
  const payout = booking.payout;
  // A cancelled booking: the kept share's payout, what was paid or is owed, refunds and any Host fee.
  const showMoney =
    !ended ||
    (booking.status === 'CANCELLED' &&
      Boolean(
        payout?.earnings ||
        payout?.status ||
        payout?.paidCents !== undefined ||
        payout?.owed ||
        payout?.refunds?.length,
      ));

  return (
    <div className="grid gap-8">
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
      {booking.status === 'ACTIVE' && (
        <ActiveTripPanel booking={booking} base={`/host/bookings/${booking.ref}`} />
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="grid gap-6">
          <HandoverCard booking={booking} base={`/host/bookings/${booking.ref}`} />
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
          <DetailCard title="Fuel and kilometres" icon={Fuel}>
            <BookedTermsDetails terms={booking.terms} />
          </DetailCard>
          {booking.protectionPlan && (
            <DetailCard title="Protection" icon={ShieldCheck}>
              <ProtectionDetails plan={booking.protectionPlan} />
            </DetailCard>
          )}
        </div>
        <div className="grid gap-6 xl:sticky xl:top-24">
          {/* A declined or expired booking paid nothing; a cancelled one can still pay or cost the Host. */}
          {payout && showMoney && (
            <DetailCard
              title={booking.status === 'PENDING' ? 'What you’d earn' : 'What you earn'}
              icon={Coins}
            >
              {/* Once confirmed, what it earned as the earnings page counts it; before, the trip's payout. */}
              {payout.earnings ? (
                <Earned earnings={payout.earnings} />
              ) : (
                <dl className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-semibold text-ink">Your payout</dt>
                    <dd className="text-lg font-semibold text-ink tabular-nums">
                      NZ{formatNzd(payout.hostPayoutCents)}
                    </dd>
                  </div>
                  {/* As on the payout and its email (plan §8.1, item 22): the commission with the GST in it. */}
                  <div className="flex items-baseline justify-between gap-4 text-muted">
                    <dt>Platform commission</dt>
                    <dd className="text-right tabular-nums">
                      {formatNzd(payout.commissionCents)}
                      <span className="block text-xs">incl. {formatNzd(payout.commissionGstCents)} GST</span>
                    </dd>
                  </div>
                </dl>
              )}
              {!ended && (
                <dl className="mt-2 grid gap-2">
                  <div className="flex items-baseline justify-between gap-4 text-muted">
                    <dt>The guest pays</dt>
                    <dd className="tabular-nums">{formatNzd(booking.price.totalCents)}</dd>
                  </div>
                </dl>
              )}
              <PaidAndRefunded payout={payout} guest={guest} />
              <p className="mt-4 text-muted">
                {payoutStatusLine(payout) ??
                  (ended
                    ? 'Nothing more is paid for this booking.'
                    : 'Paid to your Stripe account 24 hours after the trip starts, then to your bank on Stripe’s payout schedule.')}
              </p>
              <Link to="/host/earnings" className="link-underline mt-2 inline-block font-medium text-primary">
                Earnings and payouts
              </Link>
            </DetailCard>
          )}
          <ExtraCharges booking={booking} viewer="HOST" />
          <Card className="grid justify-items-start gap-3 p-5 text-sm sm:p-6">
            <ReviewLink booking={booking} base={`/host/bookings/${booking.ref}`} />
            <MessageLink booking={booking} name={booking.guest.firstName} />
            {booking.actions.cancel && (
              <Button variant="secondary" onClick={() => setCancelling(true)}>
                Cancel booking
              </Button>
            )}
            <ReportIncidentLink booking={booking} />
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
      <HostShell>
        <RequireSignedIn fallback={<BookingPageSkeleton />}>
          {() => <HostBooking key={ref} bookingRef={ref} />}
        </RequireSignedIn>
      </HostShell>
    </Container>
  );
}
