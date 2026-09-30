import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking, BookingSummary } from '@/api/types';
import { confirmedBooking, summary } from '@/features/booking/test-fixtures';
import { hostUser } from '@/features/host/host-fixtures';
import { mockRoutes, type SentRequest } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { HostBookingPage } from './host-booking-page';
import { HostBookingsPage } from './host-bookings-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const REF = 'RV-7K2Q9M';
const HOUR = 3_600_000;
const NO_ACTIONS = { pay: false, cancel: false, withdraw: false, accept: false, decline: false };

type Answer = { status: number; body?: unknown } | undefined;

/** A request as its Host sees it: the Guest by first name, no mobile yet, and what the Host would earn. */
function hostRequest(overrides: Partial<Booking> = {}): Booking {
  const base = confirmedBooking();
  return confirmedBooking({
    role: 'HOST',
    status: 'PENDING',
    instantBook: false,
    requestExpiresAt: new Date(Date.now() + 23 * HOUR + 60_000).toISOString(),
    host: { ...base.host, phone: undefined },
    payment: { status: 'AUTHORISED' },
    payout: { hostPayoutCents: 80_000, platformFeeCents: 12_000 },
    actions: { ...NO_ACTIONS, accept: true, decline: true },
    ...overrides,
  });
}

function hostConfirmed(overrides: Partial<Booking> = {}): Booking {
  const base = confirmedBooking();
  return hostRequest({
    status: 'CONFIRMED',
    requestExpiresAt: undefined,
    guest: { ...base.guest, phone: '+64220001111' },
    payment: { status: 'SUCCEEDED' },
    actions: { ...NO_ACTIONS, cancel: true },
    ...overrides,
  });
}

function mockHost(route: (request: SentRequest) => Answer) {
  return mockRoutes((request) => {
    if (request.path === '/auth/session') return { status: 200, body: { user: hostUser } };
    return route(request);
  });
}

const routes = [
  { path: '/host/bookings', element: <HostBookingsPage /> },
  { path: '/host/bookings/:ref', element: <HostBookingPage /> },
  { path: '/trips/:ref', element: <p>Trip page</p> },
];

