import type { Booking } from '@/api/types';
import type { toast } from '@/components/ui/toast';

/**
 * What to tell a Host who has just accepted a request: it's confirmed, or, while the Guest's identity check
 * is still in review, it will be once that's approved (plan §8.2). The arguments for `toast()`.
 */
export function acceptedToast(
  accepted: Pick<Booking, 'status'>,
  guestName: string,
): Parameters<typeof toast> {
  return accepted.status === 'CONFIRMED'
    ? [
        'Booking accepted',
        { description: `${guestName}’s trip is confirmed, and they’ve been sent your pick-up details.` },
      ]
    : [
        'Request accepted',
        {
          description: `We’re still checking ${guestName}’s identity. The booking is confirmed as soon as that’s approved.`,
          tone: 'neutral',
        },
      ];
}
