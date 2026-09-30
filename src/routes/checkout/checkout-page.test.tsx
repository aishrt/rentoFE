import type { StripeExpressCheckoutElementReadyEvent } from '@stripe/stripe-js';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Booking, Quote, VehicleDetail } from '@/api/types';
import {
  booking as bookingFixture,
  confirmedBooking,
  paymentSession,
  readiness,
} from '@/features/booking/test-fixtures';
import {
  mockRoutes,
  policies,
  quote as quoteFixture,
  vehicleDetail,
  type SentRequest,
} from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { CheckoutPage } from './checkout-page';

const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn(), keyMode: vi.fn(() => 'test') }));

// Stripe's own elements are iframes from js.stripe.com; these stand-ins behave like them.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  ExpressCheckoutElement: ({
    onReady,
  }: {
    onReady: (event: StripeExpressCheckoutElementReadyEvent) => void;
  }) => {
    useEffect(() => {
      onReady({ elementType: 'expressCheckout', availablePaymentMethods: undefined });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  },
  PaymentElement: () => <div>Card number</div>,
  useStripe: () => ({ confirmPayment: stripe.confirmPayment }),
  useElements: () => ({ submit: async () => ({}) }),
}));

vi.mock('@/features/payments/stripe', () => ({
  getStripe: () => Promise.resolve(null),
  stripeAppearance: {},
  stripeKeyMode: stripe.keyMode,
}));

const SLUG = '2022-toyota-rav4-queenstown';
const TRIP = 'start=2026-12-01T10:00&end=2026-12-09T10:00';

type Answer = { status: number; body?: unknown } | undefined;

interface Api {
  user?: typeof guestUser | null;
  vehicle?: VehicleDetail;
  quote?: Quote;
  readiness?: () => ReturnType<typeof readiness>;
  createBooking?: () => Answer;
  booking?: Booking;
  payment?: () => Answer;
  sync?: () => Answer;
  extra?: (request: SentRequest) => Answer;
}

/** The API for a checkout; each test changes what it needs. */
function mockCheckoutApi(api: Api = {}) {
  const vehicle = api.vehicle ?? vehicleDetail();
  const held = api.booking ?? bookingFixture();
  return mockRoutes((request) => {
    const route = `${request.method} ${request.path}`;
    const extra = api.extra?.(request);
    if (extra) return extra;
    switch (route) {
      case 'POST /auth/session':
        return { status: 200, body: { user: api.user === undefined ? guestUser : api.user } };
      case `GET /vehicles/${SLUG}`:
        return { status: 200, body: { vehicle } };
      case `POST /vehicles/${vehicle.id}/quote`:
        return { status: 200, body: { quote: api.quote ?? quoteFixture() } };
      case `GET /vehicles/${vehicle.id}/availability`:
        return {
          status: 200,
          body: {
            from: '2026-09-30',
            to: '2027-03-30',
            busy: [],
            minNoticeHours: 4,
            bufferHours: 2,
            minDays: 1,
            maxDays: 30,
          },
        };
      case 'GET /policies':
        return { status: 200, body: policies };
      case 'GET /me/checkout':
        return { status: 200, body: api.readiness?.() ?? readiness() };
      case 'POST /bookings':
        return api.createBooking?.() ?? { status: 201, body: { booking: held } };
      case `GET /bookings/${held.ref}`:
        return { status: 200, body: { booking: held } };
      case `POST /bookings/${held.ref}/payment`:
        return api.payment?.() ?? { status: 200, body: paymentSession() };
      case `POST /bookings/${held.ref}/payment/sync`:
        return api.sync?.() ?? { status: 200, body: { booking: confirmedBooking() } };
      default:
        return undefined;
    }
  });
}

