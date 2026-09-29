import { Elements } from '@stripe/react-stripe-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleCheck, CreditCard, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { client, unwrap } from '@/api/client';
import type { TestPayment, TestPaymentStatus } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SettingsSection } from '@/features/account/settings-section';
import { useSession } from '@/features/auth/use-session';
import { CurrencyPicker } from '@/features/currency/currency-picker';
import { PriceWithEstimate } from '@/features/currency/price-with-estimate';
import { PaymentForm } from '@/features/payments/payment-form';
import { getStripe, stripeAppearance, stripeKeyMode } from '@/features/payments/stripe';

/** How often the result checks for the webhook, and for how long. Stripe usually sends it within seconds. */
const CHECK_EVERY_MS = 2_000;
const GIVE_UP_AFTER_MS = 30_000;

const WALLET_NAMES: Record<string, string> = { apple_pay: 'Apple Pay', google_pay: 'Google Pay' };

function describeMethod(method: TestPaymentStatus['paymentMethod']): string {
  if (!method) return 'Not paid yet';
  const card = method.brand
    ? `${method.brand.charAt(0).toUpperCase()}${method.brand.slice(1)} •••• ${method.last4}`
    : method.type;
  const wallet = method.wallet ? (WALLET_NAMES[method.wallet] ?? method.wallet) : null;
  return wallet ? `${wallet} (${card})` : card;
}

function ResultRow({ ok, pending, children }: { ok: boolean; pending?: boolean; children: ReactNode }) {
  const Icon = ok ? CircleCheck : pending ? LoaderCircle : TriangleAlert;
  return (
    <li className="flex items-start gap-3 p-4">
      <Icon
        aria-hidden="true"
        className={`mt-0.5 size-4.5 shrink-0 ${ok ? 'text-success' : pending ? 'animate-spin text-muted' : 'text-warning'}`}
      />
      <div className="min-w-0 text-sm text-ink">{children}</div>
    </li>
  );
}

function TestPaymentResult({ id, onAgain }: { id: string; onAgain: () => void }) {
  const [paidAt] = useState(() => Date.now());
  const status = useQuery({
    queryKey: ['admin', 'payments', 'test', id],
    queryFn: ({ signal }) =>
      unwrap(client.GET('/admin/payments/test/{id}', { params: { path: { id } }, signal })),
    refetchInterval: (query) =>
      query.state.data?.webhookReceived || query.state.dataUpdatedAt - paidAt > GIVE_UP_AFTER_MS
        ? false
        : CHECK_EVERY_MS,
  });

  if (status.isError) {
    return (
      <Alert variant="danger" role="alert" title="We couldn't load the test payment">
        {status.error.message}
      </Alert>
    );
  }
  if (!status.data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted" aria-busy="true">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Checking the payment…
      </p>
    );
  }

  const payment = status.data;
  const paid = payment.status === 'succeeded';
  const gaveUp = status.dataUpdatedAt - paidAt > GIVE_UP_AFTER_MS;

  return (
    <div className="grid gap-5">
      <ul
        aria-label="Test payment result"
        className="divide-y divide-line rounded-control border border-line"
      >
        <ResultRow ok={paid} pending={payment.status === 'processing'}>
          {paid ? 'Paid NZ$1.00 in the sandbox' : `Payment status: ${payment.status.replaceAll('_', ' ')}`}
        </ResultRow>
        <ResultRow ok={Boolean(payment.paymentMethod)}>
          Paid with {describeMethod(payment.paymentMethod)}
        </ResultRow>
        <ResultRow ok={payment.webhookReceived} pending={!payment.webhookReceived && !gaveUp}>
          {payment.webhookReceived ? (
            'The webhook reached the API'
          ) : gaveUp ? (
            <>
              The webhook hasn&rsquo;t arrived. Check that the endpoint in Stripe (Developers → Webhooks)
              points to this API, and that its signing secret is the API&rsquo;s STRIPE_WEBHOOK_SECRET.
            </>
          ) : (
            'Waiting for the webhook…'
          )}
        </ResultRow>
      </ul>
      <div>
        <Button variant="secondary" onClick={onAgain}>
          Run another test
        </Button>
      </div>
    </div>
  );
}

/**
 * A NZ$1 payment in the Stripe sandbox (plan §8.1, item 17), so an admin can check cards, Apple Pay,
 * Google Pay and the webhook end to end before real bookings exist. Uses the same payment form as
 * checkout.
 */
export function TestPaymentSection() {
  const session = useSession();
  const isAdmin = session.data?.roles.includes('ADMIN') ?? false;
  const keyMode = stripeKeyMode();
  const [payment, setPayment] = useState<TestPayment | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: () => unwrap(client.POST('/admin/payments/test')),
    onSuccess: setPayment,
  });

  const reset = () => {
    setPayment(null);
    setPaidId(null);
    start.reset();
  };

  let body: ReactNode;
  if (keyMode === 'missing') {
    body = (
      <Alert title="Stripe isn't set up in this build">
        Set VITE_STRIPE_PUBLISHABLE_KEY to the sandbox publishable key (pk_test_…) and build the website
        again.
      </Alert>
    );
  } else if (keyMode === 'live') {
    body = <Alert title="This build uses live Stripe keys">Test payments only run in the sandbox.</Alert>;
  } else if (!isAdmin) {
    body = <p className="text-sm text-muted">Only administrators can run a test payment.</p>;
  } else if (paidId) {
    body = <TestPaymentResult id={paidId} onAgain={reset} />;
  } else if (payment) {
    body = (
      <Elements
        key={payment.id}
        stripe={getStripe()}
        options={{ clientSecret: payment.clientSecret, appearance: stripeAppearance }}
      >
        <div className="grid gap-5">
          <p className="text-sm text-ink">
            You&rsquo;ll be charged <PriceWithEstimate cents={payment.amountCents} />. The card issuer
            converts it for cards in other currencies.
          </p>
          <PaymentForm submitLabel="Pay NZ$1.00" onPaid={setPaidId} showWalletDetails />
          <Button variant="ghost" onClick={reset} className="justify-self-start">
            Cancel
          </Button>
        </div>
      </Elements>
    );
  } else {
    body = (
      <div className="grid gap-5">
        <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted">
          <li>
            Cards: use 4242 4242 4242 4242 with any future expiry date and any CVC, or 4000 0027 6000 3184 to
            see the bank&rsquo;s 3-D Secure check.
          </li>
          <li>
            Apple Pay (Safari, or Chrome on iOS 18+) and Google Pay (Chrome) use a real card in your wallet,
            but Stripe swaps it for a test card, so nothing is charged. They only show on the live website,
            whose domain is registered with Stripe; this page on localhost can take cards only.
          </li>
        </ul>
        <CurrencyPicker className="max-w-xs" />
        {start.error && (
          <Alert variant="danger" role="alert" title="The test payment couldn't start">
            {start.error.message}
          </Alert>
        )}
        <div>
          <Button onClick={() => start.mutate()} loading={start.isPending}>
            <CreditCard aria-hidden="true" />
            Start a NZ$1 test payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SettingsSection
      title="Test payment"
      description="A NZ$1 payment in the Stripe sandbox that checks cards, Apple Pay, Google Pay and the webhook before real bookings. No real money moves."
    >
      {body}
    </SettingsSection>
  );
}
