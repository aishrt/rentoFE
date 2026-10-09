import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hostUser } from '@/features/host/host-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { ReviewsPage } from './reviews-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

function api() {
  mockApi({
    'POST /auth/session': { status: 200, body: { user: hostUser } },
    'GET /threads/unread': { status: 200, body: { count: 0 } },
    'GET /me/reviews': { status: 200, body: { toWrite: [], written: [], received: [] } },
  });
}

const render = (path: string) =>
  renderWithRouter([{ path: '/account/reviews', element: <ReviewsPage /> }], path);

describe('ReviewsPage, shared by Guests and Hosts', () => {
  it('sits in the Guest’s dashboard when opened from it', async () => {
    api();
    render('/account/reviews');

    expect(await screen.findByRole('heading', { name: 'No reviews about you yet' })).toBeInTheDocument();
    expect(screen.getByText('Your account')).toBeInTheDocument();
    const sidebar = within(screen.getByRole('navigation', { name: 'Your dashboard' }));
    expect(sidebar.getByRole('link', { name: 'Reviews' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('navigation', { name: 'Hosting' })).not.toBeInTheDocument();
  });

  it('sits in the Host area when opened as a Host, and stays there between its tabs', async () => {
    api();
    const { router } = render('/account/reviews?as=host');

    expect(await screen.findByRole('heading', { name: 'No reviews about you yet' })).toBeInTheDocument();
    expect(screen.getByText('Hosting')).toBeInTheDocument();
    const sidebar = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(sidebar.getByRole('link', { name: 'Reviews' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('navigation', { name: 'Your dashboard, quick links' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'By you' }));
    expect(await screen.findByRole('heading', { name: 'No reviews written yet' })).toBeInTheDocument();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('tab')).toBe('written');
    expect(params.get('as')).toBe('host');
    expect(screen.getByRole('navigation', { name: 'Hosting' })).toBeInTheDocument();
  });
});
