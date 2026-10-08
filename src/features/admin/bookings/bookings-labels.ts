import type {
  AdminBookingDetail,
  AdminCancelRequest,
  AdminPayment,
  AdminRefundRequest,
  Booking,
} from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';

/* Plain-English labels and copy for a booking's record in the staff portal (plan §12.6). */

type Refund = AdminPayment['refunds'][number];
type ExtraCharge = AdminBookingDetail['extraCharges'][number];
type IncidentRow = AdminBookingDetail['incidents'][number];

export const REFUND_STATUS: Record<Refund['status'], StatusLabel> = {
  PENDING: { label: 'Pending', tone: 'waiting' },
  SUCCEEDED: { label: 'Refunded', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
};

export const FUNDED_BY: Record<AdminRefundRequest['fundedBy'], string> = {
  PLATFORM: 'Goodwill from Rento Vroom',
  HOST: 'Comes off the Host’s payout',
};

/** Who paid for a refund, on the booking's record. */
export const REFUND_FUNDER: Record<AdminRefundRequest['fundedBy'], string> = {
  PLATFORM: 'Funded by Rento Vroom',
  HOST: 'Funded by the Host',
};

export const EXTRA_CHARGE_TYPE: Record<ExtraCharge['type'], string> = {
  EXTRA_KM: 'Extra kilometres',
  FUEL: 'Fuel or charge',
  CLEANING: 'Cleaning',
  LATE_RETURN: 'Late return',
  DAMAGE: 'Damage',
  TOLL: 'Toll',
  FINE: 'Fine',
  OTHER: 'Other',
};

export const EXTRA_CHARGE_STATUS: Record<ExtraCharge['status'], StatusLabel> = {
  PENDING: { label: 'Waiting for payment', tone: 'waiting' },
  SUCCEEDED: { label: 'Paid', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

/** A case's status in staff words: the Guest and Host see "Waiting for you" where staff wait for them. */
export const CASE_STATUS: Record<IncidentRow['status'], StatusLabel> = {
  OPEN: { label: 'Open', tone: 'waiting' },
  INVESTIGATING: { label: 'Investigating', tone: 'waiting' },
  AWAITING_RESPONSE: { label: 'Waiting on them', tone: 'neutral' },
  RESOLVED: { label: 'Resolved', tone: 'positive' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

export const CANCELLED_BY: Record<NonNullable<Booking['cancellation']>['by'], string> = {
  GUEST: 'the Guest',
  HOST: 'the Host',
  SUPPORT: 'Rento Vroom support',
};

export const CANCEL_REASONS: { value: AdminCancelRequest['reason']; label: string; description: string }[] = [
  {
    value: 'GUEST_NO_SHOW',
    label: 'The Guest didn’t show',
    description:
      'Treated as a Guest cancellation at the start time: the Guest is refunded under the cancellation policy, and the Host gets their share of what’s kept.',
  },
  {
    value: 'HOST_NO_SHOW',
    label: 'The Host didn’t show',
    description:
      'Treated as a Host cancellation: the Guest gets a full refund, and the Host cancellation fee comes off the Host’s next payout.',
  },
  {
    value: 'PLATFORM',
    label: 'Platform cancellation',
    description: 'Rento Vroom cancels: the Guest gets a full refund, and the Host pays no fee.',
  },
];

/** The status edits staff can make (plan §8.2), with what each sets off. */
export const STATUS_EDITS = {
  CONFIRMED: {
    to: 'ACTIVE',
    button: 'Mark trip as started',
    title: 'Mark the trip as started?',
    description:
      'For a trip that began without a check-in in the app. The booking shows as on trip, and the Host’s trip payout, held until check-in, can go out.',
    done: 'Trip marked as started',
  },
  ACTIVE: {
    to: 'COMPLETED',
    button: 'Mark trip as completed',
    title: 'Mark the trip as completed?',
    description:
      'The trip ends as if it was checked out in the app: we ask the Guest and Host for reviews, check the kilometres driven against the allowance, and count the trip for both of them.',
    done: 'Trip marked as completed',
  },
} as const;

/** The refund issued last on the booking, to say how it went. */
export function latestRefund(detail: AdminBookingDetail): Refund | undefined {
  return detail.payments
    .flatMap((payment) => payment.refunds)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0];
}
