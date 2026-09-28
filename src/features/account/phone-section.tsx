import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { codeSchema, digitsOnly, oneTimeCodeInputProps, type CodeValues } from '@/features/auth/code-schema';
import { sessionQueryKey } from '@/features/auth/use-session';
import { sendPhoneCodeRequest, verifyPhoneCodeRequest } from './account-api';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { SettingsSection } from './settings-section';

const phoneSchema = z.object({ phone: z.string().trim().min(1, 'Enter your mobile number') });

/** Step 1: the number. The API checks it's a mobile and texts a code (plan §6.1). */
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
    <form noValidate onSubmit={onSubmit}>
      <fieldset disabled={send.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Your mobile number</legend>
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

/** Step 2: the code from the text. */
function CodeForm({ phone, onDone, onCancel }: { phone: string; onDone: () => void; onCancel: () => void }) {
  const queryClient = useQueryClient();
  const verify = useMutation({
    mutationFn: verifyPhoneCodeRequest,
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
      onDone();
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
    <form noValidate onSubmit={onSubmit}>
      <fieldset disabled={verify.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">The code we texted you</legend>
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

/**
 * The mobile number, verified by a texted code (plan §6.1). A new number needs a new code, and it
 * replaces the verified one only once its code is checked.
 */
export function PhoneSection({ user }: { user: SessionUser }) {
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <SettingsSection
      title="Mobile number"
      description="For trip reminders, and for your host or guest once a booking is confirmed."
    >
      <p className="mb-6 flex flex-wrap items-center gap-2 font-medium text-ink">
        {user.phone ?? <span className="font-normal text-muted">No mobile number yet</span>}
        {user.phone && user.phoneVerified && <Badge variant="primary">Verified</Badge>}
      </p>
      {notice && (
        <Alert variant="success" role="status" className="mb-5">
          {notice}
        </Alert>
      )}
      {pending ? (
        <CodeForm
          phone={pending}
          onDone={() => {
            setPending(null);
            setNotice('Your mobile number is verified.');
          }}
          onCancel={() => setPending(null)}
        />
      ) : (
        <NumberForm
          onSent={(phone, sent) => {
            if (sent) {
              setNotice(null);
              setPending(phone);
            } else {
              setNotice(`${phone} is already your verified number.`);
            }
          }}
        />
      )}
    </SettingsSection>
  );
}
