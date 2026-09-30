import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificationItem } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { NotificationBell } from './notification-bell';

afterEach(() => {
  vi.unstubAllGlobals();
});

const MINUTE = 60_000;

const item = (overrides: Partial<NotificationItem>): NotificationItem => ({
  id: 'n1',
  type: 'BOOKING_CONFIRMED',
  title: 'You’re booked',
  body: 'Your trip in the 2022 Toyota RAV4 is confirmed.',
  link: '/trips/RV-7K2Q9M',
  createdAt: new Date(Date.now() - 5 * MINUTE).toISOString(),
  read: false,
  ...overrides,
});

/** The API keeps what's read, so a refetch after marking shows the same as the screen. */
function mockNotifications(initial: NotificationItem[]) {
  let items = initial;
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'GET /notifications':
        return {
          status: 200,
          body: { notifications: items, unreadCount: items.filter((entry) => !entry.read).length },
        };
      case 'POST /notifications/read': {
        const ids = (request.body as { ids?: string[] }).ids;
        items = items.map((entry) => (!ids || ids.includes(entry.id) ? { ...entry, read: true } : entry));
        return { status: 200, body: { unreadCount: items.filter((entry) => !entry.read).length } };
      }
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/', element: <NotificationBell /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
    ],
    '/',
  );

describe('NotificationBell', () => {
  it('shows the unread count, and the latest notifications when opened', async () => {
    mockNotifications([
      item({}),
      item({
        id: 'n2',
        title: 'Request sent',
        body: undefined,
        read: true,
        createdAt: new Date(Date.now() - 3 * 60 * MINUTE).toISOString(),
      }),
    ]);
    render();

    const bell = await screen.findByRole('button', { name: 'Notifications, 1 unread' });
    await userEvent.click(bell);

    const menu = within(await screen.findByRole('menu'));
    const rows = menu.getAllByRole('menuitem');
    // "Mark all as read", then the two notifications, newest first.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('Unread: You’re booked');
    expect(rows[1]).toHaveTextContent('Your trip in the 2022 Toyota RAV4 is confirmed.');
    expect(rows[1]).toHaveTextContent('5 min ago');
    expect(rows[2]).toHaveTextContent('Request sent');
    expect(rows[2]).not.toHaveTextContent('Unread');
    expect(rows[2]).toHaveTextContent('3 h ago');
  });

  it('marks a notification read and opens its page', async () => {
    const sent = mockNotifications([item({})]);
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /You’re booked/ }));

    expect(await screen.findByText('Trip page')).toBeInTheDocument();
    await waitFor(() =>
      expect(sent.find((request) => request.path === '/notifications/read')?.body).toEqual({ ids: ['n1'] }),
    );
  });

  it('marks everything read at once and drops the count', async () => {
    const sent = mockNotifications([item({}), item({ id: 'n2', title: 'New booking request' })]);
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 2 unread' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Mark all as read' }));

    await waitFor(() => expect(screen.queryByText('Unread:')).not.toBeInTheDocument());
    // The list stays open, so it can be seen turning read.
    expect(screen.getByRole('menuitem', { name: /New booking request/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Mark all as read' })).not.toBeInTheDocument();
    expect(sent.find((request) => request.path === '/notifications/read')?.body).toEqual({});
  });

  it('says so when there’s nothing yet, with no count on the bell', async () => {
    mockNotifications([]);
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(await screen.findByText('You’re all caught up. Booking news will show here.')).toBeInTheDocument();
  });

  it('never follows a link that leaves the website', async () => {
    mockNotifications([item({ link: 'https://example.com/phish' })]);
    const { router } = render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: /You’re booked/ }));

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/');
  });
});
