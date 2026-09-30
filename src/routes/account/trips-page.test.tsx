import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { summary } from '@/features/booking/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { TripsPage } from './trips-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const HOUR = 3_600_000;

function mockTrips(groups: Partial<Record<string, ReturnType<typeof summary>[]>>, user = guestUser) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /bookings':
        return { status: 200, body: { bookings: groups[request.query.get('group') ?? ''] ?? [] } };
      default:
        return undefined;
    }
  });
}

const render = (path = '/trips') =>
  renderWithRouter(
    [
      { path: '/trips', element: <TripsPage /> },
      { path: '/login', element: <p>Log in page</p> },
    ],
    path,
  );

describe('TripsPage', () => {
  it('lists upcoming trips with their status, host and total, each opening its trip', async () => {
    const sent = mockTrips({
      upcoming: [
        summary(),
        summary({
          id: 'bk2',
          ref: 'RV-REQUEST',
          status: 'PENDING',
          instantBook: false,
          requestExpiresAt: new Date(Date.now() + 5 * HOUR + 60_000).toISOString(),
        }),
      ],
    });
    render();

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(sent.find((request) => request.path === '/bookings')?.query.toString()).toBe(
      'role=guest&group=upcoming',
    );

    const confirmed = within(items[0]!);
    expect(confirmed.getByRole('link')).toHaveAttribute('href', '/trips/RV-7K2Q9M');
    expect(confirmed.getByText('2022 Toyota RAV4')).toBeInTheDocument();
    expect(confirmed.getByText('Confirmed')).toBeInTheDocument();
    expect(confirmed.getByText(/Host Liam/)).toBeInTheDocument();
    expect(confirmed.getByText('NZ$506.50')).toBeInTheDocument();

    // A request says who it's waiting for and how long they have.
    const request = within(items[1]!);
    expect(request.getByText('Waiting for Liam')).toBeInTheDocument();
    expect(request.getByText('Liam has 5 h to answer')).toBeInTheDocument();
  });

  it('asks the API for the chosen tab and keeps it in the URL', async () => {
    const sent = mockTrips({
      cancelled: [summary({ status: 'CANCELLED' })],
    });
    const { router } = render();

    expect(await screen.findByRole('heading', { name: 'No upcoming trips' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse cars' })).toHaveAttribute('href', '/cars');

    await userEvent.click(screen.getByRole('tab', { name: 'Cancelled' }));

    expect(await screen.findByText('Cancelled', { selector: 'span' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=cancelled');
    expect(sent.at(-1)?.query.get('group')).toBe('cancelled');
  });

  it('opens on the tab in the link', async () => {
    mockTrips({ completed: [summary({ status: 'COMPLETED' })] });
    render('/trips?tab=completed');

    expect(await screen.findByText('Completed', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveAttribute('aria-selected', 'true');
  });

  it('sends a visitor who isn’t logged in to log in, and back afterwards', async () => {
    mockRoutes((request) =>
      request.path === '/auth/session' ? { status: 200, body: { user: null } } : undefined,
    );
    const { router } = render('/trips?tab=completed');

    expect(await screen.findByText('Log in page')).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent('/trips?tab=completed')}`);
  });
});
