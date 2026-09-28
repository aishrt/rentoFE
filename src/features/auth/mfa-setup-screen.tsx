import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LockKeyhole, LogOut, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { enableMfaRequest, startMfaSetupRequest } from '@/features/account/account-api';
import { codeSchema, digitsOnly, oneTimeCodeInputProps, type CodeValues } from './code-schema';
import { sessionQueryKey, useLogout } from './use-session';

// Under ['admin'], so signing out drops the secret from memory with the rest of the staff data.
const setupQueryKey = ['admin', 'mfa-setup'] as const;

/** The key in groups of four, easier to type into an app by hand. */
const grouped = (secret: string) => secret.match(/.{1,4}/g)?.join(' ') ?? secret;

/**
 * Staff set up an authenticator app before the portal opens (plan §6.1): scan the QR code (or type
 * the key), then enter the first code. From then on, each staff sign-in asks for a code.
 */
export function MfaSetupScreen({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient();
  const logout = useLogout();
  // A query, so the secret is fetched once even when React renders twice.
  const setup = useQuery({
    queryKey: setupQueryKey,
    queryFn: startMfaSetupRequest,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const enable = useMutation({
    mutationFn: enableMfaRequest,
    onSuccess: (updated) => {
      queryClient.setQueryData(sessionQueryKey, updated);
      queryClient.removeQueries({ queryKey: setupQueryKey });
    },
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    try {
      await enable.mutateAsync(digitsOnly(code));
    } catch (error) {
      if (error instanceof ApiError && error.fields?.code) {
        setError('code', { message: error.fields.code }, { shouldFocus: true });
      } else if (error instanceof ApiError && error.code === 'MFA_SETUP_NOT_STARTED') {
        void setup.refetch();
      }
    }
  });

  return (
    <AuthLayout variant="staff">
      <PageMeta title="Set up two-factor sign-in · Staff portal" noindex />
      <Badge variant="primary" className="mb-5">
        <LockKeyhole aria-hidden="true" />
        Staff portal
      </Badge>
      <h1 className="headline text-title-3 font-medium">Set up two-factor sign-in</h1>
      <p className="mt-2 mb-8 text-muted">
        Staff accounts can see customers' details, so each staff sign-in also needs a code from your phone.
        This takes about a minute, once.
      </p>

      <ol className="grid gap-6">
        <li>
          <p className="font-medium text-ink">1. Install an authenticator app</p>
          <p className="mt-1 text-sm text-muted">
            For example Google Authenticator, Microsoft Authenticator or 1Password.
          </p>
        </li>

        <li>
          <p className="font-medium text-ink">2. Scan this QR code with the app</p>
          {setup.isPending && <Skeleton className="mt-3 size-48 rounded-card" />}
          {setup.isError && (
            <Alert variant="danger" role="alert" className="mt-3">
              We couldn't start the setup.{' '}
              <button
                type="button"
                className="link-underline font-medium"
                onClick={() => void setup.refetch()}
              >
                Try again
              </button>
            </Alert>
          )}
          {setup.data && (
            <div className="mt-3 grid gap-3">
              <img
                src={setup.data.qrCode}
                alt="QR code to add Rento Vroom to your authenticator app"
                width={192}
                height={192}
                className="size-48 rounded-card border border-line bg-white p-2"
              />
              <p className="text-sm text-muted">
                Can't scan it? Add an account in the app and type this key:
                <span className="mt-1 block font-mono text-sm tracking-wide break-all text-ink">
                  {grouped(setup.data.secret)}
                </span>
              </p>
            </div>
          )}
        </li>

        <li>
          <p className="font-medium text-ink">3. Enter the code the app shows</p>
          <form noValidate onSubmit={onSubmit} className="mt-3">
            <fieldset disabled={enable.isPending || !setup.data} className="grid min-w-0 gap-4">
              <legend className="sr-only">Authentication code</legend>
              {enable.isError && !(enable.error instanceof ApiError && enable.error.fields) && (
                <Alert variant="danger" role="alert">
                  {enable.error instanceof ApiError && enable.error.code === 'RATE_LIMITED'
                    ? enable.error.message
                    : 'Something went wrong on our side. Please try again in a moment.'}
                </Alert>
              )}
              <Field label="Authentication code" error={errors.code?.message}>
                <Input leadingIcon={<ShieldCheck />} {...oneTimeCodeInputProps} {...register('code')} />
              </Field>
              <Button type="submit" size="lg" block loading={enable.isPending}>
                Turn on and open the portal
              </Button>
            </fieldset>
          </form>
        </li>
      </ol>

      <p className="mt-8 flex flex-wrap items-center gap-2 text-sm text-muted">
        Signed in as {user.email}.
        <Button variant="ghost" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut aria-hidden="true" />
          Log out
        </Button>
      </p>
    </AuthLayout>
  );
}
