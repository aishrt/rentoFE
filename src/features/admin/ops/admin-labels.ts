import type { AdminBookingRow, AdminPayment, AdminPayout, AdminUserRow, StaffTicketRow } from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';

/* Plain-English labels and badge tones for the statuses staff see (plan §12.6). */

export const BOOKING_STATUS: Record<AdminBookingRow['status'], StatusLabel> = {
  PAYMENT_PENDING: { label: 'Checkout', tone: 'neutral' },
  PENDING: { label: 'Requested', tone: 'waiting' },
  CONFIRMED: { label: 'Confirmed', tone: 'positive' },
  ACTIVE: { label: 'On trip', tone: 'positive' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'ended' },
  DECLINED: { label: 'Declined', tone: 'ended' },
  EXPIRED: { label: 'Expired', tone: 'ended' },
};

export const PAYMENT_STATUS: Record<AdminPayment['status'], StatusLabel> = {
  PENDING: { label: 'Pending', tone: 'waiting' },
  AUTHORISED: { label: 'Authorised', tone: 'waiting' },
  SUCCEEDED: { label: 'Paid', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
  REFUNDED: { label: 'Refunded', tone: 'neutral' },
  PARTIALLY_REFUNDED: { label: 'Part refunded', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYMENT_TYPE: Record<AdminPayment['type'], string> = {
  BOOKING: 'Booking',
  EXTRA_CHARGE: 'Extra charge',
};

export const PAYOUT_STATUS: Record<AdminPayout['status'], StatusLabel> = {
  SCHEDULED: { label: 'Scheduled', tone: 'waiting' },
  // A wait, not a failure (PayoutStatusBadge gives it a clock).
  HELD: { label: 'Held', tone: 'neutral' },
  PAID: { label: 'Paid', tone: 'positive' },
  FAILED: { label: 'Failed', tone: 'ended' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
};

export const PAYOUT_TYPE: Record<AdminPayout['type'], string> = {
  TRIP: 'Trip',
  CANCELLATION_FEE: 'Cancellation fee',
  EXTRA_CHARGE: 'Extra charge',
};

export const HOLD_REASON: Record<NonNullable<AdminPayout['holdReason']>, string> = {
  INCIDENT: 'An incident is open',
  DISPUTE: 'A card dispute is open',
  PAYOUT_SETUP: 'Payout setup unfinished',
  TRIP_NOT_STARTED: 'Waiting for check-in',
  SUSPENDED: 'Host suspended',
  MANUAL: 'Held by staff',
};

export const USER_STATUS: Record<AdminUserRow['status'], StatusLabel> = {
  ACTIVE: { label: 'Active', tone: 'positive' },
  SUSPENDED: { label: 'Suspended', tone: 'ended' },
};

export const ROLE_LABELS: Record<AdminUserRow['roles'][number], string> = {
  GUEST: 'Guest',
  HOST: 'Host',
  ADMIN: 'Admin',
  SUPPORT: 'Support',
};

export const VERIFICATION_LABELS: Record<AdminUserRow['identityStatus'], string> = {
  NONE: 'Not verified',
  PENDING: 'In review',
  APPROVED: 'Verified',
  REJECTED: 'Rejected',
};

export const TICKET_STATUS: Record<StaffTicketRow['status'], StatusLabel> = {
  OPEN: { label: 'Open', tone: 'waiting' },
  PENDING: { label: 'Waiting on them', tone: 'neutral' },
  RESOLVED: { label: 'Resolved', tone: 'positive' },
};

export const TICKET_CATEGORY: Record<StaffTicketRow['category'], string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  ACCOUNT: 'Account',
  HOSTING: 'Hosting',
  SAFETY: 'Safety',
  PRIVACY: 'Privacy',
  OTHER: 'Other',
};

/** What each risk flag means, for the risk queue (plan §14). */
export const RISK_FLAG_LABELS: Record<string, string> = {
  DUPLICATE_LICENCE: 'Licence used on another account',
  HOST_CANCELLATIONS: 'Repeated Host cancellations',
  FAILED_PAYMENTS: 'Many failed payments',
  BOOKING_VELOCITY: 'Many bookings in a day',
  CARD_COUNTRY: 'Card from another country',
  RADAR_WARNING: 'Stripe Radar warning',
  REPEATED_REPORTS: 'Reported by several members',
};

export const riskFlagLabel = (code: string) =>
  RISK_FLAG_LABELS[code] ?? code.replaceAll('_', ' ').toLowerCase();

/** "2026-10-07": an NZ day for date inputs and report ranges. */
export function nzDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(date);
}

/**
 * Whole cents for an amount staff type in dollars ("45.50", "$45", "1,200"), or null when it isn't one.
 * Worked out on the digits, so 0.29 is 29 cents rather than 28.999….
 */
export function dollarsToCents(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/^\$\s*/, '')
    .replaceAll(',', '');
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}
