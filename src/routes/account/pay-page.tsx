import { Elements } from '@stripe/react-stripe-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, LockKeyhole, ReceiptText } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { client, unwrap } from '@/api/client';
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
import { RequireSignedIn } from '@/features/auth/require-signed-in';
import { formatNzdCharge } from '@/features/booking/booking-format';
import { PaymentForm } from '@/features/payments/payment-form';
import { getStripe, stripeAppearance } from '@/features/payments/stripe';

const payLinkKey = (id: string) => ['pay-link', id] as const;

function Pay({ paymentId }: { paymentId: string }) {
  const queryClient = useQueryClient();
  const charge = useQuery({
    queryKey: payLinkKey(paymentId),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/payments/{id}', { params: { path: { id: paymentId } }, signal }))).payment,
  });
  const start = useMutation({
    mutationFn: () => unwrap(client.POST('/payments/{id}/pay', { params: { path: { id: paymentId } } })),
  });
  const sync = async () => {
    const paid = (await unwrap(client.POST('/payments/{id}/sync', { params: { path: { id: paymentId } } })))
      .payment;
    queryClient.setQueryData(payLinkKey(paymentId), paid);
  };

  if (charge.isError) {
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <ReceiptText />
          </IconBadge>
        }
        title="We couldn’t find that payment"
        description="Check the link in your email, or find the charge on your trip."
        actions={
          <Button asChild>
            <Link to="/trips">Your trips</Link>
          </Button>
        }
      />
    );
  }
  if (!charge.data) return <PaySkeleton />;
  const data = charge.data;

  if (data.status === 'PAID') {
    return (
      <EmptyState
        className="mx-auto py-10"
        visual={
          <IconBadge size="xl">
            <CircleCheck />
          </IconBadge>
        }
        title="Paid, thank you"
        description={`${formatNzdCharge(data.amountCents)} for ${data.description.toLowerCase()} on booking ${data.bookingRef}. A receipt is on its way by email.`}
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
        {data.failureReason && (
          <Alert variant="danger" title="Your saved card didn’t go through">
            {data.failureReason} Pay with another card, Apple Pay or Google Pay.
          </Alert>
        )}
        {start.data ? (
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
              onPaid={sync}
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
