import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { actionErrorMessage } from './bookings-api';

// The API's limits for a staff reason: a few words, up to 500 characters.
const REASON_MAX = 500;
const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Add a short reason')
    .max(REASON_MAX, `Keep it under ${REASON_MAX} characters`),
});

type ReasonValues = z.infer<typeof reasonSchema>;

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** What the change does, in a sentence or two. */
  description?: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  reasonLabel: string;
  reasonDescription?: ReactNode;
  /** Makes the change. An API error it throws shows in the dialog. */
  onConfirm: (reason: string) => Promise<void>;
}

/** Confirms a staff action that needs a reason. The reason goes to the audit log with the change. */
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
  tone = 'primary',
  reasonLabel,
  reasonDescription,
  onConfirm,
}: Omit<ReasonDialogProps, 'open' | 'onOpenChange' | 'title' | 'description'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReasonValues>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: '' } });

  const onSubmit = handleSubmit(async ({ reason }) => {
    try {
      await confirm.mutateAsync(reason);
    } catch (error) {
      applyFieldErrors(error, ['reason'] as const, setError);
    }
  });
  const serverError = confirm.isError ? actionErrorMessage(confirm.error, { fields: ['reason'] }) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">{reasonLabel}</legend>
        <Field label={reasonLabel} description={reasonDescription} error={errors.reason?.message}>
          <Textarea maxLength={REASON_MAX} {...register('reason')} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant={tone} loading={confirm.isPending}>
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
