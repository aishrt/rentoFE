import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { confirmEmailChangeRequest } from '@/features/auth/auth-api';
import { useLinkToken } from '@/features/auth/use-link-token';
import { sessionQueryKey } from '@/features/auth/use-session';

function Result({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: { to: string; label: string };
}) {
  return (
    <>
      <h1 className="headline text-title-3 font-medium">{title}</h1>
      <p className="mt-3 text-muted">{text}</p>
      <Button asChild size="lg" className="mt-8">
        <Link to={action.to}>{action.label}</Link>
      </Button>
    </>
  );
}

function Confirm({ token }: { token: string }) {
  const queryClient = useQueryClient();
  // A query rather than a mutation, so the link is used once even when React renders twice.
  const confirmation = useQuery({
    queryKey: ['confirm-email-change', token],
    queryFn: () => confirmEmailChangeRequest(token),
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
        <Spinner label="Updating your email address" />
        Updating your email address…
      </div>
    );
  }
  if (confirmation.isSuccess) {
    return (
      <Result
        title="Email address changed"
        text={`Your account now uses ${confirmation.data}. Use it to log in from now on.`}
        action={{ to: '/account/settings', label: 'Go to account settings' }}
      />
    );
  }
  const code = confirmation.error instanceof ApiError ? confirmation.error.code : null;
  if (code === 'EMAIL_TAKEN') {
    return (
      <Result
        title="That address is taken"
        text="Another account started using this email address in the meantime, so your account keeps its current one."
        action={{ to: '/account/settings', label: 'Go to account settings' }}
      />
    );
  }
  return (
    <Result
      title={code === 'LINK_INVALID' ? 'This link has expired' : "We couldn't change your email"}
      text={
        code === 'LINK_INVALID'
          ? 'Links to confirm a new email address work once and expire after 24 hours. Your account still uses its current address.'
          : 'Check your connection, then open the link from the email again.'
      }
      action={{ to: '/account/settings', label: 'Go to account settings' }}
    />
  );
}

/** Opened from the link sent to a new email address (plan §6.1). */
export function ConfirmEmailChangePage() {
  const token = useLinkToken();
  return (
    <AuthLayout>
      <PageMeta title="Confirm your new email" noindex />
      {token ? (
        <Confirm token={token} />
      ) : (
        <Result
          title="This link is incomplete"
          text="Open the link from the email again."
          action={{ to: '/account/settings', label: 'Go to account settings' }}
        />
      )}
    </AuthLayout>
  );
}
