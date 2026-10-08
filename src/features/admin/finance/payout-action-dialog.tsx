import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { AdminPayout } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { formErrorMessage } from '@/features/account/form-errors';
import { formatNzd } from '@/features/booking/booking-format';
import { payoutActionRequest, type PayoutAction } from './finance-api';

// The API's limits for a hold's reason.
const REASON_MAX = 500;
const holdSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, 'Say why you’re holding it')
    .max(REASON_MAX, `Keep it under ${REASON_MAX} characters`),
});
type HoldValues = z.infer<typeof holdSchema>;

/** The API's own message for a payout that changed meanwhile (already paid, no longer held), or a general one. */
function actionErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && (error.status === 404 || error.status === 409)) return error.message;
  return formErrorMessage(error);
}

const COPY: Record<PayoutAction, { title: (name: string) => string; confirm: string }> = {
  hold: { title: (name) => `Hold ${name}’s payout?`, confirm: 'Hold payout' },
  release: { title: (name) => `Release ${name}’s payout?`, confirm: 'Release payout' },
  retry: { title: (name) => `Send ${name}’s payout again?`, confirm: 'Send again' },
};

function describe(action: PayoutAction, payout: AdminPayout) {
  const amount = formatNzd(payout.amountCents);
  if (action === 'hold') {
    return `${amount} for booking ${payout.bookingRef}. It isn’t sent until you release it, and your reason is kept in the audit log.`;
  }
  if (action === 'release') {
    return `${amount} for booking ${payout.bookingRef}. We check the holds again first: if one still applies, such as an open incident or card dispute, the payout goes straight back on hold.`;
  }
  return `${amount} for booking ${payout.bookingRef}. It goes back in the queue and Stripe tries the transfer again.`;
}

interface PayoutActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Kept while the dialog closes, so its text doesn't change as it animates out. */
  action: PayoutAction | null;
  payout: AdminPayout | null;
  /** The payout as the API returned it. */
  onDone: (payout: AdminPayout, action: PayoutAction) => void;
}

/** Confirms holding (with a reason), releasing or retrying a Host payout. Admin only; each is audited. */
export function PayoutActionDialog({ open, onOpenChange, action, payout, onDone }: PayoutActionDialogProps) {
  const name = payout?.host.name ?? 'this Host';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={action ? COPY[action].title(name) : 'Payout'}
        description={action && payout ? describe(action, payout) : undefined}
      >
        {action && payout && (
          <ActionForm key={`${action}-${payout.id}`} action={action} payout={payout} onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActionForm({
  action,
  payout,
  onDone,
}: {
  action: PayoutAction;
  payout: AdminPayout;
  onDone: PayoutActionDialogProps['onDone'];
}) {
  const send = useMutation({
    mutationFn: (reason?: string) => payoutActionRequest(action, payout.id, reason),
    onSuccess: (updated) => onDone(updated, action),
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<HoldValues>({
    resolver: action === 'hold' ? zodResolver(holdSchema) : undefined,
    defaultValues: { reason: '' },
  });

  const onSubmit = handleSubmit(async ({ reason }) => {
    try {
      await send.mutateAsync(action === 'hold' ? reason.trim() : undefined);
    } catch (error) {
      const message = error instanceof ApiError ? error.fields?.reason : undefined;
      if (message) setError('reason', { message }, { shouldFocus: true });
    }
  });
  const serverError = send.isError ? actionErrorMessage(send.error) : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      {action === 'hold' && (
        <fieldset disabled={send.isPending} className="grid min-w-0 gap-4">
          <legend className="sr-only">Why</legend>
          <Field
            label="Why you’re holding it"
            description="For the audit log and the rest of the team."
            error={errors.reason?.message}
          >
            <Textarea maxLength={REASON_MAX} {...register('reason')} />
          </Field>
        </fieldset>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" variant={action === 'hold' ? 'danger' : 'primary'} loading={send.isPending}>
          {COPY[action].confirm}
        </Button>
      </div>
    </form>
  );
}
