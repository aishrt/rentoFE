import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminUserRow } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminUsersPage } from './users-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/users') =>
  renderWithRouter([{ path: '/admin/users', element: <AdminUsersPage /> }], path);

const aroha: AdminUserRow = {
  id: 'u10',
  firstName: 'Aroha',
  lastName: 'Ngata',
  email: 'aroha@example.co.nz',
  phone: '+64211234567',
  roles: ['GUEST', 'HOST'],
  status: 'ACTIVE',
  closed: false,
  identityStatus: 'APPROVED',
  hostStatus: 'APPROVED',
  openRiskFlags: 2,
  // 10:30 am on 28 September in New Zealand.
  createdAt: '2026-09-27T21:30:00.000Z',
};

const rangi: AdminUserRow = {
  ...aroha,
  id: 'u11',
  firstName: 'Rangi',
  lastName: 'Walker',
  email: 'rangi@example.co.nz',
  roles: ['GUEST'],
  status: 'SUSPENDED',
  identityStatus: 'NONE',
  hostStatus: null,
  openRiskFlags: 0,
};

/** The query string of the latest request for the list. */
const lastListQuery = (fetchMock: ReturnType<typeof mockApi>) => {
  const request = fetchMock.mock.calls
    .map(([input]) => input as Request)
    .filter((input) => new URL(input.url).pathname.endsWith('/admin/users'))
    .at(-1);
  return new URL(request!.url).searchParams;
};

describe('AdminUsersPage', () => {
  it('lists each person with their roles, status, checks, flags and a link to their record', async () => {
    mockApi({ 'GET /admin/users': { status: 200, body: { users: [aroha, rangi], total: 2, page: 1 } } });
    render();

    const table = within(await screen.findByRole('table', { name: 'Users' }));
    const [, first, second] = table.getAllByRole('row');
    const row = within(first!);
    expect(row.getByRole('link', { name: 'Aroha Ngata' })).toHaveAttribute('href', '/admin/users/u10');
    expect(row.getByText('aroha@example.co.nz')).toBeInTheDocument();
    expect(row.getByText('Guest, Host')).toBeInTheDocument();
    expect(row.getByText('Active')).toBeInTheDocument();
    expect(row.getByText('Verified')).toBeInTheDocument();
    expect(row.getByText('Approved')).toBeInTheDocument();
    expect(row.getByText('2')).toBeInTheDocument();
    expect(row.getByText('Mon, 28 Sept 2026')).toBeInTheDocument();

    const other = within(second!);
    expect(other.getByText('Suspended')).toBeInTheDocument();
    expect(other.getByText('Not verified')).toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 users')).toBeInTheDocument();
  });

  it('searches by name, email or mobile and keeps the search in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/users': { status: 200, body: { users: [aroha], total: 1, page: 1 } },
    });
    const { router } = render();
    await screen.findByRole('table', { name: 'Users' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'aroha{Enter}');

    expect(router.state.location.search).toBe('?q=aroha');
    await vi.waitFor(() => expect(lastListQuery(fetchMock).get('q')).toBe('aroha'));
    expect(lastListQuery(fetchMock).get('page')).toBe('1');
  });

  it('filters by role and flags, and pages through the results', async () => {
    const fetchMock = mockApi({
      'GET /admin/users': { status: 200, body: { users: [aroha], total: 30, page: 1 } },
    });
    const { router } = render();
    await screen.findByRole('table', { name: 'Users' });

    await userEvent.click(screen.getByRole('button', { name: /^Role/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Host' }));
    expect(router.state.location.search).toBe('?role=host');
    await vi.waitFor(() => expect(lastListQuery(fetchMock).get('role')).toBe('HOST'));

    await userEvent.click(screen.getByRole('switch', { name: 'Only flagged' }));
    expect(router.state.location.search).toBe('?role=host&flagged=true');
    await vi.waitFor(() => expect(lastListQuery(fetchMock).get('flagged')).toBe('true'));

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(router.state.location.search).toBe('?role=host&flagged=true&page=2');
    await vi.waitFor(() => expect(lastListQuery(fetchMock).get('page')).toBe('2'));
  });

  it('opens with the search in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/users': { status: 200, body: { users: [rangi], total: 26, page: 2 } },
    });
    render('/admin/users?q=rangi&status=suspended&flagged=true&page=2');

    expect(await screen.findByText('26–26 of 26 users')).toBeInTheDocument();
    const query = lastListQuery(fetchMock);
    expect(Object.fromEntries(query)).toEqual({
      q: 'rangi',
      status: 'SUSPENDED',
      flagged: 'true',
      page: '2',
    });
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('rangi');
    expect(screen.getByRole('switch', { name: 'Only flagged' })).toBeChecked();
    expect(screen.getByRole('button', { name: /^Status/ })).toHaveTextContent('Suspended');
  });

  it('says when nobody matches a search', async () => {
    mockApi({ 'GET /admin/users': { status: 200, body: { users: [], total: 0, page: 1 } } });
    render('/admin/users?q=nobody');

    expect(await screen.findByText('Nobody matches')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/users': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "You don't have access to this." } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the users');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
