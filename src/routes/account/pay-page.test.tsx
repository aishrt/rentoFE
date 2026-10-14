import type { StripeExpressCheckoutElementReadyEvent } from '@stripe/stripe-js';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes, type SentRequest } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { PayPage } from './pay-page';

const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn() }));

// Stripe's own elements are iframes from js.stripe.com; these stand-ins behave like them.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  ExpressCheckoutElement: ({
    onReady,
  }: {
    onReady: (event: StripeExpressCheckoutElementReadyEvent) => void;
  }) => {
    // Like Stripe's element, it reports once, when it has loaded. The form passes a new onReady on every
    // render, and onReady sets state, so reporting again on each one never stops.
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
}));

afterEach(() => {
  vi.unstubAllGlobals();
  stripe.confirmPayment.mockReset();
});

const CHARGE = {
  id: 'pay123',
  bookingRef: 'RV-7K2Q9M',
  vehicleTitle: '2021 Toyota Corolla',
  description: 'Sand through the back seats',
  type: 'CLEANING',
  amountCents: 6_000,
};

/** The pay link's charge, as GET /payments/{id} answers, and anything else the test answers. */
function mockCharge(
  payment: Record<string, unknown>,
  more: (request: SentRequest) => { status: number; body?: unknown } | undefined = () => undefined,
) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /payments/pay123':
        return { status: 200, body: { payment: { ...CHARGE, ...payment } } };
      default:
        return more(request);
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/pay/:id', element: <PayPage /> },
      { path: '/trips/:ref', element: <p>Trip page</p> },
    ],
    '/pay/pay123',
  );

describe('PayPage', () => {
  it('offers to pay a charge that’s due', async () => {
    mockCharge({ status: 'DUE', failureReason: 'Your card was declined.' });
    render();
    expect(await screen.findByRole('button', { name: 'Pay now' })).toBeInTheDocument();
    expect(screen.getByText(/Your card was declined\./)).toBeInTheDocument();
  });

  it('says a refunded charge was refunded, with nothing to pay', async () => {
    mockCharge({ status: 'REFUNDED', refundedCents: 6_000 });
    render();
    expect(await screen.findByRole('heading', { name: 'Refunded' })).toBeInTheDocument();
    expect(screen.getByText(/refunded to your card in full\. There’s nothing to pay\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your trip' })).toHaveAttribute(
      'href',
      '/trips/RV-7K2Q9M',
    );
  });

  it('says a cancelled charge was cancelled, with nothing to pay', async () => {
    mockCharge({ status: 'CANCELLED' });
    render();
    expect(await screen.findByRole('heading', { name: 'This charge was cancelled' })).toBeInTheDocument();
    expect(screen.getByText(/cancelled by our team, so there’s nothing to pay/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
  });

  it('says how much of a paid charge was refunded', async () => {
    mockCharge({ status: 'PAID', refundedCents: 2_000 });
    render();
    expect(await screen.findByRole('heading', { name: 'Paid, thank you' })).toBeInTheDocument();
    expect(screen.getByText(/\$20(\.00)? of it was refunded to your card/)).toBeInTheDocument();
  });

  it('says a link that doesn’t exist can’t be found', async () => {
    mockRoutes((request) =>
      request.path === '/auth/session'
        ? { status: 200, body: { user: guestUser } }
        : { status: 404, body: { error: { code: 'NOT_FOUND', message: 'We couldn’t find that payment.' } } },
    );
    render();
    expect(await screen.findByText('We couldn’t find that payment')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Your trips' })).toBeInTheDocument();
  });

  it('tells a failed load from a missing payment, and tries again', async () => {
    let failing = true;
    mockRoutes((request) => {
      if (request.path === '/auth/session') return { status: 200, body: { user: guestUser } };
      if (failing) {
        return { status: 500, body: { error: { code: 'INTERNAL', message: 'Something went wrong.' } } };
      }
      return { status: 200, body: { payment: { ...CHARGE, status: 'DUE' } } };
    });
    render();
    expect(await screen.findByText('We couldn’t load this payment')).toBeInTheDocument();
    expect(screen.queryByText('We couldn’t find that payment')).not.toBeInTheDocument();
    failing = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Pay now' })).toBeInTheDocument();
  });

  it('says a payment that went through was received when recording it fails, and refreshes the trip', async () => {
    const sent = mockCharge({ status: 'DUE' }, (request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /payments/pay123/pay':
          return { status: 200, body: { clientSecret: 'pi_1_secret', amountCents: 6_000, currency: 'nzd' } };
        case 'POST /payments/pay123/sync':
          return { status: 500, body: { error: { code: 'INTERNAL', message: 'Something went wrong.' } } };
        default:
          return undefined;
      }
    });
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_1', status: 'succeeded' } });
    const { queryClient } = render();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await userEvent.click(await screen.findByRole('button', { name: 'Pay now' }));
    await userEvent.click(await screen.findByRole('button', { name: /^Pay NZ\$60/ }));

    expect(await screen.findByText('Payment received')).toBeInTheDocument();
    expect(screen.getByText(/There’s no need to pay again/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pay now' })).not.toBeInTheDocument();
    // The trip, the trips list and the payment history are fetched afresh.
    await waitFor(() =>
      expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toEqual(
        expect.arrayContaining([['booking', 'RV-7K2Q9M'], ['bookings'], ['me', 'payments']]),
      ),
    );
    expect(sent.filter((request) => request.path === '/payments/pay123/sync')).toHaveLength(1);
  });
});
