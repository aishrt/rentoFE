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
});
