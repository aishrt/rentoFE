import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { codeSchema, digitsOnly, oneTimeCodeInputProps, type CodeValues } from './code-schema';
import { useMfaLogin } from './use-session';

interface MfaCodeFormProps {
  challenge: string;
  onSuccess: (user: SessionUser) => void;
  /** Back to the password step, with a message when the attempt expired. */
  onBack: (message?: string) => void;
}

/** The second step of a staff sign-in: the code from the authenticator app (plan §6.1). */
export function MfaCodeForm({ challenge, onSuccess, onBack }: MfaCodeFormProps) {
  const mfaLogin = useMfaLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    try {
      onSuccess(await mfaLogin.mutateAsync({ challenge, code: digitsOnly(code) }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'MFA_CHALLENGE_EXPIRED') {
        onBack(error.message);
      } else if (error instanceof ApiError && error.fields?.code) {
        setError('code', { message: error.fields.code }, { shouldFocus: true });
      }
    }
  });

  const serverError =
    mfaLogin.isError && !(mfaLogin.error instanceof ApiError && mfaLogin.error.fields)
      ? mfaLogin.error instanceof ApiError && ['RATE_LIMITED', 'NETWORK_ERROR'].includes(mfaLogin.error.code)
        ? mfaLogin.error.message
        : 'Something went wrong on our side. Please try again in a moment.'
      : null;

  return (
    <form noValidate onSubmit={onSubmit}>
      <fieldset disabled={mfaLogin.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Authentication code</legend>
        <Alert title="Two-factor sign-in">
          Open your authenticator app and enter the 6-digit code it shows for Rento Vroom.
        </Alert>

        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}

        <Field label="Authentication code" error={errors.code?.message}>
          <Input autoFocus leadingIcon={<ShieldCheck />} {...oneTimeCodeInputProps} {...register('code')} />
        </Field>

        <Button type="submit" size="lg" block loading={mfaLogin.isPending} className="mt-1">
          {mfaLogin.isPending ? 'Checking…' : 'Verify and log in'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => onBack()}>
          Use a different account
        </Button>
      </fieldset>
    </form>
  );
}
