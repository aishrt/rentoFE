import {
  CalendarClock,
  Coins,
  CreditCard,
  History,
  LifeBuoy,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import type { AdminBookingDetail, AdminPayment, AdminPayout, Booking, LineItem } from '@/api/types';
import { PayoutFailure, PayoutStatusBadge } from '@/features/admin/finance/payout-status';
import { OpenCaseButton } from '@/features/admin/operations/open-case-dialog';
import { EmailAddress } from '@/features/admin/ops/email-address';
import {
  BOOKING_STATUS,
  HOLD_REASON,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYOUT_TYPE,
  TICKET_STATUS,
} from '@/features/admin/ops/admin-labels';
import {
  formatNzDateTime,
  formatNzDateTimeWithYear,
  formatNzd,
  refundSentence,
} from '@/features/booking/booking-format';
import { DetailCard, ProtectionDetails, StatusBadge, TripStops } from '@/features/booking/booking-parts';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import { incidentTypeLabel } from '@/features/incidents/incident-labels';
import { threadPath } from './bookings-api';
import {
  CANCELLED_BY,
  CASE_STATUS,
  EXTRA_CHARGE_STATUS,
  EXTRA_CHARGE_TYPE,
  REFUND_FUNDER,
  REFUND_STATUS,
} from './bookings-labels';

/* The parts of a booking's record in the staff portal (plan §12.6): everything staff need on one page. */

const CANCEL_REASON: Record<NonNullable<NonNullable<Booking['cancellation']>['reason']>, string> = {
  GUEST_CANCELLED: 'Guest cancelled',
  HOST_CANCELLED: 'Host cancelled',
  REQUEST_WITHDRAWN: 'Request withdrawn',
  GUEST_NO_SHOW: 'Guest no-show',
  HOST_NO_SHOW: 'Host no-show',
  PLATFORM: 'Platform cancellation',
};

/** When and where, the protection, the price lines and total, and any cancellation. */
export function TripCard({ booking }: { booking: Booking }) {
  const cancellation = booking.cancellation;
  return (
    <DetailCard title="Trip" icon={CalendarClock}>
      <div className="grid gap-6">
        <TripStops booking={booking} />
        {cancellation && (
          <div className="rounded-inner border border-line bg-ink/3 p-4">
            <p className="font-semibold text-ink">
              Cancelled by {CANCELLED_BY[cancellation.by]} {formatNzDateTimeWithYear(cancellation.at)}
              {cancellation.reason && ` · ${CANCEL_REASON[cancellation.reason]}`}
            </p>
            {refundSentence(cancellation) && <p className="mt-1">{refundSentence(cancellation)}</p>}
            {Boolean(cancellation.hostFeeCents) && (
              <p className="mt-1">Host cancellation fee {formatNzd(cancellation.hostFeeCents ?? 0)}.</p>
            )}
          </div>
        )}
        <div className="grid gap-2">
          <h3 className="flex items-center gap-2 font-semibold text-ink">
            <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
            Protection
          </h3>
          {booking.protectionPlan ? (
            <ProtectionDetails plan={booking.protectionPlan} />
          ) : (
            <p className="text-muted">No protection plan.</p>
          )}
        </div>
        <div className="border-t border-line pt-5">
          <PriceBreakdown lineItems={booking.lineItems as LineItem[]} price={booking.price} />
        </div>
      </div>
    </DetailCard>
  );
}

function Party({ role, person }: { role: 'Guest' | 'Host'; person: AdminBookingDetail['guest'] }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="eyebrow text-muted">{role}</p>
      <Link
        to={`/admin/users/${person.id}`}
        className="justify-self-start rounded-inner font-semibold text-primary hover:underline"
      >
        {person.name}
      </Link>
      {person.email && (
        <a
          href={`mailto:${person.email}`}
          className="justify-self-start rounded-inner wrap-anywhere text-primary hover:underline"
        >
          <EmailAddress email={person.email} />
        </a>
      )}
      {person.phone ? (
        <a
          href={`tel:${person.phone}`}
          className="justify-self-start rounded-inner text-primary hover:underline"
        >
          {person.phone}
        </a>
      ) : (
        <p className="text-muted">No mobile number</p>
      )}
    </div>
  );
}

export function PartiesCard({ detail }: { detail: AdminBookingDetail }) {
  return (
    <DetailCard title="Guest and Host" icon={Users}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
        <Party role="Guest" person={detail.guest} />
        <Party role="Host" person={detail.host} />
      </div>
    </DetailCard>
  );
}

