import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminUser, guestUser, mockApi, renderWithRouter } from '@/test/utils';
import { RequireStaff } from './require-staff';

afterEach(() => {
  vi.unstubAllGlobals();
});

const routes = [
  {
    path: '/admin',
    element: (
      <RequireStaff fallback={<p>Loading portal</p>}>
        {(user) => <p>Welcome, {user.firstName}</p>}
      </RequireStaff>
    ),
  },
  { path: '/admin/login', element: <p>Staff log-in page</p> },
];

describe('RequireStaff', () => {
  it('sends visitors who are not signed in to the staff log-in, remembering where they were going', async () => {
    const fetchMock = mockApi({ 'POST /auth/session': { status: 200, body: { user: null } } });
    const { router } = renderWithRouter(routes, '/admin');

    expect(screen.getByText('Loading portal')).toBeInTheDocument();
    expect(await screen.findByText('Staff log-in page')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?next=%2Fadmin');
    // One request, and no 401 for the browser to log.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses signed-in guests', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: guestUser } } });
    renderWithRouter(routes, '/admin');

    expect(await screen.findByRole('heading', { name: 'Staff access only' })).toBeInTheDocument();
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
  });

  it('lets staff in', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: adminUser } } });
    renderWithRouter(routes, '/admin');

    expect(await screen.findByText('Welcome, Aroha')).toBeInTheDocument();
  });

  it('offers a retry when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    renderWithRouter(routes, '/admin');

    expect(
      await screen.findByRole('heading', { name: "We can't reach Rento Vroom right now" }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
