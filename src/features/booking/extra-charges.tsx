import { CreditCard, ListPlus } from 'lucide-react';
import { Link } from 'react-router';
import type { Booking, BookingExtraCharge } from '@/api/types';
import { Button } from '@/components/ui/button';
import { formatNzDate, formatNzd, type StatusLabel } from './booking-format';
import { DetailCard, StatusBadge } from './booking-parts';

/*
 * Charges after the trip (plan §8.1, items 6 and 11), on the Guest's trip page and the Host's booking page:
 * extra kilometres worked out at check-out, and fuel, cleaning, damage, tolls or fines from a resolved
 * incident. Each is charged to the Guest's saved card; one it didn't cover has a link for the Guest to pay.
 */

const TYPE_LABELS: Record<BookingExtraCharge['type'], string> = {
  EXTRA_KM: 'Extra kilometres',
  FUEL: 'Fuel or charge',
  CLEANING: 'Cleaning',
  LATE_RETURN: 'Late return',
  DAMAGE: 'Damage',
  TOLL: 'Toll',
  FINE: 'Fine',
  OTHER: 'Other',
};

const STATUS_LABELS: Record<BookingExtraCharge['status'], StatusLabel> = {
  PENDING: { label: 'Being charged', tone: 'waiting' },
  PAID: { label: 'Paid', tone: 'positive' },
  UNPAID: { label: 'Not paid yet', tone: 'ended' },
  FAILED: { label: 'Didn’t go through', tone: 'ended' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

function ChargeNote({
  charge,
  viewer,
  guest,
}: {
  charge: BookingExtraCharge;
  viewer: 'GUEST' | 'HOST';
  guest: string;
}) {
  if (charge.status === 'UNPAID') {
    return viewer === 'GUEST' ? (
      <div className="grid justify-items-start gap-3">
        <p>Your saved card didn’t go through. Pay it here with another card, Apple Pay or Google Pay.</p>
        {charge.payPath && (
          <Button asChild>
            <Link to={charge.payPath}>
              <CreditCard aria-hidden="true" />
              Pay {formatNzd(charge.amountCents)}
            </Link>
          </Button>
        )}
      </div>
    ) : (
      <p className="text-muted">
        {guest}’s card didn’t go through, so we’ve sent them a link to pay. Your share follows once it’s paid.
      </p>
    );
  }
  if (charge.status === 'FAILED')
    return <p className="text-muted">We couldn’t collect this charge. Our team is looking into it.</p>;
  return null;
}

/** The booking's extra charges, oldest first, with what's still to pay. Nothing when there are none. */
export function ExtraCharges({ booking, viewer }: { booking: Booking; viewer: 'GUEST' | 'HOST' }) {
  const charges = booking.extraCharges ?? [];
  if (charges.length === 0) return null;
  return (
    <DetailCard title="Extra charges" icon={ListPlus}>
      <ul className="divide-y divide-line/70">
        {charges.map((charge) => (
          <li key={charge.id} className="grid gap-2 py-4 first:pt-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{TYPE_LABELS[charge.type]}</p>
                <p>{charge.description}</p>
              </div>
              <p className="font-semibold text-ink tabular-nums">{formatNzd(charge.amountCents)}</p>
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <StatusBadge status={STATUS_LABELS[charge.status]} />
              Added {formatNzDate(charge.addedAt)}
            </p>
            <ChargeNote charge={charge} viewer={viewer} guest={booking.guest.firstName} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        {viewer === 'GUEST'
          ? 'Charged to the card you booked with. Amounts include GST.'
          : 'Amounts include GST. Your share of each, after commission, is paid as its own payout.'}
      </p>
    </DetailCard>
  );
}
