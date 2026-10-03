import type { NotificationItem } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser } from '@/test/utils';

const MINUTE = 60_000;

/** A notification, `minutesAgo` old. */
export const notification = (
  overrides: Partial<NotificationItem> = {},
  minutesAgo = 5,
): NotificationItem => ({
  id: 'n1',
  type: 'BOOKING_CONFIRMED',
  title: 'You’re booked',
  body: 'Your trip in the 2022 Toyota RAV4 is confirmed.',
  link: '/trips/RV-7K2Q9M',
  createdAt: new Date(Date.now() - minutesAgo * MINUTE).toISOString(),
  read: false,
  ...overrides,
});

/** `count` notifications, n1 the newest, each a minute older than the one before. */
export const notifications = (count: number, overrides: Partial<NotificationItem> = {}) =>
  Array.from({ length: count }, (_, index) =>
    notification({ id: `n${index + 1}`, title: `Notification ${index + 1}`, ...overrides }, index + 1),
  );

/**
 * A stand-in for the notifications API that keeps what's read and deleted, so a refetch after a change
 * shows the same as the screen. Pages use the offset as the cursor.
 */
export function mockNotificationsApi(initial: NotificationItem[]) {
  let items = initial;
  const counts = () => ({ unreadCount: items.filter((item) => !item.read).length, total: items.length });
  const sent = mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /notifications': {
        const limit = Number(request.query.get('limit') ?? 30);
        const start = Number(request.query.get('cursor') ?? 0);
        const shown = request.query.get('unread') === 'true' ? items.filter((item) => !item.read) : items;
        const end = start + limit;
        return {
          status: 200,
          body: {
            notifications: shown.slice(start, end),
            ...counts(),
            ...(end < shown.length && { nextCursor: String(end) }),
          },
        };
      }
      case 'POST /notifications/read': {
        const ids = (request.body as { ids?: string[] }).ids;
        items = items.map((item) => (!ids || ids.includes(item.id) ? { ...item, read: true } : item));
        return { status: 200, body: counts() };
      }
      case 'POST /notifications/unread': {
        const { ids } = request.body as { ids: string[] };
        items = items.map((item) => (ids.includes(item.id) ? { ...item, read: false } : item));
        return { status: 200, body: counts() };
      }
      case 'POST /notifications/delete': {
        const target = request.body as { ids: string[] } | { read: true };
        const before = items.length;
        items = items.filter((item) => ('ids' in target ? !target.ids.includes(item.id) : !item.read));
        return { status: 200, body: { deleted: before - items.length, ...counts() } };
      }
      default:
        return undefined;
    }
  });
  return sent;
}
