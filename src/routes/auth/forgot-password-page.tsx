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
import { Input } from '@/components/ui/input';
import { forgotPasswordRequest } from '@/features/auth/auth-api';
import { seoPage } from '@/seo/pages';

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
});

/** Asks for a reset link (plan §6.1). The answer is the same whether or not the address has an account. */
export function ForgotPasswordPage() {
  const request = useMutation({ mutationFn: forgotPasswordRequest });
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(({ email }) => request.mutate(email));

  return (
    <AuthLayout>
      <PageMeta page={seoPage('/forgot-password')} />
      {request.isSuccess ? (
        <>
          <h1 className="headline text-title-3 font-medium">Check your inbox</h1>
          <p className="mt-3 text-muted">
            If there's a Rento Vroom account for{' '}
            <span className="font-medium text-ink">{getValues('email')}</span>, we've sent it a link to choose
            a new password. The link expires in 1 hour.
          </p>
          <p className="mt-3 text-muted">Can't find the email? Check your spam folder.</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/login">Back to log in</Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="headline text-title-3 font-medium">Reset your password</h1>
          <p className="mt-2 mb-8 text-muted">
            Enter the email address you use for Rento Vroom and we'll send you a link to choose a new
            password.
          </p>
          <form noValidate onSubmit={onSubmit}>
            <fieldset disabled={request.isPending} className="grid min-w-0 gap-5">
              <legend className="sr-only">Your email address</legend>
              {request.isError && (
                <Alert variant="danger" role="alert">
                  {request.error instanceof ApiError &&
                  ['RATE_LIMITED', 'NETWORK_ERROR'].includes(request.error.code)
                    ? request.error.message
                    : 'Something went wrong on our side. Please try again in a moment.'}
                </Alert>
              )}
              <Field label="Email address" error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="you@example.co.nz"
                  {...register('email')}
                />
              </Field>
              <Button type="submit" size="lg" block loading={request.isPending}>
                Send the link
              </Button>
            </fieldset>
          </form>
          <p className="mt-8 text-center text-sm text-muted">
            Remembered it?{' '}
            <Link to="/login" className="link-underline font-medium text-primary">
              Log in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
