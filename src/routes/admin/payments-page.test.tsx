import type { AvailablePaymentMethods, StripeExpressCheckoutElementReadyEvent } from '@stripe/stripe-js';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminPaymentsPage } from './payments-page';

const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  keyMode: vi.fn(() => 'test'),
  wallets: undefined as AvailablePaymentMethods | undefined,
}));

// Stripe's own elements are iframes from js.stripe.com; these stand-ins behave like them.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  ExpressCheckoutElement: ({
    onReady,
    onConfirm,
  }: {
    onReady: (event: StripeExpressCheckoutElementReadyEvent) => void;
    onConfirm: (event: { paymentFailed: () => void }) => void;
  }) => {
    useEffect(() => {
      onReady({ elementType: 'expressCheckout', availablePaymentMethods: stripe.wallets });
    }, [onReady]);
    return stripe.wallets?.applePay ? (
      <button type="button" onClick={() => onConfirm({ paymentFailed: vi.fn() })}>
        Book with Apple Pay
      </button>
    ) : null;
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

const created = { id: 'pi_123', clientSecret: 'pi_123_secret_abc', amountCents: 100, currency: 'nzd' };
const paidWithApplePay = {
  id: 'pi_123',
  status: 'succeeded',
  amountCents: 100,
  currency: 'nzd',
  paymentMethod: { type: 'card', wallet: 'apple_pay', brand: 'visa', last4: '4242' },
  webhookReceived: true,
};

const render = () =>
  renderWithRouter([{ path: '/admin/payments', element: <AdminPaymentsPage /> }], '/admin/payments');

const section = async () => within(await screen.findByRole('region', { name: 'Test payment' }));

beforeEach(() => {
  stripe.keyMode.mockReturnValue('test');
  stripe.wallets = {
    applePay: true,
    googlePay: true,
    link: false,
    paypal: false,
    amazonPay: false,
    klarna: false,
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  stripe.confirmPayment.mockReset();
});

describe('AdminPaymentsPage: test payment', () => {
  it('pays NZ$1 with Apple Pay, then shows how it was paid and that the webhook arrived', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'POST /admin/payments/test': { status: 201, body: created },
      'GET /admin/payments/test/pi_123': { status: 200, body: paidWithApplePay },
    });
    stripe.confirmPayment.mockResolvedValue({ paymentIntent: { id: 'pi_123', status: 'succeeded' } });
    render();

    const test = await section();
    await userEvent.click(await test.findByRole('button', { name: 'Start a NZ$1 test payment' }));
    expect(await test.findByText(/You’ll be charged/)).toHaveTextContent('You’ll be charged $1.');
    await userEvent.click(test.getByRole('button', { name: 'Book with Apple Pay' }));

    const result = within(await test.findByRole('list', { name: 'Test payment result' }));
    expect(result.getByText('Paid NZ$1.00 in the sandbox')).toBeInTheDocument();
    expect(result.getByText('Paid with Apple Pay (Visa •••• 4242)')).toBeInTheDocument();
    expect(result.getByText('The webhook reached the API')).toBeInTheDocument();
    expect(stripe.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({ redirect: 'if_required' }));
  });

  it("shows why a card payment didn't go through, and says when wallets can't show", async () => {
    stripe.wallets = undefined;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'POST /admin/payments/test': { status: 201, body: created },
    });
    stripe.confirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } });
    render();

    const test = await section();
    await userEvent.click(await test.findByRole('button', { name: 'Start a NZ$1 test payment' }));
    expect(
      await test.findByText(/Apple Pay and Google Pay aren’t available on this device/),
    ).toBeInTheDocument();
    await userEvent.click(test.getByRole('button', { name: 'Pay NZ$1.00' }));

    expect(await test.findByRole('alert')).toHaveTextContent('Your card was declined.');
  });

  it("explains when this build has no Stripe key, or it's live", async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: adminUser } } });
    stripe.keyMode.mockReturnValue('missing');
    const { unmount } = render();
    expect(await (await section()).findByText("Stripe isn't set up in this build")).toBeInTheDocument();
    unmount();

    stripe.keyMode.mockReturnValue('live');
    render();
    expect(await (await section()).findByText('This build uses live Stripe keys')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start a NZ\$1/ })).not.toBeInTheDocument();
  });

  it('is only for administrators', async () => {
    mockApi({ 'POST /auth/session': { status: 200, body: { user: { ...adminUser, roles: ['SUPPORT'] } } } });
    render();
    expect(
      await (await section()).findByText('Only administrators can run a test payment.'),
    ).toBeInTheDocument();
  });
});
