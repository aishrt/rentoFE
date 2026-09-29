import { ExpressCheckoutElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import type { AvailablePaymentMethods, StripeExpressCheckoutElementConfirmEvent } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/monitoring';

const FAILED_MESSAGE = "The payment didn't go through. Check the details, or try another card or wallet.";
/** How long to wait for Stripe to say which wallets can show before telling the visitor. */
const WALLET_TIMEOUT_MS = 10_000;

const WALLET_NAMES: Record<keyof AvailablePaymentMethods, string> = {
  applePay: 'Apple Pay',
  googlePay: 'Google Pay',
  link: 'Link',
  paypal: 'PayPal',
  amazonPay: 'Amazon Pay',
  klarna: 'Klarna',
};

/** What Stripe said about the wallet buttons on this device. */
type WalletState =
  | { status: 'loading' }
  | { status: 'ready'; available: string[] }
  | { status: 'none' }
  | { status: 'error'; message: string }
  | { status: 'timeout' };

interface PaymentFormProps {
  /** The pay button's label, e.g. "Pay NZ$180". */
  submitLabel: string;
  /** Called once Stripe has taken (or authorised) the payment. */
  onPaid: (paymentIntentId: string) => void;
  /** Shows exactly what Stripe reported about the wallets, for the staff test payment. */
  showWalletDetails?: boolean;
}

/**
 * The payment step (plan §8.1, items 2 and 17): Apple Pay and Google Pay buttons first, as most
 * visitors pay that way, then the card form. It goes inside a Stripe <Elements> provider created with
 * the PaymentIntent's client secret. Card details stay inside Stripe's frames and never reach our
 * servers. The wallets appear only on HTTPS pages of a domain registered with Stripe; when they can't,
 * the visitor is told and pays by card.
 */
export function PaymentForm({ submitLabel, onPaid, showWalletDetails = false }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [wallets, setWallets] = useState<WalletState>({ status: 'loading' });

  // Stripe normally answers within a second or two; a blocked script never answers at all.
  useEffect(() => {
    if (wallets.status !== 'loading') return;
    const timer = setTimeout(() => setWallets({ status: 'timeout' }), WALLET_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [wallets.status]);

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

  let walletNote: string | null = null;
  let walletDetails: string | null = null;
  if (wallets.status === 'none') {
    walletNote =
      "Apple Pay and Google Pay aren't available on this device or page. They need a secure (https) page and Safari or Chrome with a card in Apple Wallet or Google Pay.";
    walletDetails = 'Stripe reported that no wallet can show here.';
  } else if (wallets.status === 'error') {
    walletNote = "Apple Pay and Google Pay couldn't load. You can still pay by card below.";
    walletDetails = `Stripe's error: ${wallets.message}`;
  } else if (wallets.status === 'timeout') {
    walletNote = "Apple Pay and Google Pay didn't load. You can still pay by card below.";
    walletDetails = `No answer from Stripe after ${WALLET_TIMEOUT_MS / 1000} s. A browser extension or network filter may be blocking js.stripe.com or pay.google.com.`;
  } else if (wallets.status === 'ready') {
    walletDetails = `Stripe reported these wallets can show here: ${wallets.available.join(', ')}.`;
  }

  return (
    <div className="grid gap-5">
      <ExpressCheckoutElement
        // No `layout` option: `maxRows: 1` with `overflow: 'never'` makes the element hang without
        // an error (Stripe.js dahlia, September 2026), so no wallet button ever showed.
        options={{
          paymentMethods: { applePay: 'always', googlePay: 'always' },
          buttonType: { applePay: 'book', googlePay: 'book' },
          buttonHeight: 48,
        }}
        onReady={({ availablePaymentMethods }) => {
          const available = Object.entries(availablePaymentMethods ?? {})
            .filter(([, shown]) => shown)
            .map(([key]) => WALLET_NAMES[key as keyof AvailablePaymentMethods] ?? key);
          setWallets(available.length > 0 ? { status: 'ready', available } : { status: 'none' });
        }}
        onLoadError={({ error: loadError }) => {
          const message = loadError.message ?? 'Unknown error';
          setWallets({ status: 'error', message });
          reportError(new Error(`Express Checkout Element failed to load: ${message}`));
        }}
        onConfirm={(event) => void pay(event)}
      />

      {(walletNote || (showWalletDetails && walletDetails)) && (
        <div className="grid gap-1 text-sm text-muted" role="status">
          {walletNote && <p>{walletNote}</p>}
          {showWalletDetails && walletDetails && <p className="text-xs">{walletDetails}</p>}
        </div>
      )}

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
