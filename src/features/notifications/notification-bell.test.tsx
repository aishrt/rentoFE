import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils';
import { NotificationBell } from './notification-bell';
import {
  mockNotificationsApi as mockNotifications,
  notification as item,
  notifications,
} from './test-fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const MINUTE = 60_000;

const render = () =>
  renderWithRouter(
    [
      { path: '/', element: <NotificationBell /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
      { path: '/notifications', element: <p>Notifications page</p> },
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

  it('shows only the newest three, with Show all to the Notifications page when there are more', async () => {
    const sent = mockNotifications(notifications(5));
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 5 unread' }));

    const menu = within(await screen.findByRole('menu'));
    expect(menu.getAllByRole('menuitem', { name: /Notification \d/ }).map((row) => row.textContent)).toEqual([
      expect.stringContaining('Notification 1'),
      expect.stringContaining('Notification 2'),
      expect.stringContaining('Notification 3'),
    ]);
    expect(sent.find((request) => request.path === '/notifications')?.query.get('limit')).toBe('3');

    await userEvent.click(menu.getByRole('menuitem', { name: 'Show all 5 notifications' }));
    expect(await screen.findByText('Notifications page')).toBeInTheDocument();
  });

  it('has no Show all while three or fewer would all fit', async () => {
    mockNotifications(notifications(3));
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Notifications, 3 unread' }));

    const menu = within(await screen.findByRole('menu'));
    expect(menu.getAllByRole('menuitem', { name: /Notification \d/ })).toHaveLength(3);
    expect(menu.queryByRole('menuitem', { name: /Show all/ })).not.toBeInTheDocument();
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
