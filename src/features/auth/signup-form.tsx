import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { MIN_PASSWORD_LENGTH, signupSchema, type SignupValues } from './signup-schema';
import { useSignup } from './use-session';

const FIELDS = ['firstName', 'lastName', 'email', 'password', 'acceptTerms'] as const;

function describeError(error: unknown): string | null {
  if (error instanceof ApiError) {
    // Field errors show next to their fields instead.
    if (error.fields) return null;
    // These messages come from the API and are already written for people.
    if (['RATE_LIMITED', 'NETWORK_ERROR'].includes(error.code)) return error.message;
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}

/** Opens a legal page in a new tab, so the form isn't lost. */
function LegalLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} target="_blank" rel="noopener" className="link-underline font-medium text-primary">
      {children}
    </Link>
  );
}

interface SignupFormProps {
  /** Called just before the account is created, e.g. so the page doesn't treat the visitor as already signed in. */
  onSubmitting?: () => void;
  onSuccess: (user: SessionUser) => void;
}

export function SignupForm({ onSubmitting, onSuccess }: SignupFormProps) {
  const signup = useSignup();
  const errorId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', acceptTerms: false },
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit(async ({ acceptTerms, ...values }) => {
    onSubmitting?.();
    try {
      // The schema has already checked the box is ticked.
      onSuccess(await signup.mutateAsync({ ...values, acceptTerms: acceptTerms as true }));
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        for (const field of FIELDS) {
          const message = error.fields[field];
          if (message) setError(field, { message }, { shouldFocus: true });
        }
      }
    }
  });

  const serverError = signup.isError ? describeError(signup.error) : null;
  const pending = signup.isPending;

  return (
    <form noValidate onSubmit={onSubmit} aria-describedby={serverError ? errorId : undefined}>
      <fieldset disabled={pending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Your details</legend>

        {serverError && (
          <Alert id={errorId} variant="danger" role="alert">
            {serverError}
          </Alert>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            <Input autoComplete="given-name" {...register('firstName')} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input autoComplete="family-name" {...register('lastName')} />
          </Field>
        </div>

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
          description={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words together work well.`}
        >
          <PasswordInput autoComplete="new-password" {...register('password')} />
        </Field>

        <Checkbox
          label={
            <>
              I agree to the <LegalLink to="/terms">Terms and Conditions</LegalLink> and the{' '}
              <LegalLink to="/privacy">Privacy Policy</LegalLink>.
            </>
          }
          error={errors.acceptTerms?.message}
          {...register('acceptTerms')}
        />

        <Button type="submit" size="lg" block loading={pending} className="mt-1">
          {pending ? 'Creating your account…' : 'Create account'}
        </Button>
      </fieldset>
    </form>
  );
}
