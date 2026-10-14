import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { applyNotificationEvent, notificationsQueryKey } from './notification-keys';

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const invalidated = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { queryClient, invalidated };
}

describe('applyNotificationEvent', () => {
  it('refreshes the bell, and the booking, its lists, handover and payments for booking news', () => {
    for (const type of ['BOOKING_CANCELLED', 'BOOKING_CONFIRMED', 'REFUND_ISSUED', 'REQUEST_WITHDRAWN']) {
      const { queryClient, invalidated } = setup();
      applyNotificationEvent(queryClient, { id: 'n1', type, title: 'News' });
      expect(invalidated()).toEqual([
        notificationsQueryKey,
        ['booking'],
        ['bookings'],
        ['handover'],
        ['me', 'payments'],
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
