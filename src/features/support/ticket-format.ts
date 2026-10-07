import type { SupportTicketSummary } from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';

/** Where a support request stands, in the user's words. */
export const TICKET_STATUS: Record<SupportTicketSummary['status'], StatusLabel> = {
  OPEN: { label: 'With our team', tone: 'waiting' },
  PENDING: { label: 'Waiting for your reply', tone: 'neutral' },
  RESOLVED: { label: 'Resolved', tone: 'positive' },
};

export const TICKET_CATEGORY: Record<SupportTicketSummary['category'], string> = {
  BOOKING: 'Booking',
  PAYMENT: 'Payment',
  ACCOUNT: 'Account',
  HOSTING: 'Hosting',
  SAFETY: 'Safety',
  PRIVACY: 'Privacy',
  OTHER: 'Other',
};
