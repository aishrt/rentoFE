import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminDashboard } from '@/api/types';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminOverviewPage } from './overview-page';

beforeEach(() => {
  // 1 pm on Wednesday 7 October in New Zealand.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const dashboard = (overrides: Partial<AdminDashboard['figures']> = {}): AdminDashboard => ({
  from: '2026-09-08',
  to: '2026-10-07',
  figures: {
    totalUsers: 1520,
    activeHosts: 84,
    activeVehicles: 132,
    upcomingBookings: 41,
    bookingRevenueCents: 1234550,
    platformFeesCents: 185000,
    hostPayoutsCents: 902500,
    cancellations: 16,
    incidentCases: 2,
    openIncidentCases: 1,
    pendingVerifications: 5,
    suspendedUsers: 3,
    suspendedVehicles: 0,
    ...overrides,
  },
  queues: {
    hostApplications: 3,
    listingReviews: 7,
    verifications: 5,
    incidents: 1,
    supportTickets: 4,
    reports: 2,
    heldReviews: 0,
    riskFlags: 1,
    failedPayments: 2,
    heldPayouts: 1,
    failedJobs: 4,
  },
  generatedAt: '2026-10-07T00:00:00.000Z',
});

const supportUser = { ...adminUser, id: 'u3', firstName: 'Sam', roles: ['SUPPORT'] };

const render = (path = '/admin') =>
  renderWithRouter([{ path: '/admin', element: <AdminOverviewPage /> }], path);

/** The from and to of each dashboard request, in order. */
const ranges = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/admin/dashboard'))
    .map((url) => `${url.searchParams.get('from')} to ${url.searchParams.get('to')}`);

/** The stat card with this label. */
const figure = async (label: string) => {
  const card = (await screen.findByText(label)).closest('li');
  if (!card) throw new Error(`No figure called ${label}`);
  return within(card);
};

describe('AdminOverviewPage', () => {
  it('shows the last 30 days’ figures, how things stand now, and the queues', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/dashboard': { status: 200, body: dashboard() },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'Good afternoon, Aroha' })).toBeInTheDocument();
    const revenue = await figure('Booking revenue');
    expect(revenue.getByText('$12,346')).toBeInTheDocument();
    expect(revenue.getByText('Paid for bookings made on these dates, less refunds')).toBeInTheDocument();
    expect((await figure('Registered users')).getByText('Guests and Hosts, right now')).toBeInTheDocument();
    expect((await figure('Registered users')).getByText('1,520')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'On these dates: Tue, 8 Sep – Wed, 7 Oct' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Right now' })).toBeInTheDocument();
    expect(ranges(fetchMock)).toEqual(['2026-09-08 to 2026-10-07']);

    const queues = within(screen.getByRole('list', { name: 'Queues' }));
    expect(queues.getByRole('link', { name: 'Host applications 3 waiting' })).toHaveAttribute(
      'href',
      '/admin/host-applications',
    );
    expect(queues.getByRole('link', { name: 'Listing reviews 7 waiting' })).toHaveAttribute(
      'href',
      '/admin/vehicles',
    );
    expect(queues.getByRole('link', { name: 'Failed payments 2 waiting' })).toHaveAttribute(
      'href',
      '/admin/payments?view=failed',
    );
    expect(queues.getByRole('link', { name: 'Held payouts 1 waiting' })).toHaveAttribute(
      'href',
      '/admin/payments?tab=payouts&status=HELD',
    );
    expect(queues.getByRole('link', { name: 'Held reviews 0 waiting' })).toHaveAttribute(
      'href',
      '/admin/moderation',
    );
    expect(queues.getByRole('link', { name: 'Failed jobs 4 waiting' })).toHaveAttribute(
      'href',
      '/admin/jobs',
    );
  });

  it('asks for the figures again when the dates change, and keeps them in the address', async () => {
    let calls = 0;
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/dashboard': () => {
        calls += 1;
        return { status: 200, body: dashboard({ cancellations: calls === 1 ? 16 : 12 }) };
      },
    });
    const { router } = render();

    expect((await figure('Cancellations')).getByText('16')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Dates/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Last 7 days' }));

    expect(await (await figure('Cancellations')).findByText('12')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?range=7d');
    expect(ranges(fetchMock).at(-1)).toBe('2026-10-01 to 2026-10-07');

    // A day of its own makes the range custom.
    await userEvent.click(screen.getByRole('button', { name: /^From/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Friday, 2 October 2026' }));
    await vi.waitFor(() => expect(ranges(fetchMock).at(-1)).toBe('2026-10-02 to 2026-10-07'));
    expect(router.state.location.search).toBe('?from=2026-10-02&to=2026-10-07');
    expect(screen.getByRole('button', { name: /^Dates/ })).toHaveTextContent('Custom dates');
  });

  it('opens with the dates from the address', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/dashboard': { status: 200, body: dashboard() },
    });
    render('/admin?range=last-month');

    await figure('Booking revenue');
    expect(ranges(fetchMock)).toEqual(['2026-09-01 to 2026-09-30']);
    expect(screen.getByRole('button', { name: /^Dates/ })).toHaveTextContent('Last month');
  });

  it('leaves failed jobs out for the support team', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /admin/dashboard': { status: 200, body: dashboard() },
    });
    render();

    expect(await screen.findByRole('heading', { name: 'Good afternoon, Sam' })).toBeInTheDocument();
    const queues = within(await screen.findByRole('list', { name: 'Queues' }));
    expect(queues.getByRole('link', { name: 'Risk flags 1 waiting' })).toHaveAttribute('href', '/admin/risk');
    expect(queues.queryByRole('link', { name: /Failed jobs/ })).not.toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/dashboard': {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Choose a range of up to 400 days.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't load the figures");
    expect(alert).toHaveTextContent('Choose a range of up to 400 days.');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
