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
    // The fixture's $828 rental and $20 delivery at 20 % commission: $678.40 to the Host.
    payout: { hostPayoutCents: 67_840, commissionCents: 16_960, commissionGstCents: 2_212 },
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
    amountCents: 67_840,
    requestExpiresAt: new Date(Date.now() + 23 * HOUR + 60_000).toISOString(),
  });

  it('opens on the requests to answer, with the time left and what the Host earns', async () => {
    const sent = mockHost((sentRequest) =>
      sentRequest.path === '/bookings' ? { status: 200, body: { bookings: [request] } } : undefined,
    );
    renderWithRouter(routes, '/host/bookings');

    const item = within(await within(await screen.findByRole('tabpanel')).findByRole('listitem'));
    expect(sent.find((entry) => entry.path === '/bookings')?.query.toString()).toBe(
      'role=host&group=requests',
    );
    expect(item.getByText('Request to answer')).toBeInTheDocument();
    expect(item.getByText('23 h left to answer')).toBeInTheDocument();
    expect(item.getByText('You’d earn')).toHaveTextContent('You’d earn NZ$678.40');
    expect(item.getByRole('link')).toHaveAttribute('href', `/host/bookings/${REF}`);
    const hosting = within(screen.getByRole('navigation', { name: 'Hosting' }));
    expect(hosting.getByRole('link', { name: 'Bookings' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows the Guest’s verification, rating and trips on a request, where the Host answers it', async () => {
    const verified = summary({
      ...request,
      otherParty: { firstName: 'Kiri', verified: true, rating: { avg: 4.8, count: 5 }, tripCount: 6 },
    });
    const newGuest = summary({
      ...request,
      ref: 'RV-NEW001',
      otherParty: { firstName: 'Ana', verified: false, rating: { avg: 0, count: 0 }, tripCount: 0 },
    });
    mockHost((sentRequest) =>
      sentRequest.path === '/bookings'
        ? { status: 200, body: { bookings: [verified, newGuest] } }
        : undefined,
    );
    renderWithRouter(routes, '/host/bookings');

    const [first, second] = (await within(await screen.findByRole('tabpanel')).findAllByRole('listitem')).map(
      (element) => within(element),
    );
    expect(first!.getByText('Identity verified')).toBeInTheDocument();
    expect(first!.getByText('6 trips completed')).toBeInTheDocument();
    expect(first!.getByText(/4\.8/)).toBeInTheDocument();
    expect(second!.getByText('Identity not verified yet')).toBeInTheDocument();
    expect(second!.getByText('0 trips completed')).toBeInTheDocument();
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

    const item = within(await within(await screen.findByRole('tabpanel')).findByRole('listitem'));
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
    const { queryClient } = renderWithRouter(routes, `/host/bookings/${REF}`);
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

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
    expect(earnings.getByText('Your payout').nextElementSibling).toHaveTextContent('NZ$678.40');
    // The commission on the rental and delivery only, not the Guest's service fee (plan §8.1, item 22).
    expect(earnings.getByText('Platform commission').nextElementSibling).toHaveTextContent(
      '$169.60incl. $22.12 GST',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Accept request' }));

    expect(await screen.findByText('Confirmed', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'What you earn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+64220001111' })).toHaveAttribute('href', 'tel:+64220001111');
    expect(screen.queryByRole('button', { name: 'Accept request' })).not.toBeInTheDocument();
    expect(sent.filter((entry) => entry.path.endsWith('/accept'))).toHaveLength(1);
    // The rest of the Host's dashboard catches up too: the to-do list, earnings, payouts and calendars.
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual(
      expect.arrayContaining([
        ['bookings'],
        ['host', 'todo'],
        ['host', 'earnings'],
        ['host', 'payouts'],
        ['host', 'vehicles'],
        ['host', 'calendar'],
      ]),
    );
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
    expect(sent.find((entry) => entry.path.endsWith('/cancel'))?.body).toEqual({
      expectedRefundCents: 105_080,
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // A cancelled booking pays nothing, and the Guest's mobile is no longer shared.
    expect(screen.queryByRole('region', { name: /What you/ })).not.toBeInTheDocument();
    expect(
      screen.getByText('Mobile numbers are shared only while a booking is confirmed.'),
    ).toBeInTheDocument();
  });

  it('shows when a paid payout reaches the bank, and the trip’s extra charges', async () => {
    const completed = hostConfirmed({
      status: 'COMPLETED',
      actions: NO_ACTIONS,
      payout: {
        hostPayoutCents: 67_840,
        commissionCents: 16_960,
        commissionGstCents: 2_212,
        status: 'PAID',
        scheduledFor: '2026-10-09T01:00:00.000Z',
        paidAt: '2026-10-09T01:00:00.000Z',
        expectedInBankBy: '2026-10-13T01:00:00.000Z',
        paidCents: 67_840,
      },
      extraCharges: [
        {
          id: 'xc1',
          type: 'CLEANING',
          description: 'Sand through the back seats',
          amountCents: 6_000,
          status: 'UNPAID',
          addedAt: '2026-10-10T01:00:00.000Z',
        },
      ],
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: completed } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    const earnings = within(await screen.findByRole('region', { name: 'What you earn' }));
    expect(
      earnings.getByText(/to your Stripe account, usually in your bank by Tue, 13 Oct\./),
    ).toBeInTheDocument();

    const charges = within(screen.getByRole('region', { name: 'Extra charges' }));
    expect(charges.getByText('Cleaning')).toBeInTheDocument();
    expect(charges.getByText('$60')).toBeInTheDocument();
    expect(charges.getByText('Not paid yet')).toBeInTheDocument();
    expect(
      charges.getByText(/Kiri’s card didn’t go through, so we’ve sent them a link to pay/),
    ).toBeInTheDocument();
    // The pay link is the Guest's.
    expect(charges.queryByRole('link')).not.toBeInTheDocument();
    // A toll or infringement notice can come weeks after the trip: the Host reports it from here.
    expect(screen.getByRole('link', { name: 'Report an incident' })).toHaveAttribute(
      'href',
      `/incidents/new?booking=${REF}`,
    );
  });

  it('shows the refunds on the booking, who funds each, and what the Host was paid', async () => {
    const refunded = hostConfirmed({
      status: 'COMPLETED',
      actions: NO_ACTIONS,
      payout: {
        hostPayoutCents: 67_840,
        commissionCents: 16_960,
        commissionGstCents: 2_212,
        status: 'PAID',
        scheduledFor: '2026-10-09T01:00:00.000Z',
        paidAt: '2026-10-09T01:00:00.000Z',
        paidCents: 67_840 - 4_000 - 400,
        refunds: [
          { amountCents: 5_000, at: '2026-10-10T01:00:00.000Z', fundedBy: 'HOST', hostCents: 4_000 },
          { amountCents: 2_000, at: '2026-10-11T01:00:00.000Z', fundedBy: 'PLATFORM' },
          {
            amountCents: 500,
            at: '2026-10-12T01:00:00.000Z',
            fundedBy: 'HOST',
            hostCents: 400,
            extraCharge: true,
          },
        ],
      },
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: refunded } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    const earnings = within(await screen.findByRole('region', { name: 'What you earn' }));
    // The Host pays their share of a refund they fund; Rento Vroom covers its commission (plan §8.1, item 15).
    const yours = earnings.getByText('Funded by you: your share, $40, comes off your payout').closest('div')!;
    expect(yours).toHaveTextContent(/Refund to Kiri, .*10 Oct/);
    expect(yours).toHaveTextContent('$50');
    expect(earnings.getByText('Funded by Rento Vroom').closest('div')).toHaveTextContent('$20');
    // An extra charge's refund shows too.
    const charge = earnings.getByText('Funded by you: your share, $4, comes off your payout').closest('div')!;
    expect(charge).toHaveTextContent(/Refund to Kiri of an extra charge, .*12 Oct/);
    expect(earnings.getByText('Paid to you so far').nextElementSibling).toHaveTextContent('$634.40');
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

  it('says why a request can’t be accepted while the Guest’s account is on hold', async () => {
    const sent = mockHost((sentRequest) => {
      switch (`${sentRequest.method} ${sentRequest.path}`) {
        case `GET /bookings/${REF}`:
          return { status: 200, body: { booking: hostRequest() } };
        case `POST /bookings/${REF}/accept`:
          return {
            status: 409,
            body: {
              error: {
                code: 'GUEST_SUSPENDED',
                message:
                  "This guest's account is on hold, so the request can't be accepted. Our team will be in touch.",
              },
            },
          };
        case 'GET /bookings':
          return { status: 200, body: { bookings: [] } };
        default:
          return undefined;
      }
    });
    renderWithRouter(routes, `/host/bookings/${REF}`);

    await userEvent.click(await screen.findByRole('button', { name: 'Accept request' }));

    expect(await screen.findByText('We couldn’t accept this request')).toBeInTheDocument();
    expect(
      screen.getByText(
        "This guest's account is on hold, so the request can't be accepted. Our team will be in touch.",
      ),
    ).toBeInTheDocument();
    // Still a request: nothing was charged or confirmed.
    expect(screen.getByRole('heading', { name: 'Kiri would like to book your car' })).toBeInTheDocument();
    expect(sent.filter((entry) => entry.path.endsWith('/accept'))).toHaveLength(1);
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

  it('says a request expired because it wasn’t answered in time', async () => {
    mockHost((sentRequest) =>
      sentRequest.path === `/bookings/${REF}`
        ? {
            status: 200,
            body: {
              booking: hostRequest({
                status: 'EXPIRED',
                requestExpiresAt: undefined,
                payment: { status: 'CANCELLED' },
                expiry: { reason: 'HOST_NO_ANSWER', paymentReturned: false },
                actions: NO_ACTIONS,
              }),
            },
          }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(await screen.findByText('This request expired')).toBeInTheDocument();
    expect(
      screen.getByText('It wasn’t answered in time, so Kiri’s card authorisation was released.'),
    ).toBeInTheDocument();
  });

  it('shows what the booking earned, and what its payouts settled for other bookings', async () => {
    const completed = hostConfirmed({
      status: 'COMPLETED',
      actions: NO_ACTIONS,
      payout: {
        hostPayoutCents: 21_360,
        commissionCents: 5_340,
        commissionGstCents: 697,
        type: 'TRIP',
        status: 'PAID',
        scheduledFor: '2026-10-09T01:00:00.000Z',
        paidAt: '2026-10-09T01:00:00.000Z',
        paidCents: 13_760,
        earnings: {
          rentalCents: 26_700,
          deliveryCents: 0,
          extraChargesCents: 1_750,
          keptFeeCents: 0,
          commissionCents: 5_690,
          commissionGstCents: 743,
          hostFundedRefundsCents: 4_000,
          hostCancellationFeeCents: 0,
          netCents: 18_760,
        },
        settled: [{ type: 'HOST_CANCELLATION_FEE', amountCents: 5_000 }],
      },
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: completed } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    const earnings = within(await screen.findByRole('region', { name: 'What you earn' }));
    // The same figure as the booking's row on the earnings page.
    expect(earnings.getByText('You earn').nextElementSibling).toHaveTextContent('NZ$187.60');
    expect(earnings.getByText('Platform commission').closest('div')).toHaveTextContent('−$56.90');
    expect(earnings.getByText('Refunds you fund').closest('div')).toHaveTextContent('−$40');
    expect(earnings.getByText('Paid to you so far').nextElementSibling).toHaveTextContent('$137.60');
    // The $50 fee owed from another booking came off these payouts: with it they add up to what was earned.
    expect(earnings.getByText('Settled: Host cancellation fee').closest('div')).toHaveTextContent('$50');
  });

  it('shows a cancelled booking’s kept share, when it’s paid, and a payout already sent, owed back', async () => {
    const keptShare = hostConfirmed({
      status: 'CANCELLED',
      guest: hostRequest().guest,
      actions: NO_ACTIONS,
      cancellation: {
        at: '2026-10-08T01:00:00.000Z',
        by: 'GUEST',
        reason: 'GUEST_CANCELLED',
        refundCents: 19_185,
        feeCents: 14_685,
        hostShareCents: 10_680,
      },
      payout: {
        hostPayoutCents: 21_360,
        commissionCents: 5_340,
        commissionGstCents: 697,
        type: 'CANCELLATION_FEE',
        status: 'SCHEDULED',
        scheduledFor: '2026-10-11T01:00:00.000Z',
        earnings: {
          rentalCents: 0,
          deliveryCents: 0,
          extraChargesCents: 0,
          keptFeeCents: 13_350,
          commissionCents: 2_670,
          commissionGstCents: 348,
          hostFundedRefundsCents: 0,
          hostCancellationFeeCents: 0,
          netCents: 10_680,
        },
        refunds: [
          { amountCents: 19_185, at: '2026-10-08T01:00:00.000Z', fundedBy: 'HOST', cancellation: true },
        ],
      },
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: keptShare } }
        : undefined,
    );
    const { unmount } = renderWithRouter(routes, `/host/bookings/${REF}`);

    // Its own payout, 24 hours after the trip's start: not the next one.
    expect(
      await screen.findByText(
        /^Kiri cancelled\. Your share of the fee kept, \$106\.80, is paid on its own, from /,
      ),
    ).toBeInTheDocument();
    const earnings = within(screen.getByRole('region', { name: 'What you earn' }));
    expect(earnings.getByText('You earn').nextElementSibling).toHaveTextContent('NZ$106.80');
    expect(earnings.getByText('Your part of the fee kept').closest('div')).toHaveTextContent('$133.50');
    expect(earnings.getByText('Under the cancellation policy')).toBeInTheDocument();
    expect(earnings.getByText(/Paid to your Stripe account from/)).toBeInTheDocument();
    unmount();

    // Support cancelled a no-show after the trip's payout was sent: the Host keeps their share of it.
    const noShow = hostConfirmed({
      ...keptShare,
      cancellation: { ...keptShare.cancellation!, by: 'SUPPORT', reason: 'GUEST_NO_SHOW' },
      payout: {
        ...keptShare.payout!,
        type: 'TRIP',
        status: 'PAID',
        scheduledFor: '2026-10-07T01:00:00.000Z',
        paidAt: '2026-10-07T01:00:00.000Z',
        paidCents: 21_360,
        owed: { refundsCents: 0, payoutSentCents: 10_680 },
      },
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: noShow } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    expect(
      await screen.findByText(
        'Rento Vroom support cancelled this booking as a guest no-show, and Kiri was refunded $191.85. The trip’s payout was already sent: you keep $106.80 of it, your share of the fee kept.',
      ),
    ).toBeInTheDocument();
    const money = within(screen.getByRole('region', { name: 'What you earn' }));
    expect(money.getByText('Paid to you so far').nextElementSibling).toHaveTextContent('$213.60');
    expect(money.getByText('Payout already sent, owed back').closest('div')).toHaveTextContent('−$106.80');
  });

  it('shows a Host’s own cancellation fee on the cancelled booking', async () => {
    const cancelled = hostConfirmed({
      status: 'CANCELLED',
      guest: hostRequest().guest,
      actions: NO_ACTIONS,
      cancellation: {
        at: '2026-10-08T01:00:00.000Z',
        by: 'HOST',
        reason: 'HOST_CANCELLED',
        refundCents: 105_080,
        hostFeeCents: 2_000,
      },
      payout: {
        hostPayoutCents: 67_840,
        commissionCents: 16_960,
        commissionGstCents: 2_212,
        earnings: {
          rentalCents: 0,
          deliveryCents: 0,
          extraChargesCents: 0,
          keptFeeCents: 0,
          commissionCents: 0,
          commissionGstCents: 0,
          hostFundedRefundsCents: 0,
          hostCancellationFeeCents: 2_000,
          netCents: -2_000,
        },
      },
    });
    mockHost((sentRequest) =>
      sentRequest.method === 'GET' && sentRequest.path === `/bookings/${REF}`
        ? { status: 200, body: { booking: cancelled } }
        : undefined,
    );
    renderWithRouter(routes, `/host/bookings/${REF}`);

    const money = within(await screen.findByRole('region', { name: 'What you earn' }));
    expect(money.getByText('Host cancellation fee').closest('div')).toHaveTextContent('−$20');
    expect(money.getByText('Nothing more is paid for this booking.')).toBeInTheDocument();
    expect(money.queryByText('The guest pays')).not.toBeInTheDocument();
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
