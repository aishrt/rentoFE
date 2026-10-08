import type { AdminReport, ModerationReview } from '@/api/types';
import type { StatusLabel } from '@/features/booking/booking-format';

/* Plain-English labels for moderation (plan §12.6). */

/** Why the member reported it: the reasons they choose from when reporting. */
export const REPORT_REASON: Record<string, string> = {
  SPAM: 'Spam',
  SCAM: 'Scam or fraud',
  HARASSMENT: 'Harassment',
  INAPPROPRIATE: 'Inappropriate content',
  CONTACT_DETAILS: 'Sharing contact details',
  FAKE: 'Fake or misleading',
  SAFETY: 'Safety concern',
  OTHER: 'Something else',
};

export const reportReasonLabel = (reason: string) =>
  REPORT_REASON[reason] ?? reason.replaceAll('_', ' ').toLowerCase();

/** What was reported. */
export const REPORT_TARGET: Record<AdminReport['targetType'], string> = {
  USER: 'Profile',
  MESSAGE: 'Message',
  REVIEW: 'Review',
  VEHICLE: 'Listing',
};

export const REPORT_STATUS: Record<AdminReport['status'], StatusLabel> = {
  OPEN: { label: 'Open', tone: 'waiting' },
  ACTIONED: { label: 'Action taken', tone: 'positive' },
  DISMISSED: { label: 'Dismissed', tone: 'neutral' },
};

export const REVIEW_DIRECTION: Record<ModerationReview['direction'], string> = {
  GUEST_TO_HOST: 'Guest reviewing their Host',
  HOST_TO_GUEST: 'Host reviewing their Guest',
};