function renderCheckout(query = TRIP) {
  return renderWithRouter(
    [
      { path: '/book/:slug', element: <CheckoutPage /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
    ],
    `/book/${SLUG}?${query}`,
  );
}

/** Presses the current step's Continue once the price for the choices on screen has arrived. */
async function continueStep(name: string | RegExp = 'Continue') {
  const button = await screen.findByRole('button', { name });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}

/** Trip, protection and details, as a signed-in Guest. */
async function continueToVerification() {
  await continueStep();
  await continueStep();
  await continueStep();
}

beforeEach(() => {
  stripe.keyMode.mockReturnValue('test');
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  stripe.confirmPayment.mockReset();
});

describe('CheckoutPage: the trip', () => {
  it('prices the trip from the URL, sends the Host’s location for both ends, and explains what’s in the way', async () => {
    const sent = mockCheckoutApi({
      quote: quoteFixture({
        available: false,
        problems: [
          {
            code: 'NOTICE_TOO_SHORT',
            field: 'start',
            message: 'This host needs at least 4 hours’ notice before pick-up.',
          },
        ],
      }),
    });
    renderCheckout();

    const trip = await screen.findByRole('region', { name: /Your trip/ });
    const alert = await within(trip).findByRole('alert');
    expect(alert).toHaveTextContent('This trip can’t be booked yet');
    expect(alert).toHaveTextContent('This host needs at least 4 hours’ notice before pick-up.');

    const quoteRequest = sent.find((request) => request.path === '/vehicles/car-rav4/quote');
    expect(quoteRequest?.body).toEqual({
      start: '2026-12-01T10:00',
      end: '2026-12-09T10:00',
      pickupOptionId: 'opt-pickup',
      returnOptionId: 'opt-pickup',
      protectionPlanCode: 'BASIC',
    });

    // The price is on screen from the first step.
    expect(screen.getAllByText('Total NZD').length).toBeGreaterThan(0);

    // A trip with a problem can't go on to protection.
    await userEvent.click(within(trip).getByRole('button', { name: 'Continue' }));
    expect(screen.queryByRole('radio', { name: /Premium/ })).not.toBeInTheDocument();
  });

  it('tells a Host they can’t book their own car', async () => {
    mockCheckoutApi({ user: { ...guestUser, id: 'host-liam' } });
    renderCheckout();
    expect(await screen.findByRole('heading', { name: 'This is your car' })).toBeInTheDocument();
  });
});

describe('CheckoutPage: signing in midway', () => {
  it('keeps the car, dates and protection plan through logging in, then asks for the licence', async () => {
    let signedIn = false;
    const sent = mockCheckoutApi({
      user: null,
      readiness: () =>
        readiness({
          licence: null,
          hasDateOfBirth: false,
          problems: [{ code: 'LICENCE_REQUIRED', message: 'Add your driver licence details.' }],
        }),
      extra: (request) => {
        if (request.path === '/auth/login') {
          signedIn = true;
          return { status: 200, body: { user: guestUser } };
        }
        return undefined;
      },
    });
    const { router } = renderCheckout(`${TRIP}&plan=PREMIUM`);

    await continueStep();
    expect(await screen.findByRole('radio', { name: /Premium/ })).toBeChecked();
    await continueStep();
    await continueStep('Continue to log in');

    await userEvent.type(await screen.findByLabelText('Email address'), 'kiri@example.co.nz');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse battery');
    await userEvent.click(screen.getByRole('button', { name: 'Log in and continue' }));

    expect(await screen.findByRole('form', { name: 'Driver licence details' })).toBeInTheDocument();
    expect(signedIn).toBe(true);
    expect(screen.getByText(/Logged in as Kiri/)).toBeInTheDocument();
    expect(router.state.location.search).toContain('plan=PREMIUM');
    expect(router.state.location.search).toContain('start=2026-12-01T10:00');
    const quotes = sent.filter((request) => request.path === '/vehicles/car-rav4/quote');
    expect(
      quotes.every(
        (request) => (request.body as { protectionPlanCode: string }).protectionPlanCode === 'PREMIUM',
      ),
    ).toBe(true);
    // The licence is checked against the trip's end.
    expect(sent.find((request) => request.path === '/me/checkout')?.query.get('end')).toBe(
      '2026-12-09T10:00',
    );
  });
});

describe('CheckoutPage: verification', () => {
  it('saves the licence details, explains a problem, then holds the dates once nothing is missing', async () => {
    let saved: unknown;
    let ready = false;
    const sent = mockCheckoutApi({
      readiness: () =>
        ready
          ? readiness()
          : readiness({
              licence: {
                class: 'NZ_FULL',
                country: 'New Zealand',
                numberEnding: '456',
                expiry: '2026-11-01',
                status: 'PENDING',
              },
              problems: [
                { code: 'LICENCE_EXPIRES', message: 'Your licence needs to be valid until the trip ends.' },
              ],
            }),
      extra: (request) => {
        if (request.method === 'PUT' && request.path === '/me/driver-licence') {
          saved = request.body;
          ready = true;
          return { status: 200, body: readiness() };
        }
        return undefined;
      },
    });
    renderCheckout();
    await continueToVerification();

    const problem = await screen.findByRole('alert');
    expect(problem).toHaveTextContent('Your licence needs to be valid until the trip ends.');
    expect(problem).toHaveTextContent('If you’ve renewed your licence, enter the new card’s details below.');

    const form = screen.getByRole('form', { name: 'Driver licence details' });
    await userEvent.type(within(form).getByLabelText('Licence number'), 'ab123456');
    await userEvent.type(within(form).getByLabelText('Version'), '123');
    const fill = async (legend: string, day: string, month: string, year: string) => {
      const group = within(within(form).getByRole('group', { name: legend }));
      await userEvent.type(group.getByLabelText('Day'), day);
      await userEvent.type(group.getByLabelText('Month'), month);
      await userEvent.type(group.getByLabelText('Year'), year);
    };
    await fill('First issued', '4', '2', '2012');
    await fill('Expires', '4', '2', '2032');
    await fill('Date of birth', '21', '4', '1990');
    await userEvent.click(within(form).getByRole('button', { name: 'Update licence details' }));

    expect(await screen.findByText('We’re holding these dates for you')).toBeInTheDocument();
    expect(saved).toEqual({
      class: 'NZ_FULL',
      number: 'AB123456',
      version: '123',
      country: 'New Zealand',
      notInEnglish: false,
      issuedAt: '2012-02-04',
      expiry: '2032-02-04',
      dob: '1990-04-21',
    });
    expect(screen.getByRole('timer')).toHaveTextContent(/^(30:00|29:\d\d) left$/);
    const created = sent.find((request) => request.method === 'POST' && request.path === '/bookings');
    expect(created?.body).toMatchObject({
      vehicleId: 'car-rav4',
      start: '2026-12-01T10:00',
      returnOptionId: 'opt-pickup',
    });
  });
});

describe('CheckoutPage: payment', () => {
  it('confirms and pays for Instant Book, syncs the payment, then shows the tick and opens the trip', async () => {
    const sent = mockCheckoutApi();
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_123', status: 'succeeded' } });
    const { router } = renderCheckout();
    await continueToVerification();

    await userEvent.click(await screen.findByRole('checkbox', { name: /I agree to the Guest Agreement/ }));
    expect(screen.getByRole('link', { name: 'Guest Agreement' })).toHaveAttribute('href', '/guest-agreement');
    const pay = await screen.findByRole('button', { name: 'Confirm and pay' });
    // Shown in the desktop panel and in the phone bar.
    expect(
      screen.getAllByText(/You’ll be charged NZ\$1,050\.80\. Your card issuer converts it\./).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Final price' })).toBeInTheDocument();
    expect(sent.find((request) => request.path === '/bookings/RV-7K2Q9M/payment')?.body).toEqual({
      acceptGuestAgreement: true,
    });

    await userEvent.click(pay);
    expect(await screen.findByText('Booked')).toBeInTheDocument();
    expect(stripe.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        redirect: 'if_required',
        confirmParams: { return_url: `${window.location.origin}/trips/RV-7K2Q9M` },
      }),
    );
    expect(sent.some((request) => request.path === '/bookings/RV-7K2Q9M/payment/sync')).toBe(true);
    expect(await screen.findByText('Trip page')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/trips/RV-7K2Q9M');
  });

  it('asks to book when the car isn’t Instant Book: the card is authorised, not charged', async () => {
    mockCheckoutApi({
      vehicle: vehicleDetail({ rules: { ...vehicleDetail().rules, instantBook: false } }),
      quote: quoteFixture({ instantBook: false }),
      booking: bookingFixture({ instantBook: false }),
      payment: () => ({ status: 200, body: paymentSession({ captureMethod: 'manual' }) }),
    });
    renderCheckout();
    expect(await screen.findByRole('heading', { level: 1, name: 'Request to book' })).toBeInTheDocument();
    await continueToVerification();

    await userEvent.click(await screen.findByRole('checkbox', { name: /I agree to the Guest Agreement/ }));
    expect(await screen.findByRole('button', { name: 'Request to book' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm and pay' })).not.toBeInTheDocument();
    expect(
      screen.getAllByText(/Your card is authorised for NZ\$1,050\.80 now and charged only if Liam accepts\./)
        .length,
    ).toBeGreaterThan(0);
  });

  it('shows why a payment failed and keeps the dates held', async () => {
    const sent = mockCheckoutApi({
      sync: () => ({ status: 200, body: { booking: bookingFixture() } }),
    });
    stripe.confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } });
    renderCheckout();
    await continueToVerification();

    await userEvent.click(await screen.findByRole('checkbox', { name: /I agree to the Guest Agreement/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Confirm and pay' }));
    expect(await screen.findByText('Your card was declined.')).toBeInTheDocument();
    expect(
      screen.getByText('Your dates are still held. Try again, or use another card or wallet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('We’re holding these dates for you')).toBeInTheDocument();
    await waitFor(() =>
      expect(sent.some((request) => request.path === '/bookings/RV-7K2Q9M/payment/sync')).toBe(true),
    );
  });

  it('says when payments aren’t set up in this build', async () => {
    stripe.keyMode.mockReturnValue('missing');
    mockCheckoutApi();
    renderCheckout();
    await continueToVerification();
    expect(await screen.findByText('Payments aren’t set up yet')).toBeInTheDocument();
  });
});

describe('CheckoutPage: when the dates slip away', () => {
  it('goes back to the trip when someone else books the dates first', async () => {
    const sent = mockCheckoutApi({
      createBooking: () => ({
        status: 409,
        body: {
          error: {
            code: 'DATES_UNAVAILABLE',
            message: 'Those dates are no longer available. Please choose others.',
          },
        },
      }),
    });
    renderCheckout();
    await continueToVerification();

    const trip = screen.getByRole('region', { name: /Your trip/ });
    expect(await within(trip).findByText(/Someone has just booked some of these times/)).toBeInTheDocument();
    expect(within(trip).getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    // The price and availability are asked for again.
    await waitFor(() =>
      expect(sent.filter((request) => request.path === '/vehicles/car-rav4/quote').length).toBeGreaterThan(1),
    );
  });

  it('offers to hold the dates again once the 30 minutes are up', async () => {
    let creates = 0;
    mockCheckoutApi({
      createBooking: () => {
        creates += 1;
        return { status: 201, body: { booking: bookingFixture() } };
      },
      payment: () => ({
        status: 409,
        body: {
          error: { code: 'HOLD_EXPIRED', message: 'We held these dates for 30 minutes and the time is up.' },
        },
      }),
    });
    renderCheckout();
    await continueToVerification();

    await userEvent.click(await screen.findByRole('checkbox', { name: /I agree to the Guest Agreement/ }));
    expect(await screen.findByText('Time’s up: the dates were released')).toBeInTheDocument();
    expect(creates).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Hold the dates again' }));
    await waitFor(() => expect(creates).toBe(2));
    expect(await screen.findByText('We’re holding these dates for you')).toBeInTheDocument();
  });
});
