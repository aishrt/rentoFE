import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Booking, CancellationPreview } from '@/api/types';
import { booking as bookingFixture, confirmedBooking } from '@/features/booking/test-fixtures';
import { mockRoutes, type SentRequest } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { TripPage } from './trip-page';

vi.mock('@/features/payments/stripe', () => ({
  getStripe: () => Promise.resolve(null),
  stripeAppearance: {},
  stripeKeyMode: () => 'test',
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

const REF = 'RV-7K2Q9M';

type Answer = { status: number; body?: unknown } | undefined;

function preview(overrides: Partial<CancellationPreview> = {}): CancellationPreview {
  return {
    allowed: true,
    kind: 'GUEST_CANCELLATION',
    refundCents: 52_540,
    feeCents: 52_540,
    hostShareCents: 0,
    hostFeeCents: 0,
    refundPct: 50,
    hoursBeforeStart: 30,
    message: 'You’ll get 50% back: $525.40 to your card within 5–10 working days.',
    ...overrides,
  };
}

function mockTrip(trip: Booking, more: (request: SentRequest) => Answer = () => undefined) {
  return mockRoutes((request) => {
    const answer = more(request);
    if (answer) return answer;
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case `GET /bookings/${REF}`:
        return { status: 200, body: { booking: trip } };
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/trips/:ref', element: <TripPage /> },
      { path: '/trips', element: <p>All trips page</p> },
      { path: '/host/bookings/:ref', element: <p>Host booking page</p> },
    ],
    `/trips/${REF}`,
  );

describe('TripPage', () => {
  it('shows a confirmed trip with the exact address, the plate, the host’s mobile and the receipt', async () => {
    mockTrip(confirmedBooking());
    render();

    expect(await screen.findByRole('heading', { level: 1, name: '2022 Toyota RAV4' })).toBeInTheDocument();
    expect(screen.getByText('You’re booked')).toBeInTheDocument();
    expect(screen.getByText('12 Hawthorne Drive, Frankton, Queenstown 9300')).toBeInTheDocument();
    expect(screen.getByText('Keys in the lockbox.')).toBeInTheDocument();
    expect(screen.getByText('RAV422')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+64211234567' })).toHaveAttribute('href', 'tel:+64211234567');

    const receipt = within(screen.getByRole('region', { name: 'Receipt' }));
    expect(receipt.getByText('Paid')).toBeInTheDocument();
    expect(receipt.getByText(`Booking reference ${REF}. Prices include GST.`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      `/contact?category=BOOKING&booking=${REF}`,
    );
  });

  it('keeps the address and mobile back until the booking is confirmed', async () => {
    mockTrip(
      bookingFixture({
        status: 'PENDING',
        instantBook: false,
        holdExpiresAt: undefined,
        requestExpiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
        payment: { status: 'AUTHORISED' },
        actions: { pay: false, cancel: false, withdraw: true, accept: false, decline: false },
      }),
    );
    render();

    expect(await screen.findByText('Waiting for Liam', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByText(/charged only if they\s+accept/)).toBeInTheDocument();
    expect(
      screen.getByText(/The exact address and any instructions show here once your booking is confirmed/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Liam’s mobile number shows here once your booking is confirmed.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Authorised on your card, not charged yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw request' }));
    expect(await screen.findByRole('dialog', { name: 'Withdraw your request?' })).toBeInTheDocument();
  });

  it('says a booking is waiting for the identity check, not for the host', async () => {
    mockTrip(
      bookingFixture({
        status: 'PENDING',
        verificationReview: 'PENDING',
        holdExpiresAt: undefined,
        requestExpiresAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
        payment: { status: 'AUTHORISED' },
        actions: { pay: false, cancel: false, withdraw: true, accept: false, decline: false },
      }),
    );
    render();

    const banner = (await screen.findByText('We’re checking your details')).closest('[role="status"]');
    expect(banner).toHaveTextContent(
      /confirm your booking as soon as it’s approved\. Your card is authorised for NZ\$1,050\.80 and charged only then\./,
    );
    expect(banner).toHaveTextContent(/If it isn’t decided by .* \(NZ time\), the booking expires/);
    // An Instant Book: the Host isn't part of it.
    expect(banner).not.toHaveTextContent('Liam');
    expect(screen.getByText('Verification in review')).toBeInTheDocument();
    expect(screen.queryByText('Waiting for Liam')).not.toBeInTheDocument();
  });

  it('says both are needed for a request, and when the host has already accepted', async () => {
    mockTrip(
      bookingFixture({
        status: 'PENDING',
        instantBook: false,
        verificationReview: 'PENDING',
        hostAccepted: true,
        holdExpiresAt: undefined,
        payment: { status: 'AUTHORISED' },
        actions: { pay: false, cancel: false, withdraw: true, accept: false, decline: false },
      }),
    );
    render();

    const banner = (await screen.findByText('We’re checking your details')).closest('[role="status"]');
    expect(banner).toHaveTextContent(/as soon as it’s approved\. Liam has already accepted\. Your card/);
  });

  it('explains a booking that ended because the identity check was rejected', async () => {
    mockTrip(
      bookingFixture({
        status: 'EXPIRED',
        verificationReview: 'REJECTED',
        holdExpiresAt: undefined,
        payment: { status: 'CANCELLED' },
        actions: { pay: false, cancel: false, withdraw: false, accept: false, decline: false },
      }),
    );
    render();

    expect(await screen.findByText(/We weren’t able to verify your identity/)).toBeInTheDocument();
    const status = screen.getByText('This booking expired').closest('[role="status"]') as HTMLElement;
    expect(within(status).getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      `/contact?category=ACCOUNT&booking=${REF}`,
    );
  });

  it('shows the refund before cancelling, then cancels with the reason', async () => {
    const cancelled = confirmedBooking({
      status: 'CANCELLED',
      payment: { status: 'PARTIALLY_REFUNDED' },
      cancellation: {
        at: new Date().toISOString(),
        by: 'GUEST',
        reason: 'GUEST_CANCELLED',
        refundCents: 52_540,
        feeCents: 52_540,
      },
      actions: { pay: false, cancel: false, withdraw: false, accept: false, decline: false },
    });
    const sent = mockTrip(confirmedBooking(), (request) => {
      if (request.path === `/bookings/${REF}/cancellation-preview`) return { status: 200, body: preview() };
      if (request.path === `/bookings/${REF}/cancel`) return { status: 200, body: { booking: cancelled } };
      if (request.path === '/bookings') return { status: 200, body: { bookings: [] } };
      return undefined;
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel trip' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this booking?' }));
    expect(await dialog.findByText(/You’ll get 50% back/)).toBeInTheDocument();
    expect(dialog.getByText('Refund to your card').nextElementSibling).toHaveTextContent('$525.40');
    expect(dialog.getByText('Kept under the cancellation policy').nextElementSibling).toHaveTextContent(
      '$525.40',
    );
    // Nothing is cancelled until the Guest confirms.
    expect(sent.some((request) => request.path.endsWith('/cancel'))).toBe(false);

    await userEvent.type(dialog.getByLabelText('Why are you cancelling? (optional)'), 'Plans changed');
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel booking' }));

    expect(await screen.findByText('You cancelled this trip')).toBeInTheDocument();
    expect(
      screen.getByText(/Refunded \$525\.40; \$525\.40 kept under the cancellation policy\./),
    ).toBeInTheDocument();
    expect(sent.find((request) => request.path.endsWith('/cancel'))?.body).toEqual({
      reason: 'Plans changed',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Cancel trip' })).not.toBeInTheDocument();
  });

  it('doesn’t promise an address or a mobile number on a booking that has ended', async () => {
    mockTrip(
      bookingFixture({
        status: 'EXPIRED',
        holdExpiresAt: undefined,
        actions: { pay: false, cancel: false, withdraw: false, accept: false, decline: false },
      }),
    );
    render();

    expect(await screen.findByText('This booking expired')).toBeInTheDocument();
    expect(
      screen.getByText('Mobile numbers are shared only while a booking is confirmed.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/once your booking is confirmed/)).not.toBeInTheDocument();
  });

  it('explains why a trip can’t be cancelled, without a confirm button', async () => {
    mockTrip(confirmedBooking(), (request) =>
      request.path.endsWith('/cancellation-preview')
        ? {
            status: 200,
            body: preview({
              allowed: false,
              kind: null,
              message: 'This trip has started. Contact support to end it early.',
            }),
          }
        : undefined,
    );
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel trip' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(
      await dialog.findByText('This trip has started. Contact support to end it early.'),
    ).toBeInTheDocument();
    expect(dialog.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Keep booking' })).toBeInTheDocument();
  });

  it('catches up with a payment made moments ago', async () => {
    const sent = mockTrip(bookingFixture(), (request) =>
      request.path === `/bookings/${REF}/payment/sync`
        ? { status: 200, body: { booking: confirmedBooking() } }
        : undefined,
    );
    render();

    expect(await screen.findByText('You’re booked')).toBeInTheDocument();
    expect(sent.filter((request) => request.path.endsWith('/payment/sync'))).toHaveLength(1);
    expect(screen.queryByText('Finish paying to book this trip')).not.toBeInTheDocument();
  });

  it('lets the Guest finish paying while the dates are held, or release them', async () => {
    mockTrip(bookingFixture(), (request) => {
      if (request.path === `/bookings/${REF}/payment/sync`) {
        return { status: 200, body: { booking: bookingFixture() } };
      }
      if (request.path.endsWith('/cancellation-preview')) {
        return {
          status: 200,
          body: preview({
            kind: 'ABANDON_CHECKOUT',
            refundCents: 0,
            feeCents: 0,
            message: 'Nothing has been charged. The dates go back on the calendar.',
          }),
        };
      }
      return undefined;
    });
    render();

    expect(
      await screen.findByRole('heading', { name: 'Finish paying to book this trip' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /I agree to the Guest Agreement/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Release these dates' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Release these dates?' }));
    expect(await dialog.findByText(/Nothing has been charged/)).toBeInTheDocument();
    // No money moves, so there are no figures and no reason to ask for.
    expect(dialog.queryByText('Refund to your card')).not.toBeInTheDocument();
    expect(dialog.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('sends the car’s Host to their own page for the booking', async () => {
    mockTrip(confirmedBooking({ role: 'HOST' }));
    render();

    expect(await screen.findByText('Host booking page')).toBeInTheDocument();
  });

  it('says so when the trip doesn’t exist', async () => {
    mockRoutes((request) => {
      if (request.path === '/auth/session') return { status: 200, body: { user: guestUser } };
      if (request.path === `/bookings/${REF}`) {
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Booking not found' } } };
      }
      return undefined;
    });
    render();

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that trip' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your trips' })).toHaveAttribute('href', '/trips');
  });
});
