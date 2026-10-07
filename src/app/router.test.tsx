import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi, renderWithRouter } from '@/test/utils';
import { routes } from './router';

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
});
