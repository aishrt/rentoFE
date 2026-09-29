import { ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { AvailablePaymentMethods, StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const FAILED_MESSAGE = "The payment didn't go through. Check the details, or try another card or wallet.";

interface PaymentFormProps {
  /** The pay button's label, e.g. "Pay NZ$180". */
  submitLabel: string;
  /** Called once Stripe has taken (or authorised) the payment. */
  onPaid: (paymentIntentId: string) => void;
}

/**
 * The payment step (plan §8.1, items 2 and 17): Apple Pay and Google Pay buttons first, as most
 * visitors pay that way, then the card form. It goes inside a Stripe <Elements> provider created with
 * the PaymentIntent's client secret. Card details stay inside Stripe's frames and never reach our
 * servers. The wallets appear only on HTTPS pages of a domain registered with Stripe.
 */
export function PaymentForm({ submitLabel, onPaid }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // undefined: no wallet can show on this device; null: still checking.
  const [wallets, setWallets] = useState<AvailablePaymentMethods | undefined | null>(null);

  const pay = async (walletEvent?: StripeExpressCheckoutElementConfirmEvent) => {
    if (!stripe || !elements) return;
    setError(null);
    setSubmitting(true);
    try {
      const submitted = await elements.submit();
      if (submitted.error) {
        setError(submitted.error.message ?? FAILED_MESSAGE);
        walletEvent?.paymentFailed({ reason: 'fail' });
        return;
      }
      // Cards that need 3-D Secure show the bank's check in a pop-up; nothing redirects the page.
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href },
      });
      if (confirmError) {
        setError(confirmError.message ?? FAILED_MESSAGE);
        walletEvent?.paymentFailed({ reason: 'fail' });
        return;
      }
      if (paymentIntent) onPaid(paymentIntent.id);
    } finally {
      setSubmitting(false);
    }
  };

  const walletNames = wallets
    ? [wallets.applePay && 'Apple Pay', wallets.googlePay && 'Google Pay'].filter(Boolean).join(' and ')
    : '';

  return (
    <div className="grid gap-5">
      <ExpressCheckoutElement
        options={{
          paymentMethods: { applePay: 'always', googlePay: 'always' },
          buttonType: { applePay: 'book', googlePay: 'book' },
          buttonHeight: 48,
          layout: { maxColumns: 2, maxRows: 1, overflow: 'never' },
        }}
        onReady={({ availablePaymentMethods }) => setWallets(availablePaymentMethods)}
        onConfirm={(event) => void pay(event)}
      />

      {wallets === undefined && (
        <p className="text-sm text-muted">
          Apple Pay and Google Pay aren&rsquo;t available on this device or page. They need a secure (https)
          page and Safari or Chrome with a card in Apple Wallet or Google Pay.
        </p>
      )}
      {walletNames && <p className="sr-only">{walletNames} available</p>}

      <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
        Or pay by card
        <span aria-hidden="true" className="h-px flex-1 bg-line" />
      </div>

      <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />

      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}

      <Button
        onClick={() => void pay()}
        loading={submitting}
        disabled={!stripe || !elements}
        className="w-full"
      >
        {submitLabel}
      </Button>
    </div>
  );
}
