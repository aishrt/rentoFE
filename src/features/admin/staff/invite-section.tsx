import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { applyFieldErrors } from '@/features/account/form-errors';
import { SettingsSection } from '@/features/account/settings-section';
import { inviteStaffRequest, staffErrorMessage, staffQueryKey } from './staff-api';

const name = (label: string) =>
  z.string().trim().min(1, `Enter their ${label}`).max(50, `That ${label} is too long`);

const schema = z.object({
  firstName: name('first name'),
  lastName: name('last name'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter their email address')
    .pipe(z.email({ error: 'Enter a valid email address, like name@example.co.nz' })),
});
type Values = z.infer<typeof schema>;

/**
 * The admin invites someone to the support team (plan §6.2). They get an email with a link to choose a
 * password; there's no other way to join, so nobody can make a staff account for themselves.
 */
export function InviteSection() {
  const queryClient = useQueryClient();
  const invite = useMutation({ mutationFn: inviteStaffRequest });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const sent = await invite.mutateAsync(values);
      reset();
      toast(`Invitation sent to ${sent.email}`, {
        description: `${sent.firstName} has 7 days to accept it.`,
      });
      void queryClient.invalidateQueries({ queryKey: staffQueryKey });
    } catch (error) {
      applyFieldErrors(error, ['firstName', 'lastName', 'email'] as const, setError);
    }
  });

  const serverError = invite.isError ? staffErrorMessage(invite.error) : null;

  return (
    <SettingsSection
      title="Invite to the support team"
      description="We email them a link to choose a password. It works once, for 7 days. Support can review Hosts, listings and bookings, but can't change settings or invite anyone."
    >
      <form noValidate onSubmit={onSubmit}>
        <fieldset disabled={invite.isPending} className="grid min-w-0 gap-5">
          <legend className="sr-only">Who to invite</legend>
          {serverError && (
            <Alert variant="danger" role="alert">
              {serverError}
            </Alert>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="First name" error={errors.firstName?.message}>
              <Input autoComplete="off" {...register('firstName')} />
            </Field>
            <Field label="Last name" error={errors.lastName?.message}>
              <Input autoComplete="off" {...register('lastName')} />
            </Field>
          </div>
          <Field label="Work email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="off"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              {...register('email')}
            />
          </Field>
          <div>
            <Button type="submit" loading={invite.isPending}>
              <Send aria-hidden="true" />
              Send invitation
            </Button>
          </div>
        </fieldset>
      </form>
    </SettingsSection>
  );
}
