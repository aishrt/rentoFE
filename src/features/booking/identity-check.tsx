import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Clock, ScanFace } from 'lucide-react';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { client, unwrap } from '@/api/client';
import type { CheckoutReadiness } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { readinessQueryKey } from './booking-api';

/** How often to ask again while Stripe checks the ID; it usually takes a minute or two. */
const POLL_MS = 5_000;

/**
 * The identity check (spec §22, plan §9 Days 19–20): a photo of the person's ID, ideally their driver
 * licence, and a selfie, on Stripe's page, which brings them back here. While Stripe checks it the step waits
 * and asks again; a check that needs a person goes to support, and the booking waits for them (plan §8.2).
 */
export function IdentityCheck({
  readiness,
  forHosting = false,
}: {
  readiness: CheckoutReadiness;
  /** On Hosting, where a check in review holds up the Host application rather than a booking. */
  forHosting?: boolean;
}) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const start = useMutation({
    mutationFn: async () =>
      (
        await unwrap(
          client.POST('/me/verification', { body: { returnTo: `${location.pathname}${location.search}` } }),
        )
      ).url,
    onSuccess: (url) => window.location.assign(url),
  });

  const processing = readiness.identityProcessing;
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => {
      // Asking for the check's state reads it again from Stripe; then the step's problems update.
      void unwrap(client.GET('/me/verification')).then(() =>
        queryClient.invalidateQueries({ queryKey: readinessQueryKey }),
      );
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [processing, queryClient]);

  switch (readiness.identityStatus) {
    case 'APPROVED':
      return (
        <p className="flex items-start gap-2.5 text-ink">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <span>Your identity is verified.</span>
        </p>
      );
    case 'PENDING':
      return (
        <Alert title="Our team is checking your ID">
          {forHosting
            ? 'It usually takes a few hours. We’ll let you know when it’s done.'
            : 'It usually takes a few hours. You can still book: your card is authorised, and the booking is confirmed once the check is approved.'}
        </Alert>
      );
    case 'REJECTED':
      return null;
    default:
      break;
  }

  if (processing) {
    return (
      <p role="status" className="flex items-start gap-2.5 text-ink">
        <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 animate-pulse text-primary" />
        <span>
          Stripe is checking your ID and selfie. This usually takes a minute or two; stay on this page.
        </span>
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        A photo of your ID and a quick selfie, on our payment partner Stripe’s secure page. Use your driver
        licence if you can: one check covers both. It takes about two minutes, and we only keep the result.
      </p>
      {readiness.identityError && (
        <Alert variant="danger" title="Your last check didn’t finish">
          {readiness.identityError} Please try again.
        </Alert>
      )}
      {start.isError && (
        <Alert variant="danger" role="alert">
          {start.error.message}
        </Alert>
      )}
      <Button loading={start.isPending} onClick={() => start.mutate()} className="justify-self-start">
        <ScanFace aria-hidden="true" />
        Verify your identity
      </Button>
    </div>
  );
}
