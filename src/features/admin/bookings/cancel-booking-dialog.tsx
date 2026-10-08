import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { AdminCancelRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { ChoiceCards } from '@/features/host/choice-cards';
import { actionErrorMessage } from './bookings-api';
import { CANCEL_REASONS } from './bookings-labels';

// AdminCancelRequest's note: 3 to 500 characters.
const NOTE_MAX = 500;
type Reason = AdminCancelRequest['reason'];

const isReason = (value: string): value is Reason => CANCEL_REASONS.some((option) => option.value === value);

const cancelSchema = z.object({
  reason: z.string().refine(isReason, 'Choose why it’s cancelled'),
  note: z.string().trim().min(3, 'Add a short note').max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters`),
});

type CancelSchema = typeof cancelSchema;

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cancels the booking. An API error it throws shows in the dialog. */
  onConfirm: (request: AdminCancelRequest) => Promise<void>;
}

/**
 * Cancels a confirmed booking for a no-show, or as a platform cancellation (plan §8.2), with what each means
 * for the Guest's refund and the Host. Needs the refunds permission.
 */
export function CancelBookingDialog({ open, onOpenChange, onConfirm }: CancelBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Cancel this booking?"
        description="The Guest and Host are told straight away, and the refund goes back to the Guest’s card."
      >
        <CancelForm onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ onConfirm }: Pick<CancelBookingDialogProps, 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<CancelSchema>, unknown, z.output<CancelSchema>>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: '', note: '' },
  });

  const onSubmit = handleSubmit(async ({ reason, note }) => {
    try {
      await confirm.mutateAsync({ reason, note });
    } catch (error) {
      applyFieldErrors(error, ['note'] as const, setError);
    }
  });
  const serverError = confirm.isError
    ? actionErrorMessage(confirm.error, { fields: ['note'], needsRefunds: true })
    : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Cancellation</legend>
        <Controller
          name="reason"
          control={control}
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend="Why it’s cancelled"
              name={field.name}
              value={isReason(field.value) ? field.value : ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={CANCEL_REASONS}
              columns={1}
              error={errors.reason?.message}
            />
          )}
        />
        <Field
          label="Note"
          description="What happened, for the audit log and the booking’s history."
          error={errors.note?.message}
        >
          <Textarea rows={3} maxLength={NOTE_MAX} {...register('note')} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Keep booking</Button>
        </DialogClose>
        <Button type="submit" variant="danger" loading={confirm.isPending}>
          Cancel booking
        </Button>
      </div>
    </form>
  );
}
