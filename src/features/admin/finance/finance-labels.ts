import type { AdminPayment } from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';
import type { AdminRefundRow, PaymentsTabView } from './finance-api';

/* Plain-English labels for payments, refunds and payouts, beside those in ops/admin-labels. */

type Refund = AdminPayment['refunds'][number];

export const PAYMENT_VIEWS: readonly { value: PaymentsTabView; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'failed', label: 'Failed' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'refunds-failed', label: 'Failed refunds' },
  { value: 'unpaid-charges', label: 'Unpaid extra charges' },
];

/** Why a refund was made. Refunds recorded before this was kept have none. */
export const REFUND_KIND: Record<NonNullable<AdminRefundRow['kind']>, string> = {
  CANCELLATION: 'Cancellation',
  LATE_PAYMENT: 'Paid after the booking ended',
  STAFF: 'Issued by staff',
};

export const REFUND_STATUS: Record<Refund['status'], StatusLabel> = {
  PENDING: { label: 'Sending', tone: 'waiting' },
  SUCCEEDED: { label: 'Refunded', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
};

/** Who pays for a refund: the platform, or the Host from their payout. */
export const FUNDED_BY: Record<Refund['fundedBy'], string> = {
  PLATFORM: 'Paid by Rento Vroom',
  HOST: 'Paid by the Host',
};

/** Stripe's words, such as "needs_response" or "product_not_received", read as "Needs response". */
export function stripeText(value: string): string {
  const words = value.replaceAll('_', ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
