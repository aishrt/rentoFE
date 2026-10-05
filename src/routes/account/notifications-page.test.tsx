import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import { mockNotificationsApi, notifications } from '@/features/notifications/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { NotificationsPage } from './notifications-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/notifications') =>
  renderWithRouter(
    [
      {
        path: '/notifications',
        element: (
          <>
            <NotificationsPage />
            <Toaster />
          </>
        ),
      },
      { path: '/trips/:ref', element: <p>Trip page</p> },
      { path: '/login', element: <p>Log in page</p> },
    ],
    path,
  );

const rows = () => within(screen.getByRole('tabpanel')).getAllByRole('listitem');
const row = (title: string) => within(rows().find((item) => item.textContent?.includes(title))!);
const lastBody = (sent: { path: string; body?: unknown }[], path: string) =>
  sent.filter((request) => request.path === path).at(-1)?.body;

describe('NotificationsPage', () => {
  it('lists every notification with the counts, and opening one marks it read', async () => {
    const sent = mockNotificationsApi([
      ...notifications(2),
      ...notifications(1, { read: true }).map((item) => ({ ...item, id: 'n3', title: 'Old news' })),
    ]);
    render();

    expect(await screen.findByRole('heading', { name: 'Notifications' })).toBeInTheDocument();
    await waitFor(() => expect(rows()).toHaveLength(3));
    expect(screen.getByRole('tab', { name: 'All (3)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Unread (2)' })).toBeInTheDocument();
    expect(screen.getByText('Showing 3 of 3')).toBeInTheDocument();
    expect(
      row('Notification 1').getByRole('checkbox', { name: /^Unread: ?Notification 1$/ }),
    ).toBeInTheDocument();

    await userEvent.click(row('Notification 1').getByRole('link'));

    expect(await screen.findByText('Trip page')).toBeInTheDocument();
    await waitFor(() => expect(lastBody(sent, '/notifications/read')).toEqual({ ids: ['n1'] }));
  });

  it('marks one read or unread from its own buttons', async () => {
    const sent = mockNotificationsApi([
      ...notifications(1),
      { ...notifications(1, { read: true })[0]!, id: 'n2', title: 'Old news' },
    ]);
    render();

    await waitFor(() => expect(rows()).toHaveLength(2));
    await userEvent.click(row('Notification 1').getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(lastBody(sent, '/notifications/read')).toEqual({ ids: ['n1'] }));
    expect(await screen.findByText('Marked as read')).toBeInTheDocument();
    expect(await screen.findByRole('tab', { name: 'Unread (0)' })).toBeInTheDocument();

    await userEvent.click(row('Old news').getByRole('button', { name: 'Mark as unread' }));
    await waitFor(() => expect(lastBody(sent, '/notifications/unread')).toEqual({ ids: ['n2'] }));
    expect(await screen.findByRole('tab', { name: 'Unread (1)' })).toBeInTheDocument();
  });

  it('acts on a selection: mark read, mark unread, or delete after asking', async () => {
    const sent = mockNotificationsApi(notifications(4));
    render();

    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(row('Notification 1').getByRole('checkbox'));
    await userEvent.click(row('Notification 2').getByRole('checkbox'));
    expect(screen.getByRole('checkbox', { name: '2 selected' })).toBePartiallyChecked();

    await userEvent.click(screen.getByRole('button', { name: 'Mark read' }));
    await waitFor(() => expect(lastBody(sent, '/notifications/read')).toEqual({ ids: ['n1', 'n2'] }));
    expect(await screen.findByText('2 notifications marked as read')).toBeInTheDocument();
    // The selection is done with once used.
    expect(screen.getByRole('checkbox', { name: 'Select all' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select all' }));
    expect(screen.getByRole('checkbox', { name: '4 selected' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Delete 4 notifications?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(lastBody(sent, '/notifications/delete')).toEqual({ ids: ['n1', 'n2', 'n3', 'n4'] }),
    );
    expect(await screen.findByText('4 notifications deleted')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
  });

  it('deletes one straight away, and every read one after asking', async () => {
    const sent = mockNotificationsApi([
      ...notifications(2),
      ...notifications(2, { read: true }).map((item, index) => ({
        ...item,
        id: `r${index}`,
        title: `Read ${index}`,
      })),
    ]);
    render();

    await waitFor(() => expect(rows()).toHaveLength(4));
    await userEvent.click(row('Notification 2').getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(lastBody(sent, '/notifications/delete')).toEqual({ ids: ['n2'] }));
    expect(await screen.findByText('Notification deleted')).toBeInTheDocument();
    await waitFor(() => expect(rows()).toHaveLength(3));

    await userEvent.click(screen.getByRole('button', { name: 'Delete read' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Delete 2 read notifications?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(lastBody(sent, '/notifications/delete')).toEqual({ read: true }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByRole('button', { name: 'Delete read' })).not.toBeInTheDocument();
  });

  it('shows unread ones only on the Unread tab, kept in the URL', async () => {
    const sent = mockNotificationsApi([...notifications(1, { read: true })]);
    const { router } = render();

    await waitFor(() => expect(rows()).toHaveLength(1));
    await userEvent.click(screen.getByRole('tab', { name: 'Unread (0)' }));

    expect(await screen.findByRole('heading', { name: 'Nothing unread' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?show=unread');
    expect(sent.some((request) => request.query.get('unread') === 'true')).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(router.state.location.search).toBe('');
  });

  it('loads the next page on request', async () => {
    const sent = mockNotificationsApi(notifications(25));
    render();

    await waitFor(() => expect(rows()).toHaveLength(20));
    expect(screen.getByText('Showing 20 of 25')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(rows()).toHaveLength(25));
    expect(sent.some((request) => request.query.get('cursor') === '20')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('says so when there are none', async () => {
    mockNotificationsApi([]);
    render();

    expect(await screen.findByRole('heading', { name: 'No notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });
});
