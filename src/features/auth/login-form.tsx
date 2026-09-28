import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { loginSchema, type LoginValues } from './login-schema';
import { MfaCodeForm } from './mfa-code-form';
import { useLogin } from './use-session';

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "That email and password don't match our records. Check them and try again.",
  RATE_LIMITED: 'Too many sign-in attempts. Please wait a few minutes and try again.',
  ACCOUNT_SUSPENDED: 'This account is suspended. Please contact support for help.',
  NOT_STAFF: "This account doesn't have access to the staff portal. Use the main log-in page instead.",
  VALIDATION_ERROR: 'Please check the details you entered.',
};

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    // These messages come from the API and are already written for people.
    if (error.code === 'ACCOUNT_LOCKED' || error.code === 'NETWORK_ERROR') return error.message;
    const message = MESSAGES[error.code];
    if (message) return message;
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}

interface LoginFormProps {
  /** "admin" signs in to the staff portal; the API refuses accounts without a staff role. */
  portal?: 'app' | 'admin';
  onSuccess: (user: SessionUser) => void;
  submitLabel?: string;
}

export function LoginForm({ portal = 'app', onSuccess, submitLabel = 'Log in' }: LoginFormProps) {
  const login = useLogin();
  const errorId = useId();
  // Set when a staff password was right and their authenticator code is needed next (plan §6.1).
  const [challenge, setChallenge] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async (values) => {
    setNotice(null);
    try {
      const result = await login.mutateAsync({ ...values, portal });
      if ('mfaChallenge' in result) setChallenge(result.mfaChallenge);
      else onSuccess(result.user);
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const field of ['email', 'password'] as const) {
          const message = error.fields[field];
          if (message) setError(field, { message });
        }
      }
    }
  });

  const serverError = login.isError ? describeError(login.error) : null;
  const pending = login.isPending;

  if (challenge) {
    return (
      <MfaCodeForm
        challenge={challenge}
        onSuccess={onSuccess}
        onBack={(message) => {
          setChallenge(null);
          login.reset();
          setNotice(message ?? null);
        }}
      />
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={serverError ? errorId : undefined}>
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <legend className="sr-only">{portal === 'admin' ? 'Staff log-in details' : 'Log-in details'}</legend>

        {serverError && (
          <Alert id={errorId} variant="danger" role="alert">
            {serverError}
          </Alert>
        )}
        {notice && (
          <Alert variant="danger" role="alert">
            {notice}
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

        <Field
          label="Password"
          error={errors.password?.message}
          labelAside={
            portal === 'app' && (
              <Link to="/forgot-password" className="link-underline text-sm font-medium text-primary">
                Forgot password?
              </Link>
            )
          }
        >
          <PasswordInput autoComplete="current-password" {...register('password')} />
        </Field>

        <Button type="submit" size="lg" block loading={pending} className="mt-1">
          {pending ? 'Logging in…' : submitLabel}
        </Button>
      </fieldset>
    </form>
  );
}
