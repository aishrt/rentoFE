import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockApi, renderWithRouter } from '@/test/utils';
import { hostUser } from './host-fixtures';
import { AreaShell } from './area-shell';
import { HostShell } from './host-shell';

afterEach(() => {
  vi.unstubAllGlobals();
});

function api(unread = 0) {
  mockApi({
    'POST /auth/session': { status: 200, body: { user: hostUser } },
    'GET /threads/unread': { status: 200, body: { count: unread } },
  });
}

const render = (path: string, ui = <HostShell>A Host page</HostShell>) =>
  renderWithRouter([{ path: '*', element: ui }], path);

const current = (name: string) =>
  within(screen.getByRole('navigation', { name }))
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.getAttribute('href'));

describe('HostShell', () => {
  it('has every Host section in the sidebar, and the five places of plan §12.6 on a phone', () => {
    api();
    render('/host');

    expect(screen.getByText('A Host page')).toBeInTheDocument();
    const sidebar = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(sidebar.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Today',
      'Vehicles',
      'Bookings',
      'Calendar',
      'Earnings',
      'Inbox',
      'Reviews',
      'Profile',
    ]);
    const tabs = within(screen.getByRole('navigation', { name: 'Hosting, quick links' }));
    expect(tabs.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Today',
      'Vehicles',
      'Calendar',
      'Earnings',
      'Inbox',
    ]);
  });

  it('shows how many messages wait beside Inbox', async () => {
    api(4);
    render('/host');

    const sidebar = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(await sidebar.findByRole('link', { name: 'Inbox, 4 unread' })).toHaveAttribute(
      'href',
      '/messages?as=host',
    );
    const tabs = within(screen.getByRole('navigation', { name: 'Hosting, quick links' }));
    expect(tabs.getByRole('link', { name: 'Inbox, 4 unread' })).toBeInTheDocument();
  });

  it.each([
    ['/host', '/host', '/host'],
    ['/host/apply', '/host', '/host'],
    ['/host/vehicles', '/host/vehicles', '/host/vehicles'],
    ['/host/vehicles/v1', '/host/vehicles', '/host/vehicles'],
    ['/host/vehicles/v1/maintenance', '/host/vehicles', '/host/vehicles'],
    ['/host/vehicles/v1/calendar', '/host/calendar', '/host/calendar'],
    ['/host/calendar', '/host/calendar', '/host/calendar'],
    ['/host/earnings', '/host/earnings', '/host/earnings'],
    ['/messages/RV-7K2Q9M', '/messages?as=host', '/messages?as=host'],
    // Not on a phone's tabs: reached from Today, which they belong to there.
    ['/host/bookings/RV-7K2Q9M', '/host/bookings', '/host'],
    ['/account/reviews', '/account/reviews?as=host', '/host'],
    ['/host/profile', '/host/profile', '/host'],
  ])('marks where %s belongs: %s in the sidebar, %s on a phone', (path, sidebar, tab) => {
    api();
    render(path);

    expect(current('Hosting')).toEqual([sidebar]);
    expect(current('Hosting, quick links')).toEqual([tab]);
  });
});

describe('AreaShell', () => {
  it('frames a page Hosts share with Guests in the Host’s dashboard, or in the Guest’s', () => {
    api();
    const { unmount } = render('/messages', <AreaShell host>Inbox</AreaShell>);
    expect(screen.getByRole('navigation', { name: 'Hosting' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Your dashboard' })).not.toBeInTheDocument();
    unmount();

    render('/messages', <AreaShell host={false}>Messages</AreaShell>);
    expect(screen.getByRole('navigation', { name: 'Your dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Your dashboard, quick links' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Hosting' })).not.toBeInTheDocument();
  });

  it('shows the page without either while it isn’t known whose it is', () => {
    api();
    render('/messages/RV-7K2Q9M', <AreaShell host={undefined}>A conversation</AreaShell>);

    expect(screen.getByText('A conversation')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
