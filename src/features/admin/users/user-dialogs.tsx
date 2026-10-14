import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { DatePartsField } from '@/features/booking/date-parts-field';
import { formatNzd } from '@/features/booking/booking-format';
import { dollarsToCents } from '@/features/admin/ops/admin-labels';
import { userErrorMessage, waiveFeeErrorMessage } from './users-api';

/*
 * The dialogs for actions on someone's account. Like the listing review's DecisionDialog and ConfirmDialog,
 * but they show the API's own words for the refusals these actions get: a staff account that only the admin
 * can change (403), a closure that's blocked (409), or a fee waiver, which is the admin's.
 */

// The API's limits for a reason: a few words, at most 500 characters.
const REASON_MAX = 500;
const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Add a short note saying why')
  .max(REASON_MAX, `Keep it under ${REASON_MAX} characters`);

interface BaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
}

function Actions({
  confirmLabel,
  tone,
  pending,
  onConfirm,
}: {
  confirmLabel: string;
  tone: 'primary' | 'danger';
  pending: boolean;
  onConfirm?: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-3">
      <DialogClose asChild>
        <Button variant="ghost">Cancel</Button>
      </DialogClose>
      <Button type={onConfirm ? 'button' : 'submit'} variant={tone} loading={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}

function ErrorAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert variant="danger" role="alert">
      {message}
    </Alert>
  );
}

// Confirm ---------------------------------------------------------------------------------------------------

interface ActionDialogProps extends BaseProps {
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  /** Shown above the buttons, e.g. what stays after a closure. */
  notice?: ReactNode;
  /** Makes the change. An API error it throws shows in the dialog. */
  onConfirm: () => Promise<void>;
}

/** Asks before an action without notes, such as lifting a suspension or closing an account. */
export function ActionDialog({ open, onOpenChange, title, description, ...body }: ActionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <ActionBody {...body} />
      </DialogContent>
    </Dialog>
  );
}

function ActionBody({
  confirmLabel,
  tone = 'danger',
  notice,
  onConfirm,
}: Pick<ActionDialogProps, 'confirmLabel' | 'tone' | 'notice' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  return (
    <div className="grid gap-5">
      {notice}
      <ErrorAlert message={confirm.isError ? userErrorMessage(confirm.error) : null} />
      <Actions
        confirmLabel={confirmLabel}
        tone={tone}
        pending={confirm.isPending}
        onConfirm={() => confirm.mutate()}
      />
    </div>
  );
}

// Reason ----------------------------------------------------------------------------------------------------

const reasonFormSchema = z.object({ reason: reasonSchema });
type ReasonValues = z.infer<typeof reasonFormSchema>;

interface ReasonDialogProps extends BaseProps {
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  reasonLabel: string;
  reasonDescription?: ReactNode;
  /** Shown above the reason, e.g. what the action does. */
  notice?: ReactNode;
  /** Makes the change. An API error it throws shows in the dialog. */
  onConfirm: (reason: string) => Promise<void>;
}

