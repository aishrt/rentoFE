import type { QueryClient, QueryKey } from '@tanstack/react-query';

/** Every notification query starts with this, so one invalidation refreshes the bell and the page alike. */
export const notificationsQueryKey = ['notifications'] as const;

/**
 * News about a booking: requested, accepted, declined, cancelled, refunded, paid, a check-in or check-out to
 * review, the trip under way, and the Host's payouts (sent, or payout setup done).
 */
const BOOKING_NEWS = /^(BOOKING|REQUEST|REFUND|PAYMENT|CHECK|TRIP|EXTRA_CHARGE|PAYOUT)(_|$)/;

/*
 * What booking news refreshes, by the start of each query's key: a booking (booking-api.ts) with its receipt,
 * the trips and bookings lists, a handover (handover-api.ts), the Guest's payment history (dashboard-api.ts),
 * and the Host's dashboard as refreshHostDashboard (host-api.ts) refreshes it: the to-do list, earnings,
 * payouts, cars and the all-cars calendar. Written out here so the always-loaded realtime connection doesn't
 * pull those pages' code into every page.
 */
const BOOKING_QUERIES: QueryKey[] = [
  ['booking'],
  ['bookings'],
  ['handover'],
  ['me', 'payments'],
  ['host', 'todo'],
  ['host', 'earnings'],
  ['host', 'payouts'],
  ['host', 'vehicles'],
  ['host', 'calendar'],
];
/** The user's support requests (support-api.ts), which a reply from support changes. */
const TICKETS_QUERY: QueryKey = ['support', 'tickets'];
/** The user's incident cases and each case page (incidents-api.ts), which a report or a staff update changes. */
const INCIDENTS_QUERY: QueryKey = ['incidents'];

/**
 * A live `notification` event (plan §7): the bell refreshes, and so does whatever on screen the news is
 * about, such as a trip the Host has just accepted or cancelled, so a page left open doesn't go stale.
 */
export function applyNotificationEvent(queryClient: QueryClient, payload: unknown) {
  void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  const type = (payload as { type?: unknown } | null | undefined)?.type;
  if (typeof type !== 'string') return;
  const refresh = BOOKING_NEWS.test(type)
    ? BOOKING_QUERIES
    : type.startsWith('SUPPORT_')
      ? [TICKETS_QUERY]
      : type.startsWith('INCIDENT_')
        ? [INCIDENTS_QUERY]
        : [];
  for (const queryKey of refresh) void queryClient.invalidateQueries({ queryKey });
}
