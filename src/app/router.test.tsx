import { screen } from '@testing-library/react';
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

  it('loads the staff portal for its overview at /admin too', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: guestUser } } });
    renderWithRouter(routes, '/admin', { patchRoutesOnNavigation: patchAdminRoutes });

    expect(await screen.findByText('Staff access only')).toBeInTheDocument();
  });
});