/** Every status the booking has had, oldest first, with who changed it and why when it was by hand. */
export function StatusHistoryCard({ history }: { history: AdminBookingDetail['statusHistory'] }) {
  return (
    <DetailCard title="Status history" icon={History}>
      {history.length === 0 ? (
        <p className="text-muted">No changes yet.</p>
      ) : (
        <ol className="grid gap-4 border-l border-line pl-4">
          {history.map((change, index) => (
            <li key={`${change.at}-${index}`} className="relative grid gap-1">
              <span
                aria-hidden="true"
                className="absolute top-1.5 -left-5.5 size-2.5 rounded-full bg-primary ring-4 ring-surface"
              />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <StatusBadge status={BOOKING_STATUS[change.status]} />
                <time dateTime={change.at} className="text-muted">
                  {formatNzDateTimeWithYear(change.at)}
                </time>
              </div>
              {change.reason && <p className="break-words">{change.reason}</p>}
            </li>
          ))}
        </ol>
      )}
    </DetailCard>
  );
}

function Refunds({ refunds }: { refunds: AdminPayment['refunds'] }) {
  return (
    <div className="mt-3 border-t border-line pt-3">
      <h4 className="eyebrow text-muted">Refunds</h4>
      <ul className="mt-2 grid gap-3">
        {refunds.map((refund, index) => (
          <li key={`${refund.at}-${index}`} className="grid gap-0.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-ink tabular-nums">{formatNzd(refund.amountCents)}</span>
              <StatusBadge status={REFUND_STATUS[refund.status]} />
            </div>
            <p className="text-muted">
              {REFUND_FUNDER[refund.fundedBy]} · {formatNzDateTime(refund.at)}
            </p>
            <p className="break-words">{refund.reason}</p>
            {refund.failureReason && <p className="text-danger">{refund.failureReason}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The Guest's payments, each with its refunds and any card dispute. */
export function PaymentsCard({
  payments,
  refundableCents,
}: {
  payments: AdminPayment[];
  refundableCents: number;
}) {
  return (
    <DetailCard title="Payments" icon={CreditCard}>
      {payments.length === 0 ? (
        <p className="text-muted">No payments yet.</p>
      ) : (
        <ul className="grid gap-4">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-inner border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">
                  {PAYMENT_TYPE[payment.type]} ·{' '}
                  <span className="tabular-nums">{formatNzd(payment.amountCents)}</span>
                </h3>
                <StatusBadge status={PAYMENT_STATUS[payment.status]} />
              </div>
              <p className="mt-1 text-muted">
                {formatNzDateTimeWithYear(payment.createdAt)}
                {payment.method && ` · ${payment.method}`}
                {payment.refundedCents > 0 && ` · ${formatNzd(payment.refundedCents)} refunded`}
              </p>
              {payment.failureReason && <p className="mt-2 text-danger">{payment.failureReason}</p>}
              {payment.dispute && (
                <p className="mt-2 text-danger">
                  Card dispute: {payment.dispute.status.replaceAll('_', ' ').toLowerCase()}
                  {payment.dispute.reason &&
                    ` (${payment.dispute.reason.replaceAll('_', ' ').toLowerCase()})`}
                  {payment.dispute.dueBy && `. Evidence due ${formatNzDateTime(payment.dispute.dueBy)}`}.
                </p>
              )}
              {payment.refunds.length > 0 && <Refunds refunds={payment.refunds} />}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-muted">
        {refundableCents > 0
          ? `${formatNzd(refundableCents)} can still be refunded.`
          : 'Nothing left to refund.'}
      </p>
    </DetailCard>
  );
}

function payoutTiming(payout: AdminPayout): string {
  if (payout.paidAt) return `Paid ${formatNzDateTimeWithYear(payout.paidAt)}`;
  if (payout.status === 'CANCELLED') return 'Not paid';
  return `Scheduled for ${formatNzDateTimeWithYear(payout.scheduledFor)}`;
}

/** What the Host is paid for the booking, and anything holding it. */
export function PayoutsCard({ payouts }: { payouts: AdminPayout[] }) {
  return (
    <DetailCard title="Payouts" icon={Coins}>
      {payouts.length === 0 ? (
        <p className="text-muted">No payouts yet.</p>
      ) : (
        <ul className="grid gap-4">
          {payouts.map((payout) => (
            <li key={payout.id} className="rounded-inner border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-ink">
                  {PAYOUT_TYPE[payout.type]} ·{' '}
                  <span className="tabular-nums">{formatNzd(payout.amountCents)}</span>
                </h3>
                <PayoutStatusBadge status={payout.status} />
              </div>
              <p className="mt-1 text-muted">{payoutTiming(payout)}</p>
              {payout.status === 'HELD' && payout.holdReason && (
                <p className="mt-1">Held: {HOLD_REASON[payout.holdReason]}</p>
              )}
              {payout.deductedCents > 0 && (
                <p className="mt-1">
                  Deductions <span className="tabular-nums">{formatNzd(payout.deductedCents)}</span>
                </p>
              )}
              <PayoutFailure payout={payout} className="mt-2" />
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}

/** Charges after the trip: extra kilometres, fuel, cleaning, tolls and the like. */
export function ExtraChargesCard({ charges }: { charges: AdminBookingDetail['extraCharges'] }) {
  return (
    <DetailCard title="Extra charges" icon={ReceiptText}>
      {charges.length === 0 ? (
        <p className="text-muted">No extra charges.</p>
      ) : (
        <ul className="grid gap-3">
          {charges.map((charge) => (
            <li key={charge.id} className="grid gap-0.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-ink">
                  {EXTRA_CHARGE_TYPE[charge.type]} ·{' '}
                  <span className="tabular-nums">{formatNzd(charge.amountCents)}</span>
                </span>
                <StatusBadge status={EXTRA_CHARGE_STATUS[charge.status]} />
              </div>
              <p className="break-words">{charge.description}</p>
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}

function MessagesLink({ to, from }: { to: string; from: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 justify-self-start rounded-inner font-medium text-primary hover:underline"
    >
      <MessagesSquare aria-hidden="true" className="size-4" />
      Messages
      <span className="sr-only"> (opened from {from})</span>
    </Link>
  );
}

/**
 * The booking's incidents and support tickets. Staff open a booking's messages only from one of them, or a
 * report (plan §6.2), so each has its own way in.
 */
export function CasesCard({
  bookingRef,
  incidents,
  tickets,
}: {
  bookingRef: string;
  incidents: AdminBookingDetail['incidents'];
  tickets: AdminBookingDetail['tickets'];
}) {
  return (
    <DetailCard title="Incidents and tickets" icon={LifeBuoy}>
      {incidents.length === 0 && tickets.length === 0 ? (
        <p className="text-muted">No incidents or support tickets.</p>
      ) : (
        <ul className="grid gap-3">
          {incidents.map((incident) => (
            <li
              key={incident.ref}
              aria-label={`Incident ${incident.ref}`}
              className="grid gap-1.5 rounded-inner border border-line p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/admin/incidents/${incident.ref}`}
                  className="rounded-inner font-semibold text-primary hover:underline"
                >
                  {incident.ref}
                </Link>
                <StatusBadge status={CASE_STATUS[incident.status]} />
              </div>
              <p>Incident: {incidentTypeLabel(incident.type)}</p>
              <MessagesLink
                to={threadPath(bookingRef, 'INCIDENT', incident.ref)}
                from={`incident ${incident.ref}`}
              />
            </li>
          ))}
          {tickets.map((ticket) => (
            <li
              key={ticket.ref}
              aria-label={`Ticket ${ticket.ref}`}
              className="grid gap-1.5 rounded-inner border border-line p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  to={`/admin/support/${ticket.ref}`}
                  className="rounded-inner font-semibold text-primary hover:underline"
                >
                  {ticket.ref}
                </Link>
                <StatusBadge status={TICKET_STATUS[ticket.status]} />
              </div>
              <p className="break-words">Support ticket: {ticket.subject}</p>
              <MessagesLink to={threadPath(bookingRef, 'TICKET', ticket.ref)} from={`ticket ${ticket.ref}`} />
            </li>
          ))}
        </ul>
      )}
      {/* A case the Guest or Host hasn't reported, such as a toll notice or damage found later (plan §3). */}
      <OpenCaseButton bookingRef={bookingRef} className="mt-4" />
      <p className="mt-4 text-xs text-muted">
        Staff open a booking’s messages only from a report, incident or ticket about it. Each opening is
        recorded in the audit log.
      </p>
    </DetailCard>
  );
}
