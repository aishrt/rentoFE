import { Elements } from '@stripe/react-stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, CircleSlash, LockKeyhole, ReceiptText, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import { PageBackdrop } from '@/components/brand/page-backdrop';
import { CalmWaves } from '@/components/brand/patterns/calm-waves';
import { Container } from '@/components/layout/container';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconBadge } from '@/components/ui/icon-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { paymentHistoryQueryKey } from '@/features/account/dashboard-api';
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { bookingQueryKey, bookingsQueryKey } from '@/features/booking/booking-api';
import { formatNzdCharge } from '@/features/booking/booking-format';
import { PaymentForm } from '@/features/payments/payment-form';
import { getStripe, stripeAppearance } from '@/features/payments/stripe';

const payLinkKey = (id: string) => ['pay-link', id] as const;

function Pay({ paymentId }: { paymentId: string }) {
  const queryClient = useQueryClient();
  // Stripe took the payment, but our record of it hasn't caught up yet.
  const [received, setReceived] = useState(false);
  const charge = useQuery({
    queryKey: payLinkKey(paymentId),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/payments/{id}', { params: { path: { id: paymentId } }, signal }))).payment,
    // Until it has: Stripe's webhook applies it within moments.
    refetchInterval: (query) => (received && query.state.data?.status === 'DUE' ? 5_000 : false),
  });
  const start = useMutation({
    mutationFn: () => unwrap(client.POST('/payments/{id}/pay', { params: { path: { id: paymentId } } })),
    // Paid or cancelled meanwhile: the page catches up and says so.
    onError: (error) => {
      if (error instanceof ApiError && ['ALREADY_PAID', 'CHARGE_CANCELLED'].includes(error.code)) {
        void queryClient.invalidateQueries({ queryKey: payLinkKey(paymentId) });
      }
    },
  });
  const sync = async () =>
    (await unwrap(client.POST('/payments/{id}/sync', { params: { path: { id: paymentId } } }))).payment;
  /** Paid with Stripe: the page, the trip, the trips list and the payment history catch up. */
  const paid = async (bookingRef: string) => {
    try {
      const next = await sync();
      queryClient.setQueryData(payLinkKey(paymentId), next);
      if (next.status === 'DUE') setReceived(true);
    } catch {
      // Stripe has the payment either way; our record follows from its webhook.
      setReceived(true);
      void queryClient.invalidateQueries({ queryKey: payLinkKey(paymentId) });
    }
    void queryClient.invalidateQueries({ queryKey: bookingQueryKey(bookingRef) });
    void queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
    void queryClient.invalidateQueries({ queryKey: paymentHistoryQueryKey });
  };

  if (charge.isError) {
    const missing = charge.error instanceof ApiError && charge.error.status === 404;
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <ReceiptText />
          </IconBadge>
        }
        title={missing ? 'We couldn’t find that payment' : 'We couldn’t load this payment'}
        description={
          missing ? 'Check the link in your email, or find the charge on your trip.' : charge.error.message
        }
        actions={
          missing ? (
            <Button asChild>
              <Link to="/trips">Your trips</Link>
            </Button>
          ) : (
            <Button loading={charge.isFetching} onClick={() => void charge.refetch()}>
              Try again
            </Button>
          )
        }
      />
    );
  }
  if (!charge.data) return <PaySkeleton />;
  const data = charge.data;

  // Nothing to pay: paid (perhaps refunded since, in part or in full), or cancelled by our team.
  if (data.status !== 'DUE') {
    const what = `${formatNzdCharge(data.amountCents)} for ${data.description.toLowerCase()} on booking ${data.bookingRef}`;
    const settled = {
      PAID: {
        icon: <CircleCheck />,
        title: 'Paid, thank you',
        description: data.refundedCents
          ? `${what}. ${formatNzdCharge(data.refundedCents)} of it was refunded to your card.`
          : `${what}. A receipt is on its way by email.`,
      },
      REFUNDED: {
        icon: <Undo2 />,
        title: 'Refunded',
        description: `${what} was paid, then refunded to your card in full. There’s nothing to pay.`,
      },
      CANCELLED: {
        icon: <CircleSlash />,
        title: 'This charge was cancelled',
        description: `${what} was cancelled by our team, so there’s nothing to pay.`,
      },
    }[data.status];
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={<IconBadge size="xl">{settled.icon}</IconBadge>}
        title={settled.title}
        description={settled.description}
        actions={
          <Button asChild>
            <Link to={`/trips/${data.bookingRef}`}>Back to your trip</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="eyebrow text-primary">Booking {data.bookingRef}</p>
        <h1 className="headline mt-2 text-title-3 font-medium">Pay a charge for your trip</h1>
        <p className="mt-2 text-muted">{data.vehicleTitle}</p>
      </div>
      <Card className="grid gap-5 p-5 sm:p-6">
        <dl className="grid gap-1">
          <dt className="text-sm text-muted">{data.description}</dt>
          <dd className="headline text-3xl font-medium text-ink">{formatNzdCharge(data.amountCents)}</dd>
          <dd className="text-xs text-muted">
            GST included. Your card issuer converts it if your card isn’t in NZD.
          </dd>
        </dl>
        {received ? (
          <Alert variant="success" role="status" title="Payment received">
            It may take a minute to show here and on your trip. There’s no need to pay again.
          </Alert>
        ) : (
          data.failureReason && (
            <Alert variant="danger" title="Your saved card didn’t go through">
              {data.failureReason} Pay with another card, Apple Pay or Google Pay.
            </Alert>
          )
        )}
        {received ? null : start.data ? (
          <Elements
            key={start.data.clientSecret}
            stripe={getStripe()}
            options={{ clientSecret: start.data.clientSecret, appearance: stripeAppearance }}
          >
            <p className="flex items-center gap-2 text-sm text-muted">
              <LockKeyhole aria-hidden="true" className="size-4 shrink-0 text-primary" />
              Paid securely with Stripe. Your card details never reach Rento Vroom.
            </p>
            <PaymentForm
              submitLabel={`Pay ${formatNzdCharge(data.amountCents)}`}
              pendingLabel="Paying…"
              successLabel="Paid"
              returnUrl={window.location.href}
              onPaid={() => paid(data.bookingRef)}
              // The decline's reason is recorded; the form says what happened.
              onFailed={() => void sync().catch(() => undefined)}
            />
          </Elements>
        ) : (
          <div className="grid gap-3">
            {start.isError && (
              <Alert variant="danger" role="alert">
                {start.error.message}
              </Alert>
            )}
            <Button
              size="lg"
              loading={start.isPending}
              onClick={() => start.mutate()}
              className="justify-self-start"
            >
              Pay now
            </Button>
          </div>
        )}
        <p className="text-sm text-muted">
          Think this charge is wrong?{' '}
          <Link
            to={`/contact?category=PAYMENT&booking=${data.bookingRef}`}
            className="link-underline text-primary"
          >
            Contact support
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}

function PaySkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}

/** The link to pay an extra charge when the saved card was declined (plan §8.1, items 6 and 11). */
export function PayPage() {
  const { id = '' } = useParams();
  return (
    <Container className="max-w-2xl py-8 sm:py-12">
      <PageBackdrop art={CalmWaves} />
      <PageMeta title="Pay a charge" noindex />
      <RequireSignedIn fallback={<PaySkeleton />}>{() => <Pay key={id} paymentId={id} />}</RequireSignedIn>
    </Container>
  );
}
