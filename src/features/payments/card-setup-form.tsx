import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const FAILED_MESSAGE = "We couldn't save that card. Check the details, or try another card.";

/**
 * Saves one card with Stripe for later (plan §8.1, items 3 and 7), inside an <Elements> provider created with
 * a SetupIntent's client secret. Nothing is charged; a bank may ask the cardholder to confirm in a pop-up.
 * Card details stay in Stripe's frames and never reach our servers.
 */
export function CardSetupForm({ onSaved }: { onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!stripe || !elements) return;
    setError(null);
    setSaving(true);
    try {
      const submitted = await elements.submit();
      if (submitted.error) {
        setError(submitted.error.message ?? FAILED_MESSAGE);
        return;
      }
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.href },
      });
      if (confirmError) {
        setError(confirmError.message ?? FAILED_MESSAGE);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-5">
      <PaymentElement options={{ layout: 'tabs', wallets: { applePay: 'never', googlePay: 'never' } }} />
      {error && (
        <Alert variant="danger" role="alert">
          {error}
        </Alert>
      )}
      <Button onClick={() => void save()} loading={saving} disabled={!stripe || !elements} className="w-full">
        Save card
      </Button>
    </div>
  );
}
