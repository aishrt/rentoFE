import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking } from '@/api/types';
import { confirmedBooking, summary } from '@/features/booking/test-fixtures';
import { handover } from '@/features/handover/test-fixtures';
import { mockRoutes, policies } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { TripsPage } from './trips-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const HOUR = 3_600_000;

function mockTrips(
  groups: Partial<Record<string, ReturnType<typeof summary>[]>>,
  user = guestUser,
  details: Booking[] = [],
) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /bookings':
        return { status: 200, body: { bookings: groups[request.query.get('group') ?? ''] ?? [] } };
      case 'GET /policies':
        return { status: 200, body: policies };
      default: {
        // A trip under way: its details and its handover.
        const [, ref, part] = /^\/bookings\/([^/]+)(?:\/(inspections))?$/.exec(request.path) ?? [];
        const detail = details.find((booking) => booking.ref === ref);
        if (ref && part) return { status: 200, body: { handover: handover({ ref }) } };
        return detail ? { status: 200, body: { booking: detail } } : undefined;
      }
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

    // The trips, not the dashboard's navigation around them.
    const items = await within(await screen.findByRole('tabpanel')).findAllByRole('listitem');
    expect(items).toHaveLength(2);
    // The list, and the trips under way above it.
    expect(
      sent.filter((request) => request.path === '/bookings').map((request) => request.query.toString()),
    ).toEqual(expect.arrayContaining(['role=guest&group=upcoming', 'role=guest&group=current']));

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
    // No total on a trip that didn't happen: its page has the refund.
    expect(screen.queryByText(/Total/)).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=cancelled');
    expect(sent.at(-1)?.query.get('group')).toBe('cancelled');
  });

  it('opens on the tab in the link', async () => {
    mockTrips({ completed: [summary({ status: 'COMPLETED' })] });
    render('/trips?tab=completed');

    expect(await screen.findByText('Completed', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveAttribute('aria-selected', 'true');
  });

  it('puts a trip on the road at the top, with what’s needed until it’s returned', async () => {
    const end = new Date(Date.now() + 2 * HOUR).toISOString();
    mockTrips(
      {
        current: [
          summary({
            ref: 'RV-ONROAD',
            status: 'ACTIVE',
            start: new Date(Date.now() - 48 * HOUR).toISOString(),
            end,
          }),
        ],
      },
      guestUser,
      [confirmedBooking({ ref: 'RV-ONROAD', status: 'ACTIVE', end })],
    );
    render();

    const now = within(await screen.findByRole('region', { name: 'Trips under way' }));
    expect(await now.findByRole('heading', { name: /^Return by/ })).toBeInTheDocument();
    expect(now.getByText('2022 Toyota RAV4')).toBeInTheDocument();
    expect(now.getByRole('link', { name: 'Open trip' })).toHaveAttribute('href', '/trips/RV-ONROAD');
    // Two hours from the return time: check-out is a tap away.
    expect(now.getByRole('link', { name: 'Start check-out' })).toHaveAttribute(
      'href',
      '/trips/RV-ONROAD/check-out',
    );
    expect(now.getByRole('link', { name: 'Message Liam' })).toHaveAttribute('href', '/messages/RV-ONROAD');
    expect(now.getByRole('link', { name: 'Report an incident' })).toHaveAttribute(
      'href',
      '/incidents/new?booking=RV-ONROAD',
    );
    // The tabs still open on Upcoming, under it.
    expect(screen.getByRole('tab', { name: 'Upcoming' })).toHaveAttribute('aria-selected', 'true');
  });

  it('asks to check in once a booked trip has started', async () => {
    mockTrips({
      current: [summary({ ref: 'RV-STARTED', start: new Date(Date.now() - HOUR).toISOString() })],
    });
    render();

    const now = within(await screen.findByRole('region', { name: 'Trips under way' }));
    expect(now.getByRole('heading', { name: 'Check in to start your trip' })).toBeInTheDocument();
    expect(await now.findByRole('link', { name: 'Start check-in' })).toHaveAttribute(
      'href',
      '/trips/RV-STARTED/check-in',
    );
    expect(now.getByRole('link', { name: 'Open trip' })).toHaveAttribute('href', '/trips/RV-STARTED');
    expect(now.getByRole('link', { name: 'Report an incident' })).toHaveAttribute(
      'href',
      '/incidents/new?booking=RV-STARTED',
    );
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
