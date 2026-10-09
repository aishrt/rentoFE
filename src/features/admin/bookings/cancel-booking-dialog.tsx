import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import type { AdminCancellationPreview, AdminCancelRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { formatNzd } from '@/features/booking/booking-format';
import { ChoiceCards } from '@/features/host/choice-cards';
import { actionErrorMessage, useAdminCancellationPreview } from './bookings-api';
import { CANCEL_REASONS, PENDING_CANCEL_REASONS } from './bookings-labels';

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
  /** The booking's reference, for the refund preview. */
  bookingRef: string;
  /** A request, or a booking waiting for the Guest's verification: nothing was charged yet. */
  pending: boolean;
  /** Cancels the booking. An API error it throws shows in the dialog. */
  onConfirm: (request: AdminCancelRequest) => Promise<void>;
}

/**
 * Cancels a confirmed booking for a no-show or as a platform cancellation, or a pending one as a platform
 * cancellation (plan §8.2). As the reason changes it shows what the policy engine would refund and cost, as
 * the normal path does. Needs the refunds permission.
 */
export function CancelBookingDialog({ open, onOpenChange, ...form }: CancelBookingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={form.pending ? 'Cancel this request?' : 'Cancel this booking?'}
        description={
          form.pending
            ? 'The Guest and Host are told straight away, and the hold on the Guest’s card is released.'
            : 'The Guest and Host are told straight away, and the refund goes back to the Guest’s card.'
        }
      >
        <CancelForm {...form} />
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({
  bookingRef,
  pending,
  onConfirm,
}: Omit<CancelBookingDialogProps, 'open' | 'onOpenChange'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const reasons = pending ? PENDING_CANCEL_REASONS : CANCEL_REASONS;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<CancelSchema>, unknown, z.output<CancelSchema>>({
    resolver: zodResolver(cancelSchema),
    // A pending booking has one way to cancel it.
    defaultValues: { reason: pending ? 'PLATFORM' : '', note: '' },
  });
  const reason = useWatch({ control, name: 'reason' });
  const preview = useAdminCancellationPreview(bookingRef, isReason(reason) ? reason : null);
  const refused = preview.data?.allowed === false;

  const onSubmit = handleSubmit(async ({ reason: chosen, note }) => {
    try {
      await confirm.mutateAsync({ reason: chosen, note });
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
              choices={reasons}
              columns={1}
              error={errors.reason?.message}
            />
          )}
        />
        {isReason(reason) && (
          <section aria-label="What this cancellation does" aria-live="polite" aria-busy={preview.isFetching}>
            {preview.isPending ? (
              <div className="grid gap-2">
                <span className="sr-only">Working out the refund</span>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : preview.isError ? (
              <Alert variant="danger" title="We couldn’t work out the refund">
                {preview.error.message}
              </Alert>
            ) : refused ? (
              <Alert variant="danger" title="This cancellation isn’t possible">
                {preview.data.message}
              </Alert>
            ) : (
              <PreviewFigures preview={preview.data} />
            )}
          </section>
        )}
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
          <Button variant="ghost">{pending ? 'Keep request' : 'Keep booking'}</Button>
        </DialogClose>
        <Button type="submit" variant="danger" loading={confirm.isPending} disabled={refused}>
          {pending ? 'Cancel request' : 'Cancel booking'}
        </Button>
      </div>
    </form>
  );
}

/** The refund, what's kept and what the Host gets or pays, with the policy engine's sentence. */
function PreviewFigures({ preview }: { preview: AdminCancellationPreview }) {
  const rows = [
    preview.releasedCents > 0
      ? { label: 'Released from the Guest’s card', value: formatNzd(preview.releasedCents) }
      : { label: 'Refund to the Guest', value: formatNzd(preview.refundCents) },
    preview.feeCents > 0 && { label: 'Kept from the Guest', value: formatNzd(preview.feeCents) },
    preview.hostShareCents > 0 && {
      label: 'Host’s share of what’s kept',
      value: formatNzd(preview.hostShareCents),
    },
    preview.hostFeeCents > 0 && { label: 'Host cancellation fee', value: formatNzd(preview.hostFeeCents) },
  ].filter((row): row is { label: string; value: string } => Boolean(row));

  return (
    <div className="grid gap-3 rounded-inner border border-line bg-ink/3 p-4 text-sm">
      <dl className="grid gap-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4">
            <dt className="text-muted">{row.label}</dt>
            <dd className="font-semibold text-ink tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-ink/85">{preview.message}</p>
    </div>
  );
}
