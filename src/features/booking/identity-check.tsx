import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Clock, ScanFace } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { ApiError, client, unwrap } from '@/api/client';
import type { CheckoutReadiness } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { readinessQueryKey } from './booking-api';

/** How often to ask again while Stripe checks the ID; it usually takes a minute or two. */
const POLL_MS = 5_000;
/** Added to the page Stripe brings the person back to, so the step knows to look for the result. */
export const RETURN_PARAM = 'identityCheck';
/** How long after coming back from Stripe the step keeps asking, until the check shows as under way. */
const RETURN_WINDOW_MS = 60_000;

/** This page's path, marked as the one to come back to from Stripe. */
function returnPath(pathname: string, search: string) {
  if (new URLSearchParams(search).has(RETURN_PARAM)) return `${pathname}${search}`;
  return `${pathname}${search ? `${search}&` : '?'}${RETURN_PARAM}=done`;
}

/**
 * The identity check (spec §22, plan §9 Days 19–20): a photo of the person's ID, ideally their driver
 * licence, and a selfie, on Stripe's page, which brings them back here. While Stripe checks it the step waits
 * and asks again; a check that needs a person goes to support, and the booking waits for them (plan §8.2).
 * Its state is read from Stripe once as the step opens, and for a minute after Stripe brings the person back,
 * so a result that hasn't reached us yet isn't mistaken for a check still to do.
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
          client.POST('/me/verification', {
            body: { returnTo: returnPath(location.pathname, location.search) },
          }),
        )
      ).url,
    onSuccess: (url) => window.location.assign(url),
    // The check was under way after all (Stripe is checking it, or it has passed): the step catches up.
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: readinessQueryKey });
      }
    },
  });

  // Asking for the check's state reads it again from Stripe; then the step's problems update.
  const refresh = useCallback(
    () =>
      unwrap(client.GET('/me/verification'))
        .then(() => queryClient.invalidateQueries({ queryKey: readinessQueryKey }))
        .catch(() => undefined),
    [queryClient],
  );

  const unchecked = readiness.identityStatus === 'NONE';
  const refreshedOnOpen = useRef(false);
  useEffect(() => {
    if (!unchecked || refreshedOnOpen.current) return;
    refreshedOnOpen.current = true;
    void refresh();
  }, [unchecked, refresh]);

  // Just back from Stripe's page: its result can take a moment to reach us.
  const returned = new URLSearchParams(location.search).has(RETURN_PARAM);
  const [settling, setSettling] = useState(returned);
  useEffect(() => {
    if (!settling) return;
    const timer = setTimeout(() => setSettling(false), RETURN_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [settling]);

  const checkingNow = start.error instanceof ApiError && start.error.code === 'IDENTITY_PROCESSING';
  const processing = readiness.identityProcessing || (unchecked && checkingNow);
  const waiting = unchecked && (processing || settling);
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [waiting, refresh]);

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
      {start.isError && !checkingNow && (
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
