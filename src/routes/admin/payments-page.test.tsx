import type { AvailablePaymentMethods, StripeExpressCheckoutElementReadyEvent } from '@stripe/stripe-js';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminPayment, AdminPayout } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminPaymentsPage } from './payments-page';

const stripe = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  keyMode: vi.fn(() => 'test'),
  wallets: undefined as AvailablePaymentMethods | undefined,
  /** Set to make the wallet element fail to load with this message. */
  loadError: undefined as string | undefined,
}));

// Stripe's own elements are iframes from js.stripe.com; these stand-ins behave like them.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  ExpressCheckoutElement: ({
    onReady,
    onLoadError,
    onConfirm,
  }: {
    onReady: (event: StripeExpressCheckoutElementReadyEvent) => void;
    onLoadError: (event: { elementType: 'expressCheckout'; error: { message: string } }) => void;
    onConfirm: (event: { paymentFailed: () => void }) => void;
  }) => {
    // Like Stripe's element, it reports once, when it has loaded (or failed to).
    useEffect(() => {
      if (stripe.loadError)
        onLoadError({ elementType: 'expressCheckout', error: { message: stripe.loadError } });
      else onReady({ elementType: 'expressCheckout', availablePaymentMethods: stripe.wallets });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
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

// The Stripe test payment has its own tab.
const render = (path = '/admin/payments?tab=test') =>
  renderWithRouter(
    [
      {
        path: '/admin/payments',
        element: (
          <>
            <AdminPaymentsPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

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
  stripe.loadError = undefined;
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
    expect(
      test.getByText('Stripe reported these wallets can show here: Apple Pay, Google Pay.'),
    ).toBeInTheDocument();
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
      await test.findByText(/Apple Pay and Google Pay aren't available on this device/),
    ).toBeInTheDocument();
    expect(test.getByText('Stripe reported that no wallet can show here.')).toBeInTheDocument();
    await userEvent.click(test.getByRole('button', { name: 'Pay NZ$1.00' }));

    expect(await test.findByRole('alert')).toHaveTextContent('Your card was declined.');
  });

  it("says when the wallet buttons fail to load, with Stripe's error, and still takes cards", async () => {
    stripe.loadError = 'The Express Checkout Element could not be loaded.';
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'POST /admin/payments/test': { status: 201, body: created },
    });
    render();

    const test = await section();
    await userEvent.click(await test.findByRole('button', { name: 'Start a NZ$1 test payment' }));
    expect(
      await test.findByText("Apple Pay and Google Pay couldn't load. You can still pay by card below."),
    ).toBeInTheDocument();
    expect(
      test.getByText("Stripe's error: The Express Checkout Element could not be loaded."),
    ).toBeInTheDocument();
    expect(test.getByRole('button', { name: 'Pay NZ$1.00' })).toBeEnabled();
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

const supportUser = { ...adminUser, id: 'u3', firstName: 'Sam', roles: ['SUPPORT'] };

const refunded: AdminPayment = {
  id: 'pay1',
  bookingRef: 'RV-7K2Q9M',
  guestName: 'Kiri Tane',
  type: 'BOOKING',
  amountCents: 50650,
  status: 'PARTIALLY_REFUNDED',
  method: 'Visa •••• 4242',
  refundedCents: 10000,
  refunds: [
    {
      amountCents: 10000,
      reason: 'The car was an hour late at pick-up',
      fundedBy: 'HOST',
      status: 'SUCCEEDED',
      at: '2026-10-02T01:00:00.000Z',
    },
    {
      amountCents: 5000,
      reason: 'Goodwill credit',
      fundedBy: 'PLATFORM',
      status: 'FAILED',
      failureReason: 'The card has expired.',
      at: '2026-10-03T01:00:00.000Z',
    },
  ],
  createdAt: '2026-09-28T21:30:00.000Z',
};

const disputed: AdminPayment = {
  id: 'pay2',
  bookingRef: 'RV-3H8D2L',
  guestName: 'Mere Paki',
  type: 'EXTRA_CHARGE',
  amountCents: 8000,
  status: 'SUCCEEDED',
  refundedCents: 0,
  refunds: [],
  // 11 pm on Thursday 15 October in New Zealand.
  dispute: { status: 'needs_response', reason: 'product_not_received', dueBy: '2026-10-15T10:00:00.000Z' },
  createdAt: '2026-10-01T02:00:00.000Z',
};

const scheduled: AdminPayout = {
  id: 'po1',
  bookingRef: 'RV-7K2Q9M',
  host: { id: 'h1', name: 'Aroha Ngata' },
  type: 'TRIP',
  status: 'SCHEDULED',
  amountCents: 42000,
  deductedCents: 0,
  scheduledFor: '2026-10-09T20:00:00.000Z',
};

const held: AdminPayout = {
  id: 'po2',
  bookingRef: 'RV-3H8D2L',
  host: { id: 'h2', name: 'Rangi Walker' },
  type: 'TRIP',
  status: 'HELD',
  holdReason: 'INCIDENT',
  amountCents: 30000,
  deductedCents: 2500,
  scheduledFor: '2026-10-05T20:00:00.000Z',
};

const failed: AdminPayout = {
  ...scheduled,
  id: 'po3',
  bookingRef: 'RV-9P4X7Q',
  status: 'FAILED',
  failureReason: 'The bank account was closed.',
};

/** The query string of each request to this path, in order. */
const queries = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith(path))
    .map((url) => url.searchParams);

const row = async (name: RegExp) => within(await screen.findByRole('row', { name }));

describe('AdminPaymentsPage: payments', () => {
  it('lists payments with their refunds, failures and disputes', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payments': { status: 200, body: { payments: [refunded, disputed], total: 2, page: 1 } },
    });
    render('/admin/payments');

    const first = await row(/RV-7K2Q9M/);
    expect(first.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(first.getByText('Kiri Tane')).toBeInTheDocument();
    expect(first.getByText('$506.50')).toBeInTheDocument();
    expect(first.getByText('$100')).toBeInTheDocument();
    expect(first.getByText('Part refunded')).toBeInTheDocument();
    expect(first.getByText('Visa •••• 4242')).toBeInTheDocument();

    // The refund lines open below the payment.
    const toggle = first.getByRole('button', { name: '2 refunds (1 failed)' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Refunds on RV-7K2Q9M' })).not.toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const refunds = within(screen.getByRole('list', { name: 'Refunds on RV-7K2Q9M' }));
    expect(refunds.getByText('The car was an hour late at pick-up')).toBeInTheDocument();
    expect(refunds.getByText('Paid by the Host')).toBeInTheDocument();
    expect(refunds.getByText('The card has expired.')).toBeInTheDocument();

    const second = await row(/RV-3H8D2L/);
    expect(second.getByText('Extra charge')).toBeInTheDocument();
    expect(second.getByText('Dispute: Needs response')).toBeInTheDocument();
    expect(second.getByText('Product not received')).toBeInTheDocument();
    expect(second.getByText('Respond by Thu, 15 Oct')).toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 payments')).toBeInTheDocument();
  });

  it('shows failed, disputed or failed-refund payments, with the view in the address', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payments': { status: 200, body: { payments: [disputed], total: 1, page: 1 } },
    });
    const { router } = render('/admin/payments');

    await row(/RV-3H8D2L/);
    expect(queries(fetchMock, '/admin/payments')[0]?.get('view')).toBe('all');
    await userEvent.click(screen.getByRole('tab', { name: 'Disputed' }));

    await vi.waitFor(() =>
      expect(queries(fetchMock, '/admin/payments').at(-1)?.get('view')).toBe('disputed'),
    );
    expect(router.state.location.search).toBe('?view=disputed');
    expect(screen.getByRole('tab', { name: 'Disputed' })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens on the failed payments from the overview’s link', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payments': { status: 200, body: { payments: [], total: 0, page: 1 } },
    });
    render('/admin/payments?view=failed');

    expect(await screen.findByText('No failed payments')).toBeInTheDocument();
    expect(queries(fetchMock, '/admin/payments')[0]?.get('view')).toBe('failed');
  });

  it('asks support staff without the refunds permission to ask the admin, calmly', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /admin/payments': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render('/admin/payments');

    expect(
      await screen.findByText('Ask the admin for the refunds permission to see payments.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The Stripe test is the admin's.
    expect(screen.getByRole('tab', { name: 'Payouts' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Stripe test' })).not.toBeInTheDocument();
  });
});

describe('AdminPaymentsPage: payouts', () => {
  it('opens from the Payouts tab', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payments': { status: 200, body: { payments: [], total: 0, page: 1 } },
      'GET /admin/payouts': { status: 200, body: { payouts: [scheduled], total: 1, page: 1 } },
    });
    const { router } = render('/admin/payments');

    await screen.findByText('No payments');
    await userEvent.click(screen.getByRole('tab', { name: 'Payouts' }));

    const payout = await row(/RV-7K2Q9M/);
    expect(payout.getByRole('link', { name: 'Aroha Ngata' })).toHaveAttribute('href', '/admin/users/h1');
    expect(payout.getByText('$420')).toBeInTheDocument();
    expect(payout.getByText('Scheduled')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=payouts');
    expect(queries(fetchMock, '/admin/payouts')).toHaveLength(1);
  });

  it('holds a payout with a reason, and updates its row', async () => {
    let sent: unknown;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payouts': { status: 200, body: { payouts: [scheduled, held], total: 2, page: 1 } },
      'POST /admin/payouts/po1/hold': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { payout: { ...scheduled, status: 'HELD', holdReason: 'MANUAL' } } };
      },
    });
    render('/admin/payments?tab=payouts');

    expect((await row(/RV-3H8D2L/)).getByText('An incident is open')).toBeInTheDocument();
    await userEvent.click(
      (await row(/RV-7K2Q9M/)).getByRole('button', { name: 'Hold payout for RV-7K2Q9M' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Hold Aroha Ngata’s payout?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Hold payout' }));
    expect(await dialog.findByText('Say why you’re holding it')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.type(dialog.getByLabelText('Why you’re holding it'), 'Checking the damage photos first');
    await userEvent.click(dialog.getByRole('button', { name: 'Hold payout' }));

    expect(await screen.findByText('Aroha Ngata’s payout is on hold')).toBeInTheDocument();
    expect(sent).toEqual({ reason: 'Checking the damage photos first' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const updated = await row(/RV-7K2Q9M/);
    expect(updated.getByText('Held by staff')).toBeInTheDocument();
    expect(updated.getByRole('button', { name: 'Release payout for RV-7K2Q9M' })).toBeInTheDocument();
  });

  it('explains when a released payout goes straight back on hold', async () => {
    let released = false;
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payouts': { status: 200, body: { payouts: [held], total: 1, page: 1 } },
      'POST /admin/payouts/po2/release': () => {
        released = true;
        return { status: 200, body: { payout: held } };
      },
    });
    render('/admin/payments?tab=payouts');

    await userEvent.click(
      (await row(/RV-3H8D2L/)).getByRole('button', { name: 'Release payout for RV-3H8D2L' }),
    );
    const dialog = within(await screen.findByRole('dialog', { name: 'Release Rangi Walker’s payout?' }));
    expect(
      dialog.getByText(/if one still applies, such as an open incident or card dispute/),
    ).toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Release payout' }));

    expect(await screen.findByText('Rangi Walker’s payout is still on hold')).toBeInTheDocument();
    expect(screen.getByText('An incident is open. It’s released once that’s sorted.')).toBeInTheDocument();
    expect(released).toBe(true);
  });

  it('sends a failed payout again', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payouts': { status: 200, body: { payouts: [failed], total: 1, page: 1 } },
      'POST /admin/payouts/po3/retry': { status: 200, body: { payout: { ...failed, status: 'SCHEDULED' } } },
    });
    render('/admin/payments?tab=payouts');

    const payout = await row(/RV-9P4X7Q/);
    expect(payout.getByText('The bank account was closed.')).toBeInTheDocument();
    await userEvent.click(payout.getByRole('button', { name: 'Retry payout for RV-9P4X7Q' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Send Aroha Ngata’s payout again?' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Send again' }));

    expect(await screen.findByText('Aroha Ngata’s payout is queued again')).toBeInTheDocument();
    expect((await row(/RV-9P4X7Q/)).getByText('Scheduled')).toBeInTheDocument();
  });

  it('shows the API’s reason when the payout changed meanwhile', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/payouts': { status: 200, body: { payouts: [held], total: 1, page: 1 } },
      'POST /admin/payouts/po2/release': {
        status: 409,
        body: { error: { code: 'NOT_HELD', message: 'This payout isn’t on hold.' } },
      },
    });
    render('/admin/payments?tab=payouts');

    await userEvent.click(
      (await row(/RV-3H8D2L/)).getByRole('button', { name: 'Release payout for RV-3H8D2L' }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await userEvent.click(dialog.getByRole('button', { name: 'Release payout' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('This payout isn’t on hold.');
  });

  it('lets support staff see payouts by status, without the admin’s actions', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /admin/payouts': { status: 200, body: { payouts: [held], total: 1, page: 1 } },
    });
    render('/admin/payments?tab=payouts&status=HELD');

    const payout = await row(/RV-3H8D2L/);
    expect(payout.getByText('$25')).toBeInTheDocument();
    expect(queries(fetchMock, '/admin/payouts')[0]?.get('status')).toBe('HELD');
    expect(screen.getByRole('button', { name: /^Status/ })).toHaveTextContent('Held');
    expect(payout.queryByRole('button')).not.toBeInTheDocument();
  });

  it('asks support staff without the refunds permission to ask the admin', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /admin/payouts': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render('/admin/payments?tab=payouts');

    expect(
      await screen.findByText('Ask the admin for the refunds permission to see payouts.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
