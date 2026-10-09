import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilLine } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import type { z } from 'zod';
import { ApiError } from '@/api/client';
import type { SessionUser } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { signupSchema } from '@/features/auth/signup-schema';
import { sessionQueryKey } from '@/features/auth/use-session';
import { updateNameRequest } from './account-api';
import { applyFieldErrors, formErrorMessage } from './form-errors';
import { PrivacyRequestDialog } from './privacy-section';
import { SettingsSection } from './settings-section';

/** The same name rules as sign-up. */
const schema = signupSchema.pick({ firstName: true, lastName: true });
type Values = z.infer<typeof schema>;

/** "21 April 1990", from the API's YYYY-MM-DD. */
const birthday = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const formatBirthday = (day: string) => birthday.format(new Date(`${day}T00:00:00Z`));

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="mt-0.5 font-medium break-words text-ink">{children}</dd>
    </div>
  );
}

/**
 * Personal details (spec §8; plan §11, PATCH /me): the name and the date of birth. The name can be corrected
 * here until the identity check has passed or is being checked; after that it must match the ID, so a
 * correction goes to our team as a privacy request. The date of birth comes from the driver licence details.
 */
export function PersonalDetailsSection({ user }: { user: SessionUser }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  // Back from the form, focus returns to the button that opened it.
  const [closedForm, setClosedForm] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const save = useMutation({
    mutationFn: updateNameRequest,
    // The header and the account menus read the session, so they show the new name straight away.
    onSuccess: (updated) => queryClient.setQueryData(sessionQueryKey, updated),
  });
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: user.firstName, lastName: user.lastName },
  });

  const close = () => {
    setEditing(false);
    setClosedForm(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      close();
    } catch (error) {
      // The identity check moved on meanwhile: the session learns the name is fixed now.
      if (error instanceof ApiError && error.code === 'NAME_LOCKED') {
        void queryClient.invalidateQueries({ queryKey: sessionQueryKey });
      }
      applyFieldErrors(error, ['firstName', 'lastName'] as const, setError);
    }
  });

  const serverError = save.isError
    ? save.error instanceof ApiError && save.error.code === 'NAME_LOCKED'
      ? save.error.message
      : formErrorMessage(save.error)
    : null;

  return (
    <SettingsSection
      title="Personal details"
      description="Your name as it appears on your driver licence or ID. Hosts see only your first name."
    >
      {save.isSuccess && !editing && (
        <Alert variant="success" role="status" className="mb-5">
          Your name is saved.
        </Alert>
      )}
      <dl className="grid gap-4 sm:grid-cols-3">
        <Detail term="First name">{user.firstName}</Detail>
        <Detail term="Last name">{user.lastName}</Detail>
        <Detail term="Date of birth">
          {user.dateOfBirth ? (
            formatBirthday(user.dateOfBirth)
          ) : (
            <span className="font-normal text-muted">Not added yet</span>
          )}
        </Detail>
      </dl>
      <p className="mt-3 text-sm text-muted">
        {user.dateOfBirth ? (
          'Your date of birth comes from your driver licence details.'
        ) : (
          <>
            Your date of birth is added with your driver licence details, on your{' '}
            <Link to="/account" className="link-underline font-medium text-primary">
              Account page
            </Link>{' '}
            or at checkout.
          </>
        )}
      </p>

      <div className="mt-6">
        {user.nameLocked ? (
          <div className="grid justify-items-start gap-2">
            <p className="text-sm text-ink/85">
              Your name has to match the ID you verified with, so our team corrects it for you.
            </p>
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => setCorrecting(true)}>
              <PencilLine aria-hidden="true" />
              Ask us to correct it
            </Button>
          </div>
        ) : !editing ? (
          <Button
            type="button"
            variant="secondary"
            autoFocus={closedForm}
            onClick={() => {
              reset({ firstName: user.firstName, lastName: user.lastName });
              save.reset();
              setEditing(true);
            }}
          >
            Change name
          </Button>
        ) : (
          <form noValidate onSubmit={onSubmit}>
            <fieldset disabled={save.isPending} className="grid min-w-0 gap-5">
              <legend className="mb-1 text-sm font-semibold text-ink">Change your name</legend>
              <p className="text-sm text-muted">
                Use your name as it is on your ID: it needs to match when we verify your identity.
              </p>
              {serverError && (
                <Alert variant="danger" role="alert">
                  {serverError}
                </Alert>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="First name" error={errors.firstName?.message}>
                  <Input autoComplete="given-name" autoFocus {...register('firstName')} />
                </Field>
                <Field label="Last name" error={errors.lastName?.message}>
                  <Input autoComplete="family-name" {...register('lastName')} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="secondary" loading={save.isPending}>
                  Save name
                </Button>
                <Button type="button" variant="ghost" onClick={close}>
                  Cancel
                </Button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
      <PrivacyRequestDialog kind={correcting ? 'CORRECTION' : null} onClose={() => setCorrecting(false)} />
    </SettingsSection>
  );
}
