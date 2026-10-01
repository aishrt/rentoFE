import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LockKeyhole } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { Skeleton } from '@/components/ui/skeleton';
import { acceptStaffInviteRequest, staffInviteDetailsRequest } from '@/features/auth/auth-api';
import { MIN_PASSWORD_LENGTH } from '@/features/auth/signup-schema';
import { useLinkToken } from '@/features/auth/use-link-token';

const schema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200, 'That password is too long'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: "The passwords don't match",
  });

const isLinkInvalid = (error: unknown) => error instanceof ApiError && error.code === 'LINK_INVALID';

function Message({ title, children, action }: { title: string; children: string; action?: boolean }) {
  return (
    <>
      <h1 className="headline text-title-3 font-medium">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      {action && (
        <Button asChild size="lg" className="mt-8">
          <Link to="/admin/login">Go to staff log-in</Link>
        </Button>
      )}
    </>
  );
}

/**
 * The link in a support team invitation (plan §6.2): the person chooses a password, then logs in to the
 * staff portal. It's the only way onto the support team, and only the admin sends invitations.
 */
export function AcceptInvitePage() {
  const token = useLinkToken();
  const details = useQuery({
    queryKey: ['staff-invite', token],
    queryFn: () => staffInviteDetailsRequest(token!),
    enabled: Boolean(token),
    retry: false,
    // The token is used up on accepting, so the invitation is never fetched again once loaded.
    staleTime: Infinity,
  });
  const accept = useMutation({ mutationFn: acceptStaffInviteRequest });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    try {
      await accept.mutateAsync({ token: token!, password });
    } catch (error) {
      if (error instanceof ApiError && error.fields?.password) {
        setError('password', { message: error.fields.password }, { shouldFocus: true });
      }
    }
  });

  let body;
  if (!token) {
    body = (
      <Message title="This link is incomplete">
        Open the link from the invitation email again. If it still doesn&rsquo;t work, ask the admin to send a
        new invitation.
      </Message>
    );
  } else if (isLinkInvalid(details.error) || isLinkInvalid(accept.error)) {
    body = (
      <Message title="This invitation has expired">
        Invitations work once and expire after 7 days, or when the admin cancels them. Ask the admin to send
        you a new one.
      </Message>
    );
  } else if (accept.isSuccess) {
    body = (
      <Message title="You're on the support team" action>
        {`Log in to the staff portal with ${accept.data} and your new password. You can turn on two-factor sign-in in Settings.`}
      </Message>
    );
  } else if (details.isPending) {
    body = (
      <div aria-busy="true" className="grid gap-4">
        <span className="sr-only">Checking your invitation</span>
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  } else if (details.isError) {
    body = (
      <Alert
        variant="danger"
        role="alert"
        title="We couldn't check your invitation"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => details.refetch()}
            loading={details.isFetching}
          >
            Try again
          </Button>
        }
      >
        {details.error.message}
      </Alert>
    );
  } else {
    const invite = details.data;
    body = (
      <>
        <h1 className="headline text-title-3 font-medium">Join the support team, {invite.firstName}</h1>
        <p className="mt-2 mb-8 text-muted">
          Choose a password for {invite.email}. You&rsquo;ll use it to log in to the staff portal.
        </p>
        <form noValidate onSubmit={onSubmit}>
          <fieldset disabled={accept.isPending} className="grid min-w-0 gap-5">
            <legend className="sr-only">Your password</legend>
            {invite.existingAccount && (
              <Alert title="This email already has a Rento Vroom account">
                The new password replaces its current one, and it&rsquo;s signed out on every device.
              </Alert>
            )}
            {accept.isError && !(accept.error instanceof ApiError && accept.error.fields) && (
              <Alert variant="danger" role="alert">
                {accept.error instanceof ApiError &&
                ['RATE_LIMITED', 'NETWORK_ERROR', 'ACCOUNT_SUSPENDED'].includes(accept.error.code)
                  ? accept.error.message
                  : 'Something went wrong on our side. Please try again in a moment.'}
              </Alert>
            )}
            <Field
              label="Password"
              error={errors.password?.message}
              description={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words together work well.`}
            >
              <PasswordInput
                autoComplete="new-password"
                autoFocus
                {...register('password', { deps: 'confirmPassword' })}
              />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message}>
              <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
            </Field>
            <Button type="submit" size="lg" block loading={accept.isPending}>
              Join the support team
            </Button>
          </fieldset>
        </form>
      </>
    );
  }

  return (
    <AuthLayout variant="staff">
      <PageMeta title="Join the support team" noindex />
      <Badge variant="primary" className="mb-5">
        <LockKeyhole aria-hidden="true" />
        Staff portal
      </Badge>
      {body}
    </AuthLayout>
  );
}