/** Asks for the reason before an action that needs one, such as a suspension. */
export function ReasonDialog({ open, onOpenChange, title, description, ...form }: ReasonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <ReasonForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  confirmLabel,
  tone = 'danger',
  reasonLabel,
  reasonDescription,
  notice,
  onConfirm,
}: Omit<ReasonDialogProps, keyof BaseProps>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReasonValues>({ resolver: zodResolver(reasonFormSchema), defaultValues: { reason: '' } });

  const onSubmit = handleSubmit(async ({ reason }) => {
    try {
      await confirm.mutateAsync(reason);
    } catch (error) {
      applyFieldErrors(error, ['reason'] as const, setError);
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {notice}
      <ErrorAlert message={confirm.isError ? userErrorMessage(confirm.error) : null} />
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">{reasonLabel}</legend>
        <Field label={reasonLabel} description={reasonDescription} error={errors.reason?.message}>
          <Textarea maxLength={REASON_MAX} {...register('reason')} />
        </Field>
      </fieldset>
      <Actions confirmLabel={confirmLabel} tone={tone} pending={confirm.isPending} />
    </form>
  );
}

// Correct details -------------------------------------------------------------------------------------------

/** What a privacy request can correct (PATCH /admin/users/{id}). */
export interface DetailsCorrection {
  firstName?: string;
  lastName?: string;
  dob?: string;
  email?: string;
  reason: string;
}

const correctSchema = z.object({
  firstName: z.string().trim().min(1, 'Enter their first name').max(50, 'Use 50 characters or fewer'),
  lastName: z.string().trim().min(1, 'Enter their last name').max(50, 'Use 50 characters or fewer'),
  dob: z.string().refine((value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Enter a real date'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'Enter a valid email address' })),
  reason: reasonSchema,
});
type CorrectValues = z.infer<typeof correctSchema>;

interface CorrectDetailsDialogProps extends Omit<BaseProps, 'title' | 'description'> {
  current: { firstName: string; lastName: string; dob?: string; email: string };
  /** Their identity check passed, so the name and date of birth are fixed to their ID. */
  identityChecked: boolean;
  /** Saves only what changed. An API error it throws shows in the dialog. */
  onConfirm: (input: DetailsCorrection) => Promise<void>;
}

/**
 * Corrects someone's name, date of birth or email when they ask (a privacy request, plan §14), once staff have
 * checked them, e.g. against their ID. A new email has to be confirmed from the link sent to it.
 */
export function CorrectDetailsDialog({ open, onOpenChange, ...form }: CorrectDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Correct their details"
        description="When they’ve asked us to, after checking the details, for example against their ID. They can change their mobile and password themselves."
      >
        <CorrectForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

const CORRECT_FIELDS = ['firstName', 'lastName', 'dob', 'email', 'reason'] as const;

function CorrectForm({
  current,
  identityChecked,
  onConfirm,
}: Omit<CorrectDetailsDialogProps, keyof BaseProps>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<CorrectValues>({
    resolver: zodResolver(correctSchema),
    defaultValues: {
      firstName: current.firstName,
      lastName: current.lastName,
      dob: current.dob ?? '',
      email: current.email,
      reason: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const changes: DetailsCorrection = {
      ...(values.firstName !== current.firstName && { firstName: values.firstName }),
      ...(values.lastName !== current.lastName && { lastName: values.lastName }),
      ...(values.dob && values.dob !== current.dob && { dob: values.dob }),
      ...(values.email !== current.email && { email: values.email }),
      reason: values.reason,
    };
    if (Object.keys(changes).length === 1) {
      setError('firstName', { message: 'Change at least one detail' }, { shouldFocus: true });
      return;
    }
    try {
      await confirm.mutateAsync(changes);
    } catch (error) {
      applyFieldErrors(error, CORRECT_FIELDS, setError);
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {identityChecked && (
        <Alert>
          Their identity check has passed: correct the name and date of birth only to match their ID. The
          audit log notes it.
        </Alert>
      )}
      <ErrorAlert message={confirm.isError ? userErrorMessage(confirm.error) : null} />
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">Their details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={errors.firstName?.message}>
            <Input autoComplete="off" {...register('firstName')} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <Input autoComplete="off" {...register('lastName')} />
          </Field>
        </div>
        <Controller
          control={control}
          name="dob"
          render={({ field }) => (
            <DatePartsField
              ref={field.ref}
              legend="Date of birth"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.dob?.message}
            />
          )}
        />
        <Field
          label="Email"
          description="A new address is unconfirmed until they open the link we email to it. We tell the old address."
          error={errors.email?.message}
        >
          <Input type="email" autoComplete="off" {...register('email')} />
        </Field>
        <Field
          label="Reason"
          description="For the audit log: their request’s reference and what you checked."
          error={errors.reason?.message}
        >
          <Textarea maxLength={REASON_MAX} {...register('reason')} />
        </Field>
      </fieldset>
      <Actions confirmLabel="Save details" tone="primary" pending={confirm.isPending} />
    </form>
  );
}

// Waive Host fees -------------------------------------------------------------------------------------------

const waiveSchema = (owedCents: number) =>
  z.object({
    amount: z
      .string()
      .trim()
      .refine(
        (text) => text === '' || dollarsToCents(text) !== null,
        'Enter dollars and cents, like 25 or 25.50',
      )
      .refine((text) => text === '' || (dollarsToCents(text) ?? 0) > 0, 'Enter more than $0')
      .refine(
        (text) => text === '' || (dollarsToCents(text) ?? 0) <= owedCents,
        `They owe ${formatNzd(owedCents)}: enter that or less`,
      ),
    reason: reasonSchema,
  });
type WaiveValues = z.infer<ReturnType<typeof waiveSchema>>;

interface WaiveFeeDialogProps extends Omit<BaseProps, 'title' | 'description'> {
  /** The Host's first name. */
  name: string;
  owedCents: number;
  /** Waives the fees; leave the amount out to waive everything owed. */
  onConfirm: (input: { amountCents?: number; reason: string }) => Promise<void>;
}

/** Waives some or all of the cancellation fees a Host owes. The admin's (plan §8.1, item 10). */
export function WaiveFeeDialog({ open, onOpenChange, name, owedCents, onConfirm }: WaiveFeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Waive Host cancellation fees?"
        description={`${name} owes ${formatNzd(owedCents)} in cancellation fees, taken from their next payouts. Waive some or all of it.`}
      >
        <WaiveForm owedCents={owedCents} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}

function WaiveForm({ owedCents, onConfirm }: Pick<WaiveFeeDialogProps, 'owedCents' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WaiveValues>({
    resolver: zodResolver(waiveSchema(owedCents)),
    defaultValues: { amount: '', reason: '' },
  });

  const onSubmit = handleSubmit(async ({ amount, reason }) => {
    try {
      await confirm.mutateAsync({ amountCents: dollarsToCents(amount) ?? undefined, reason });
    } catch (error) {
      applyFieldErrors(error, ['reason'] as const, setError);
      if (error instanceof ApiError && error.fields?.amountCents) {
        setError('amount', { message: error.fields.amountCents }, { shouldFocus: true });
      }
    }
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <ErrorAlert message={confirm.isError ? waiveFeeErrorMessage(confirm.error) : null} />
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">How much to waive, and why</legend>
        <Field
          label="Amount to waive (optional)"
          description={`Leave it empty to waive all ${formatNzd(owedCents)}.`}
          error={errors.amount?.message}
        >
          <Input inputMode="decimal" autoComplete="off" placeholder="0.00" {...register('amount')} />
        </Field>
        <Field
          label="Reason"
          description="For the audit log. The Host doesn’t see it."
          error={errors.reason?.message}
        >
          <Textarea maxLength={REASON_MAX} {...register('reason')} />
        </Field>
      </fieldset>
      <Actions confirmLabel="Waive fees" tone="primary" pending={confirm.isPending} />
    </form>
  );
}
