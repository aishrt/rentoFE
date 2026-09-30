import { Elements } from '@stripe/react-stripe-js';
import { LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { Booking, LineItem, PaymentSession } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import { PaymentForm } from '@/features/payments/payment-form';
import { getStripe, stripeAppearance, stripeKeyMode } from '@/features/payments/stripe';
import { syncPayment, usePreparePayment } from './booking-api';
import { ChargeNote } from './price-summary';

/** How long the tick shows before moving on to the trip, in ms: long enough to see it drawn. */
export const TICK_PAUSE_MS = 900;

export type PaidBooking = Pick<Booking, 'ref' | 'status'>;

interface PayBookingProps {
  booking: Booking;
  /** Called after the payment and the tick: the booking as the API now has it, CONFIRMED or PENDING. */
  onPaid: (booking: PaidBooking) => void;
  /** The 30-minute hold ran out before the payment started. */
  onHoldExpired: () => void;
}

function PaymentsNotSetUp() {
  return (
    <Alert variant="danger" role="alert" title="Payments aren’t set up yet">
      We can’t take payments on this website right now, so bookings can’t be completed. Please try again
      later, or{' '}
      <Link to="/contact?category=PAYMENT" className="link-underline font-medium text-primary">
        contact us
      </Link>
      .
    </Alert>
  );
}

/**
 * The Guest Agreement, then the payment (plan §8.1): ticking the box records the agreement and starts the
 * PaymentIntent, and the payment form opens with the Guest's saved cards. The final breakdown sits right
 * above the button, which reads Confirm and pay for Instant Book or Request to book, turns into progress,
 * then an animated tick (plan §12.4). Used at checkout and on an unpaid trip while its dates are held.
 */
export function PayBooking({ booking, onPaid, onHoldExpired }: PayBookingProps) {
  const prepare = usePreparePayment();
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [failed, setFailed] = useState(false);
  // Ticked from the moment it's pressed: the mutation's own state arrives a moment later.
  const [agreed, setAgreed] = useState(false);
  const request = session ? session.captureMethod === 'manual' : !booking.instantBook;
  const hostName = booking.host.firstName;

  if (stripeKeyMode() === 'missing') return <PaymentsNotSetUp />;

  const agree = (checked: boolean) => {
    if (!checked || agreed) return;
    setAgreed(true);
    prepare.mutate(booking.ref, {
      onSuccess: setSession,
      onError: (error) => {
        setAgreed(false);
        if (error instanceof ApiError && error.code === 'HOLD_EXPIRED') onHoldExpired();
        if (error instanceof ApiError && error.code === 'ALREADY_PAID') onPaid(booking);
      },
    });
  };

  const paid = async () => {
    let updated: PaidBooking = booking;
    try {
      updated = await syncPayment(booking.ref);
    } catch {
      // The payment went through; the trip page catches up with it.
    }
    // Leaves the tick on screen for a moment before moving on.
    window.setTimeout(() => onPaid(updated), TICK_PAUSE_MS);
  };

  const prepareError =
    prepare.error instanceof ApiError && prepare.error.status === 503 ? (
      <PaymentsNotSetUp />
    ) : prepare.error && !(prepare.error instanceof ApiError && prepare.error.code === 'HOLD_EXPIRED') ? (
      <Alert variant="danger" role="alert" title="We couldn’t start the payment">
        {prepare.error.message}
      </Alert>
    ) : null;

  return (
    <div className="grid gap-6">
      <Checkbox
        checked={agreed}
        disabled={agreed}
        onChange={(event) => agree(event.target.checked)}
        label={
          <>
            I agree to the{' '}
            <Link
              to="/guest-agreement"
              target="_blank"
              rel="noopener"
              className="link-underline font-medium text-primary"
            >
              Guest Agreement
            </Link>
            . My card is saved securely with Stripe, so Rento Vroom can charge it after the trip for anything
            the agreement allows, such as extra kilometres.
          </>
        }
      />

      {prepare.isPending && (
        <p className="flex items-center gap-2.5 text-sm text-muted" aria-live="polite">
          <Spinner />
          Opening secure payment…
        </p>
      )}
      {prepareError}

      {session && (
        <Elements
          key={session.clientSecret}
          stripe={getStripe()}
          options={{
            clientSecret: session.clientSecret,
            ...(session.customerSessionClientSecret && {
              customerSessionClientSecret: session.customerSessionClientSecret,
            }),
            appearance: stripeAppearance,
          }}
        >
          <div className="grid animate-fade-up gap-4">
            <p className="flex items-center gap-2 text-sm text-muted">
              <LockKeyhole aria-hidden="true" className="size-4 shrink-0 text-primary" />
              Paid securely with Stripe. Your card details never reach Rento Vroom.
            </p>
            {failed && (
              <p className="text-sm text-ink/85" role="status">
                Your dates are still held. Try again, or use another card or wallet.
              </p>
            )}
            <PaymentForm
              submitLabel={request ? 'Request to book' : 'Confirm and pay'}
              pendingLabel={request ? 'Sending your request…' : 'Confirming your booking…'}
              successLabel={request ? 'Request sent' : 'Booked'}
              returnUrl={`${window.location.origin}/trips/${booking.ref}`}
              onFailed={() => {
                setFailed(true);
                // Records why on the booking, as the webhook would (there are none in local development).
                void syncPayment(booking.ref).catch(() => undefined);
              }}
              onPaid={paid}
              beforeSubmit={
                <section
                  aria-labelledby="final-price"
                  className="grid gap-4 rounded-card border border-line p-4 sm:p-5"
                >
                  <h3 id="final-price" className="font-semibold text-ink">
                    Final price
                  </h3>
                  <PriceBreakdown lineItems={booking.lineItems as LineItem[]} price={booking.price} />
                  <ChargeNote totalCents={session.amountCents} request={request} hostName={hostName} />
                </section>
              }
            />
          </div>
        </Elements>
      )}
    </div>
  );
}
