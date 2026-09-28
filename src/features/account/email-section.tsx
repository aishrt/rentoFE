import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { changeEmailRequest } from './account-api';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { SettingsSection } from './settings-section';

const schema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, 'Enter the new email address')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
  currentPassword: z.string().min(1, 'Enter your current password'),
});
type Values = z.infer<typeof schema>;

/**
 * The email address, and changing it: the new address gets a link, and the current one keeps
 * working until that link is opened (plan §6.1). A confirmed address keeps the form behind a button,
 * so "Send confirmation link" isn't mistaken for confirming it again.
 */
export function EmailSection({ user }: { user: SessionUser }) {
  const [changing, setChanging] = useState(!user.emailVerified);
  const openButton = useRef<HTMLButtonElement>(null);
  const change = useMutation({ mutationFn: changeEmailRequest });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { newEmail: '', currentPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await change.mutateAsync(values);
      reset();
    } catch (error) {
      applyFieldErrors(error, ['newEmail', 'currentPassword'] as const, setError);
    }
  });

  const cancel = () => {
    reset();
    change.reset();
    flushSync(() => setChanging(false));
    openButton.current?.focus();
  };

  const serverError = change.isError ? formErrorMessage(change.error) : null;

  return (
    <SettingsSection
      title="Email address"
      description="You log in with it, and we send your bookings and receipts to it."
    >
      <p className="mb-6 flex flex-wrap items-center gap-2 font-medium text-ink">
        {user.email}
        {user.emailVerified ? (
          <Badge variant="primary">Confirmed</Badge>
        ) : (
          <>
            <Badge variant="outline">Not confirmed</Badge>
            <Link to="/verify-email" className="link-underline text-sm font-medium text-primary">
              Confirm it
            </Link>
          </>
        )}
      </p>

      {!changing ? (
        <Button ref={openButton} type="button" variant="secondary" onClick={() => setChanging(true)}>
          Change email address
        </Button>
      ) : (
        <form noValidate onSubmit={onSubmit}>
          <fieldset disabled={change.isPending} className="grid min-w-0 gap-5">
            <legend className="mb-1 text-sm font-semibold text-ink">Change your email address</legend>
            {change.isSuccess && (
              <Alert variant="success" role="status">
                We've sent a link to {change.data}. Open it to switch; until then, keep using {user.email}.
              </Alert>
            )}
            {serverError && (
              <Alert variant="danger" role="alert">
                {serverError}
              </Alert>
            )}
            <Field label="New email address" error={errors.newEmail?.message}>
              <Input
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                // Opened by the button, so the next thing is typing the new address.
                autoFocus={user.emailVerified}
                {...register('newEmail')}
              />
            </Field>
            <Field label="Current password" error={errors.currentPassword?.message}>
              <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" variant="secondary" loading={change.isPending}>
                Send confirmation link
              </Button>
              {user.emailVerified && (
                <Button type="button" variant="ghost" onClick={cancel}>
                  Cancel
                </Button>
              )}
            </div>
          </fieldset>
        </form>
      )}
    </SettingsSection>
  );
}
