import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { sendPhoneCodeRequest, verifyPhoneCodeRequest } from '@/features/account/account-api';
import { applyFieldErrors, formErrorMessage } from '@/features/account/form-errors';
import { codeSchema, digitsOnly, oneTimeCodeInputProps, type CodeValues } from '@/features/auth/code-schema';
import { sessionQueryKey } from '@/features/auth/use-session';

/*
 * A verified mobile before hosting (plan §6.1; the API answers 409 PHONE_NOT_VERIFIED without one): the
 * same texted-code flow as Account settings, inline in the Host application.
 */

const phoneSchema = z.object({ phone: z.string().trim().min(1, 'Enter your mobile number') });

function NumberForm({ onSent }: { onSent: (phone: string, sent: boolean) => void }) {
  const send = useMutation({ mutationFn: sendPhoneCodeRequest });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<{ phone: string }>({ resolver: zodResolver(phoneSchema), defaultValues: { phone: '' } });

  const onSubmit = handleSubmit(async ({ phone }) => {
    try {
      const result = await send.mutateAsync(phone);
      onSent(result.phone, result.sent);
    } catch (error) {
      applyFieldErrors(error, ['phone'] as const, setError);
    }
  });
  const serverError = send.isError ? formErrorMessage(send.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Your mobile number">
      <fieldset disabled={send.isPending} className="grid min-w-0 gap-4">
        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}
        <Field
          label="Mobile number"
          error={errors.phone?.message}
          description="NZ numbers as you'd dial them; overseas numbers with their country code, like +61."
        >
          <Input
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            placeholder="021 123 4567"
            leadingIcon={<Smartphone />}
            {...register('phone')}
          />
        </Field>
        <div>
          <Button type="submit" variant="secondary" loading={send.isPending}>
            Text me a code
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

function CodeForm({ phone, onCancel }: { phone: string; onCancel: () => void }) {
  const queryClient = useQueryClient();
  const verify = useMutation({
    mutationFn: verifyPhoneCodeRequest,
    // The verified user replaces the session, so the application can go ahead.
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
  const resend = useMutation({ mutationFn: sendPhoneCodeRequest });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: '' } });

  const onSubmit = handleSubmit(async ({ code }) => {
    try {
      await verify.mutateAsync(digitsOnly(code));
    } catch (error) {
      applyFieldErrors(error, ['code'] as const, setError);
    }
  });
  const serverError = verify.isError
    ? formErrorMessage(verify.error)
    : resend.isError
      ? formErrorMessage(resend.error)
      : null;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="The code we texted you">
      <fieldset disabled={verify.isPending} className="grid min-w-0 gap-4">
        <Alert role="status">
          {resend.isSuccess ? 'We sent a new code' : 'We sent a code'} to {phone}. It expires in 10 minutes.
        </Alert>
        {serverError && (
          <Alert variant="danger" role="alert">
            {serverError}
          </Alert>
        )}
        <Field label="Code" error={errors.code?.message}>
          <Input autoFocus {...oneTimeCodeInputProps} {...register('code')} />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={verify.isPending}>
            Verify number
          </Button>
          <Button
            type="button"
            variant="ghost"
            loading={resend.isPending}
            onClick={() => resend.mutate(phone)}
          >
            Send a new code
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Use a different number
          </Button>
        </div>
      </fieldset>
    </form>
  );
}

/** The verified number, or the forms to verify one. */
export function PhoneVerification({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<string | null>(null);

  if (user.phoneVerified && user.phone) {
    return (
      <p className="flex animate-fade-in items-center gap-2.5 text-ink">
        <CircleCheck aria-hidden="true" className="size-5 text-success" />
        <span>
          <span className="font-semibold">{user.phone}</span> is verified.
        </span>
      </p>
    );
  }
  return pending ? (
    <CodeForm phone={pending} onCancel={() => setPending(null)} />
  ) : (
    <NumberForm
      onSent={(phone, sent) => {
        if (sent) setPending(phone);
        // Already this account's verified number: the session was out of date.
        else void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      }}
    />
  );
}
