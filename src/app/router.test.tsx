import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { guestUser, mockApi, renderWithRouter } from '@/test/utils';
import { patchAdminRoutes, routes } from './router';

describe('routes', () => {
  it('shows the not-found page, inside the site header and footer, for an unknown address', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: null } } });
    renderWithRouter(routes, '/no-such-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Looks like you took a wrong turn' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('opens the help centre, built in Phase 3 in place of its "coming soon" page', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: null } },
      'GET /help/articles': { status: 200, body: { articles: [] } },
    });
    renderWithRouter(routes, '/help');

    expect(await screen.findByRole('heading', { level: 1, name: /How can we help/ })).toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  });

  it('loads the staff portal on the way in, so an /admin page is not "not found"', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: null } } });
    const { router } = renderWithRouter(routes, '/admin/jobs', { patchRoutesOnNavigation: patchAdminRoutes });

    // A visitor is sent to the staff log-in, which comes back to the page afterwards.
    expect(await screen.findByRole('heading', { level: 1, name: 'Staff log-in' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/admin/jobs')}`);
    expect(screen.queryByText('Looks like you took a wrong turn')).not.toBeInTheDocument();
  });

  it('opens the Host’s Vehicles tab in the Host area, with every Host section', async () => {
    mockApi({
      'POST /auth/session': {
        status: 200,
        body: { user: { ...guestUser, roles: ['GUEST', 'HOST'], hostStatus: 'APPROVED' } },
      },
      'GET /host/vehicles': { status: 200, body: { vehicles: [] } },
      'GET /threads/unread': { status: 200, body: { count: 2 } },
      'GET /notifications': { status: 200, body: { notifications: [], unreadCount: 0, total: 0 } },
    });
    renderWithRouter(routes, '/host/vehicles');

    expect(await screen.findByRole('heading', { level: 1, name: 'My vehicles' })).toBeInTheDocument();
    const sidebar = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(sidebar.getByRole('link', { name: 'Vehicles' })).toHaveAttribute('aria-current', 'page');
    expect(sidebar.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/host',
      '/host/vehicles',
      '/host/bookings',
      '/host/calendar',
      '/host/earnings',
      '/messages?as=host',
      '/account/reviews?as=host',
      '/host/profile',
    ]);
    expect(await sidebar.findByRole('link', { name: 'Inbox, 2 unread' })).toBeInTheDocument();
    // A phone's tab bar: exactly Today · Vehicles · Calendar · Earnings · Inbox (plan §12.6).
    const tabs = within(screen.getByRole('navigation', { name: 'Hosting, quick links' }));
    expect(tabs.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/host',
      '/host/vehicles',
      '/host/calendar',
      '/host/earnings',
      '/messages?as=host',
    ]);
    for (const name of ['Today', 'Vehicles', 'Calendar', 'Earnings', 'Inbox, 2 unread']) {
      expect(tabs.getByRole('link', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('navigation', { name: 'Your dashboard' })).not.toBeInTheDocument();
  });

  it('keeps the Host home as it was for a Guest who hasn’t applied, without the Host area', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: { ...guestUser, hostStatus: null } } },
      'GET /threads/unread': { status: 200, body: { count: 0 } },
      'GET /notifications': { status: 200, body: { notifications: [], unreadCount: 0, total: 0 } },
    });
    renderWithRouter(routes, '/host');

    expect(
      await screen.findByRole('heading', { name: 'Earn from your car when you’re not using it' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Hosting' })).not.toBeInTheDocument();
  });

  it('loads the staff portal for its overview at /admin too', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: guestUser } } });
    renderWithRouter(routes, '/admin', { patchRoutesOnNavigation: patchAdminRoutes });

    expect(await screen.findByText('Staff access only')).toBeInTheDocument();
  });
});
