import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { formatNzd } from '@/features/booking/booking-format';
import { dollarsToCents } from '@/features/admin/ops/admin-labels';
import { userErrorMessage, waiveFeeErrorMessage } from './users-api';

/*
 * The dialogs for actions on someone's account. Like the listing review's DecisionDialog and ConfirmDialog,
 * but they show the API's own words for the refusals these actions get: a staff account that only the admin
 * can change (403), a closure that's blocked (409), or a missing refunds permission.
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

/** Waives some or all of the cancellation fees a Host owes. Needs the refunds permission. */
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
