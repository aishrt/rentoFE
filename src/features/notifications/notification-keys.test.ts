import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { refreshHostDashboard } from '@/features/host/host-api';
import { applyNotificationEvent, notificationsQueryKey } from './notification-keys';

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const invalidated = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { queryClient, invalidated };
}

/** The keys refreshHostDashboard refreshes after a Host's own change to a booking. */
function hostDashboardKeys() {
  const { queryClient, invalidated } = setup();
  refreshHostDashboard(queryClient);
  return invalidated();
}

describe('applyNotificationEvent', () => {
  it('refreshes the bell, the booking, its lists, handover, payments and Host dashboard for booking news', () => {
    for (const type of ['BOOKING_CANCELLED', 'BOOKING_CONFIRMED', 'REFUND_ISSUED', 'REQUEST_WITHDRAWN']) {
      const { queryClient, invalidated } = setup();
      applyNotificationEvent(queryClient, { id: 'n1', type, title: 'News' });
      expect(invalidated()).toEqual([
        notificationsQueryKey,
        ['booking'],
        ['bookings'],
        ['handover'],
        ['me', 'payments'],
        // What refreshHostDashboard refreshes, written out.
        ...hostDashboardKeys(),
      ]);
    }
  });

  it('refreshes the support requests for a reply from support', () => {
    const { queryClient, invalidated } = setup();
    applyNotificationEvent(queryClient, { type: 'SUPPORT_TICKET_REPLY', title: 'Support replied' });
    expect(invalidated()).toEqual([notificationsQueryKey, ['support', 'tickets']]);
  });

  it('refreshes only the bell for anything else', () => {
    const { queryClient, invalidated } = setup();
    applyNotificationEvent(queryClient, { type: 'NEW_MESSAGE', read: true });
    applyNotificationEvent(queryClient, undefined);
    expect(invalidated()).toEqual([notificationsQueryKey, notificationsQueryKey]);
  });
});
