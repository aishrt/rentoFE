import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { MIN_PASSWORD_LENGTH } from '@/features/auth/signup-schema';
import { changePasswordRequest } from './account-api';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { SettingsSection } from './settings-section';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
      .max(200, 'That password is too long'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: "The passwords don't match",
  });
type Values = z.infer<typeof schema>;

/** Change the password; every other device is signed out (plan §6.1). */
export function PasswordSection() {
  const change = useMutation({ mutationFn: changePasswordRequest });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ currentPassword, newPassword });
      reset();
    } catch (error) {
      applyFieldErrors(error, ['currentPassword', 'newPassword'] as const, setError);
    }
  });

  const serverError = change.isError ? formErrorMessage(change.error) : null;

  return (
    <SettingsSection title="Password" description="Changing it signs you out on your other devices.">
      <form noValidate onSubmit={onSubmit}>
        <fieldset disabled={change.isPending} className="grid min-w-0 gap-5">
          <legend className="sr-only">Change your password</legend>
          {change.isSuccess && (
            <Alert variant="success" role="status">
              Password changed. You've been signed out on your other devices.
            </Alert>
          )}
          {serverError && (
            <Alert variant="danger" role="alert">
              {serverError}
            </Alert>
          )}
          <Field label="Current password" error={errors.currentPassword?.message}>
            <PasswordInput autoComplete="current-password" {...register('currentPassword')} />
          </Field>
          <Field
            label="New password"
            error={errors.newPassword?.message}
            description={`At least ${MIN_PASSWORD_LENGTH} characters. A few unrelated words together work well.`}
          >
            <PasswordInput
              autoComplete="new-password"
              {...register('newPassword', { deps: 'confirmPassword' })}
            />
          </Field>
          <Field label="Confirm new password" error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register('confirmPassword')} />
          </Field>
          <div>
            <Button type="submit" loading={change.isPending}>
              Change password
            </Button>
          </div>
        </fieldset>
      </form>
    </SettingsSection>
  );
}