describe('HostBookingsPage', () => {
  const request: BookingSummary = summary({
    status: 'PENDING',
    instantBook: false,
    otherParty: { firstName: 'Kiri' },
    amountCents: 80_000,
    requestExpiresAt: new Date(Date.now() + 23 * HOUR + 60_000).toISOString(),
  });

  it('opens on the requests to answer, with the time left and what the Host earns', async () => {
    const sent = mockHost((sentRequest) =>
      sentRequest.path === '/bookings' ? { status: 200, body: { bookings: [request] } } : undefined,
    );
    renderWithRouter(routes, '/host/bookings');

    const item = within(await screen.findByRole('listitem'));
    expect(sent.find((entry) => entry.path === '/bookings')?.query.toString()).toBe(
      'role=host&group=requests',
    );
    expect(item.getByText('Request to answer')).toBeInTheDocument();
    expect(item.getByText('23 h left to answer')).toBeInTheDocument();
    expect(item.getByText('You’d earn')).toHaveTextContent('You’d earn NZ$800');
    expect(item.getByRole('link')).toHaveAttribute('href', `/host/bookings/${REF}`);
    expect(screen.getByRole('link', { name: 'Bookings' })).toHaveAttribute('aria-current', 'page');
  });

  it('accepts a request from its card and refreshes the list', async () => {
    let accepted = false;
    const sent = mockHost((sentRequest) => {
      if (sentRequest.path === `/bookings/${REF}/accept`) {
        accepted = true;
        return { status: 200, body: { booking: hostConfirmed() } };
      }
      if (sentRequest.path === '/bookings') {
        return { status: 200, body: { bookings: accepted ? [] : [request] } };
      }
      return undefined;
    });
    renderWithRouter(routes, '/host/bookings');

    await userEvent.click(await screen.findByRole('button', { name: 'Accept' }));

    expect(await screen.findByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument();
    expect(sent.filter((entry) => entry.path.endsWith('/accept'))).toHaveLength(1);
  });

  it('declines a request with a note for the Guest', async () => {
    let declined = false;
    const sent = mockHost((sentRequest) => {
      if (sentRequest.path === `/bookings/${REF}/decline`) {
        declined = true;
        return { status: 200, body: { booking: hostRequest({ status: 'DECLINED', actions: NO_ACTIONS }) } };
      }
      if (sentRequest.path === '/bookings') {
        return { status: 200, body: { bookings: declined ? [] : [request] } };
      }
      return undefined;
    });
    renderWithRouter(routes, '/host/bookings');

    await userEvent.click(await screen.findByRole('button', { name: 'Decline' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Decline Kiri’s request?' }));
    expect(dialog.getByText(/There’s no fee for declining/)).toBeInTheDocument();
    await userEvent.type(dialog.getByLabelText('A note for Kiri (optional)'), 'The car is in for a service');
    await userEvent.click(dialog.getByRole('button', { name: 'Decline request' }));

    expect(await screen.findByRole('heading', { name: 'You’re all caught up' })).toBeInTheDocument();
    expect(sent.find((entry) => entry.path.endsWith('/decline'))?.body).toEqual({
      reason: 'The car is in for a service',
    });
  });

  it('lists a booking that waits for the Guest’s identity check under Upcoming, with nothing to answer', async () => {
    mockHost((sentRequest) =>
      sentRequest.path === '/bookings'
        ? {
            status: 200,
            body: {
              bookings:
                sentRequest.query.get('group') === 'upcoming'
                  ? [{ ...request, instantBook: true, verificationReview: 'PENDING' }]
                  : [],
            },
          }
        : undefined,
    );
    renderWithRouter(routes, '/host/bookings?tab=upcoming');

    const item = within(await screen.findByRole('listitem'));
    expect(item.getByText('Guest being verified')).toBeInTheDocument();
    expect(item.getByText('We’re verifying Kiri: up to 23 h')).toBeInTheDocument();
    expect(item.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument();
    expect(item.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });
});

describe('HostBookingPage', () => {
  it('shows a request with the Guest, the payout and the deadline, and confirms it on Accept', async () => {
    const sent = mockHost((sentRequest) => {
      switch (`${sentRequest.method} ${sentRequest.path}`) {
        case `GET /bookings/${REF}`:
          return { status: 200, body: { booking: hostRequest() } };
        case `POST /bookings/${REF}/accept`:
          return { status: 200, body: { booking: hostConfirmed() } };
        case 'GET /bookings':
          return { status: 200, body: { bookings: [] } };
        default:
          return undefined;
      }
    });
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Kiri’s trip in the 2022 Toyota RAV4' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kiri would like to book your car' })).toBeInTheDocument();
    expect(screen.getByText(/You have 23 h to answer/)).toBeInTheDocument();
    // The Guest's mobile stays back until the booking is confirmed (plan §6.2).
    expect(
      screen.getByText('Kiri’s mobile number shows here once the booking is confirmed.'),
    ).toBeInTheDocument();

    const earnings = within(screen.getByRole('region', { name: 'What you’d earn' }));
    expect(earnings.getByText('Your payout').nextElementSibling).toHaveTextContent('NZ$800');
    expect(earnings.getByText('Platform commission').nextElementSibling).toHaveTextContent('$120');

    await userEvent.click(screen.getByRole('button', { name: 'Accept request' }));

    expect(await screen.findByText('Confirmed', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'What you earn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+64220001111' })).toHaveAttribute('href', 'tel:+64220001111');
    expect(screen.queryByRole('button', { name: 'Accept request' })).not.toBeInTheDocument();
    expect(sent.filter((entry) => entry.path.endsWith('/accept'))).toHaveLength(1);
  });

  it('shows the Guest’s full refund and the Host fee before a Host cancels', async () => {
    const cancelled = hostConfirmed({
      status: 'CANCELLED',
      // The API stops sharing the mobile once a booking is over.
      guest: hostRequest().guest,
      payment: { status: 'REFUNDED' },
      cancellation: {
        at: new Date().toISOString(),
        by: 'HOST',
        reason: 'HOST_CANCELLED',
        refundCents: 105_080,
        hostFeeCents: 5_000,
      },
      actions: NO_ACTIONS,
    });
    const sent = mockHost((sentRequest) => {
      switch (`${sentRequest.method} ${sentRequest.path}`) {
        case `GET /bookings/${REF}`:
          return { status: 200, body: { booking: hostConfirmed() } };
        case `GET /bookings/${REF}/cancellation-preview`:
          return {
            status: 200,
            body: {
              allowed: true,
              kind: 'HOST_CANCELLATION',
              refundCents: 105_080,
              feeCents: 0,
              hostShareCents: 0,
              hostFeeCents: 5_000,
              refundPct: 100,
              hoursBeforeStart: 200,
              message: 'Kiri gets a full refund. A $50 Host cancellation fee comes off your next payout.',
            },
          };
        case `POST /bookings/${REF}/cancel`:
          return { status: 200, body: { booking: cancelled } };
        case 'GET /bookings':
          return { status: 200, body: { bookings: [] } };
        default:
          return undefined;
      }
    });
    renderWithRouter(routes, `/host/bookings/${REF}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this booking?' }));
    expect(await dialog.findByText('Refund to Kiri')).toBeInTheDocument();
    expect(dialog.getByText('Refund to Kiri').nextElementSibling).toHaveTextContent('$1,050.80');
    expect(dialog.getByText('Your cancellation fee').nextElementSibling).toHaveTextContent('$50');

    await userEvent.click(dialog.getByRole('button', { name: 'Cancel booking' }));

    expect(
      await screen.findByText(
        'You cancelled, and Kiri was refunded in full. A $50 Host cancellation fee comes off your next payout.',
      ),
    ).toBeInTheDocument();
    expect(sent.find((entry) => entry.path.endsWith('/cancel'))?.body).toEqual({});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // A cancelled booking pays nothing, and the Guest's mobile is no longer shared.
    expect(screen.queryByRole('region', { name: /What you/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Mobile numbers are shared only while a booking is confirmed.'),
    ).toBeInTheDocument();
  });

  it('records an acceptance while the Guest’s identity check is still in review', async () => {
    const waiting = hostRequest({ verificationReview: 'PENDING' });
    const accepted = hostRequest({
      verificationReview: 'PENDING',
      hostAccepted: true,
      actions: NO_ACTIONS,
    });
    mockHost((sentRequest) => {
      switch (`${sentRequest.method} ${sentRequest.path}`) {
        case `GET /bookings/${REF}`:
          return { status: 200, body: { booking: waiting } };
        case `POST /bookings/${REF}/accept`:
          return { status: 200, body: { booking: accepted } };
        case 'GET /bookings':
          return { status: 200, body: { bookings: [] } };
        default:
          return undefined;
      }
    });
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(
      await screen.findByText(
        /We’re still checking Kiri’s identity, so if you accept, the booking is confirmed once/,
      ),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept request' }));

    // Still pending, with nothing left for the Host to do.
    expect(await screen.findByText('You accepted this request')).toBeInTheDocument();
    expect(
      screen.getByText(/confirmed as soon as we’ve finished checking Kiri’s identity/),
    ).toBeInTheDocument();
    expect(screen.getByText('Guest being verified')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept request' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument();
  });

  it('shows an Instant Book that waits for the Guest’s identity check, with nothing to answer', async () => {
    mockHost((sentRequest) =>
      sentRequest.path === `/bookings/${REF}`
        ? {
            status: 200,
            body: {
              booking: hostRequest({ instantBook: true, verificationReview: 'PENDING', actions: NO_ACTIONS }),
            },
          }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(await screen.findByText('We’re verifying Kiri')).toBeInTheDocument();
    expect(screen.getByText(/There’s nothing for you to do/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept request' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'What you’d earn' })).toBeInTheDocument();
  });

  it('sends the Guest of a booking to their trip page', async () => {
    mockHost((sentRequest) =>
      sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: confirmedBooking() } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(await screen.findByText('Trip page')).toBeInTheDocument();
  });
});
