import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { resendVerificationRequest, verifyEmailRequest } from '@/features/auth/auth-api';
import { sessionQueryKey, useSession } from '@/features/auth/use-session';
import { safeRedirect } from '@/lib/safe-redirect';

function Message({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <>
      <h1 className="headline text-title-3 font-medium">{title}</h1>
      <div className="mt-3 grid gap-3 text-muted">{children}</div>
      {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
    </>
  );
}

function ContinueButton({ next }: { next: string }) {
  return (
    <Button asChild size="lg">
      <Link to={next} replace viewTransition>
        Continue to Rento Vroom
      </Link>
    </Button>
  );
}

/** Emails a new link, and says so. */
function ResendLink({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient();
  const resend = useMutation({
    mutationFn: resendVerificationRequest,
    // Nothing to send means it's already confirmed: refresh the session so the page says so.
    onSuccess: (sent) => {
      if (!sent) void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
    },
  });

  return (
    <div className="grid gap-3">
      {resend.isSuccess && resend.data && (
        <Alert variant="success" role="status">
          We've sent a new link to {user.email}. Links in earlier emails no longer work.
        </Alert>
      )}
      {resend.isError && (
        <Alert variant="danger" role="alert">
          {resend.error instanceof ApiError && resend.error.code === 'RATE_LIMITED'
            ? resend.error.message
            : "We couldn't send the email. Please try again in a moment."}
        </Alert>
      )}
      <div>
        <Button variant="secondary" loading={resend.isPending} onClick={() => resend.mutate()}>
          Send a new link
        </Button>
      </div>
    </div>
  );
}

/** Opened from the emailed link: confirms the address. */
function ConfirmLink({ token, next }: { token: string; next: string }) {
  const queryClient = useQueryClient();
  const session = useSession();
  // A query rather than a mutation, so the link is used once even when React renders twice.
  const confirmation = useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => verifyEmailRequest(token),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (confirmation.isSuccess) void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
  }, [confirmation.isSuccess, queryClient]);

  if (confirmation.isPending) {
    return (
      <div className="flex items-center gap-3 text-muted">
        <Spinner label="Confirming your email address" />
        Confirming your email address…
      </div>
    );
  }

  if (confirmation.isSuccess) {
    return (
      <Message title="Email confirmed" actions={<ContinueButton next={next} />}>
        <p>Thanks. {confirmation.data} is confirmed, so we can send you your bookings and receipts.</p>
      </Message>
    );
  }

  const linkUsed = confirmation.error instanceof ApiError && confirmation.error.code === 'LINK_INVALID';
  if (!linkUsed) {
    return (
      <Message
        title="We couldn't confirm your email"
        actions={
          <Button size="lg" onClick={() => void confirmation.refetch()}>
            Try again
          </Button>
        }
      >
        <p>Check your connection, then try again.</p>
      </Message>
    );
  }

  const user = session.data;
  if (user?.emailVerified) {
    return (
      <Message title="Your email is already confirmed" actions={<ContinueButton next={next} />}>
        <p>This link was already used. There's nothing more to do.</p>
      </Message>
    );
  }
  return (
    <Message
      title="This link has expired"
      actions={
        !user && (
          <Button asChild size="lg">
            <Link to="/login?next=/verify-email">Log in to get a new link</Link>
          </Button>
        )
      }
    >
      <p>Confirmation links work once and expire after 24 hours.</p>
      {user && <ResendLink user={user} />}
    </Message>
  );
}

/** Straight after sign-up, or from the account menu: check your inbox. */
function CheckInbox({ next }: { next: string }) {
  const session = useSession();
  const user = session.data;

  if (session.isPending) return <Spinner label="Loading" />;

  if (!user) {
    return (
      <Message
        title="Confirm your email"
        actions={
          <Button asChild size="lg">
            <Link to="/login?next=/verify-email">Log in</Link>
          </Button>
        }
      >
        <p>Log in to get a link to confirm your email address.</p>
      </Message>
    );
  }

  if (user.emailVerified) {
    return (
      <Message title="Your email is confirmed" actions={<ContinueButton next={next} />}>
        <p>{user.email} is confirmed. You're all set.</p>
      </Message>
    );
  }

  return (
    <Message title="Check your inbox" actions={<ContinueButton next={next} />}>
      <p>
        We've sent a link to <span className="font-medium text-ink">{user.email}</span>. Open it to confirm
        your email address. It expires in 24 hours.
      </p>
      <p>You can keep browsing in the meantime. Can't find the email? Check your spam folder.</p>
      <ResendLink user={user} />
    </Message>
  );
}

export function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [token] = useState(() => searchParams.get('token'));
  const next = safeRedirect(searchParams.get('next'));

  // The token works once; take it out of the address bar and history as soon as it's read.
  useEffect(() => {
    if (!searchParams.has('token')) return;
    const rest = new URLSearchParams(searchParams);
    rest.delete('token');
    setSearchParams(rest, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <AuthLayout>
      <PageMeta title="Confirm your email" noindex />
      {token ? <ConfirmLink token={token} next={next} /> : <CheckInbox next={next} />}
    </AuthLayout>
  );
}
