import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { AuthLayout } from '@/components/layout/auth-layout';
import { PageMeta } from '@/components/layout/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { resetPasswordRequest } from '@/features/auth/auth-api';
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

function RequestNewLink({ title, children }: { title: string; children: string }) {
  return (
    <>
      <h1 className="headline text-title-3 font-medium">{title}</h1>
      <p className="mt-3 text-muted">{children}</p>
      <Button asChild size="lg" className="mt-8">
        <Link to="/forgot-password">Get a new link</Link>
      </Button>
    </>
  );
}

/** Choose a new password from the emailed link (plan §6.1). It signs every device out. */
export function ResetPasswordPage() {
  const token = useLinkToken();
  const reset = useMutation({ mutationFn: resetPasswordRequest });
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
      await reset.mutateAsync({ token: token!, password });
    } catch (error) {
      if (error instanceof ApiError && error.fields?.password) {
        setError('password', { message: error.fields.password }, { shouldFocus: true });
      }
    }
  });

  const linkUsed = reset.error instanceof ApiError && reset.error.code === 'LINK_INVALID';

  return (
    <AuthLayout>
      <PageMeta title="Choose a new password" noindex />
      {!token ? (
        <RequestNewLink title="This link is incomplete">
          Open the link from the email again, or ask for a new one.
        </RequestNewLink>
      ) : linkUsed ? (
        <RequestNewLink title="This link has expired">
          Reset links work once and expire after 1 hour.
        </RequestNewLink>
      ) : reset.isSuccess ? (
        <>
          <h1 className="headline text-title-3 font-medium">Password changed</h1>
          <p className="mt-3 text-muted">
            Your password for {reset.data} is changed, and every device was signed out. Log in with your new
            password.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/login">Log in</Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="headline text-title-3 font-medium">Choose a new password</h1>
          <p className="mt-2 mb-8 text-muted">Once it's changed, you'll be signed out on every device.</p>
          <form noValidate onSubmit={onSubmit}>
            <fieldset disabled={reset.isPending} className="grid min-w-0 gap-5">
              <legend className="sr-only">New password</legend>
              {reset.isError && !(reset.error instanceof ApiError && reset.error.fields) && (
                <Alert variant="danger" role="alert">
                  {reset.error instanceof ApiError &&
                  ['RATE_LIMITED', 'NETWORK_ERROR'].includes(reset.error.code)
                    ? reset.error.message
                    : 'Something went wrong on our side. Please try again in a moment.'}
                </Alert>
              )}
              <Field
                label="New password"
                error={errors.password?.message}
                description={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words together work well.`}
              >
                <PasswordInput
                  autoComplete="new-password"
                  autoFocus
                  {...register('password', { deps: 'confirmPassword' })}
                />
              </Field>
              <Field label="Confirm new password" error={errors.confirmPassword?.message}>
                <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
              </Field>
              <Button type="submit" size="lg" block loading={reset.isPending}>
                Change password
              </Button>
            </fieldset>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
