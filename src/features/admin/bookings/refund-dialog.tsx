import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { AdminRefundRequest } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { applyFieldErrors } from '@/features/account/form-errors';
import { formatNzd } from '@/features/booking/booking-format';
import { ChoiceCards } from '@/features/host/choice-cards';
import { actionErrorMessage } from './bookings-api';
import { dollarsToCents } from '@/features/admin/ops/admin-labels';
import { FUNDED_BY } from './bookings-labels';

const REASON_MAX = 500;
const FUNDERS = ['PLATFORM', 'HOST'] as const;
type FundedBy = AdminRefundRequest['fundedBy'];

const isFunder = (value: string): value is FundedBy => FUNDERS.some((funder) => funder === value);

function refundSchema(maxCents: number) {
  return z.object({
    amount: z.string().superRefine((value, context) => {
      const cents = dollarsToCents(value);
      const message =
        value.trim() === ''
          ? 'Enter an amount'
          : cents === null
            ? 'Enter an amount in dollars, such as 25 or 25.50'
            : cents <= 0
              ? 'Enter an amount above $0'
              : cents > maxCents
                ? `You can refund up to ${formatNzd(maxCents)}`
                : null;
      if (message) context.addIssue({ code: 'custom', message });
    }),
    fundedBy: z.string().refine(isFunder, 'Choose who pays for the refund'),
    reason: z
      .string()
      .trim()
      .min(3, 'Add a short reason')
      .max(REASON_MAX, `Keep it under ${REASON_MAX} characters`),
  });
}

type RefundSchema = ReturnType<typeof refundSchema>;

const FUNDER_CHOICES = [
  {
    value: 'PLATFORM',
    label: FUNDED_BY.PLATFORM,
    description: 'Rento Vroom pays it. The Host’s payout doesn’t change.',
  },
  {
    value: 'HOST',
    label: FUNDED_BY.HOST,
    description: 'Taken from this trip’s payout, or from the Host’s next one if it’s already paid.',
  },
] as const;

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What can still be refunded on the booking's payment. */
  refundableCents: number;
  guestName: string;
  /** Sends the refund. An API error it throws shows in the dialog. */
  onConfirm: (refund: AdminRefundRequest) => Promise<void>;
}

/**
 * A refund to the Guest's card (plan §6.2: staff with the refunds permission), in dollars up to what's left
 * to refund, with who pays for it (plan §8.1, item 15) and a reason for the audit log.
 */
export function RefundDialog({
  open,
  onOpenChange,
  refundableCents,
  guestName,
  onConfirm,
}: RefundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Refund the Guest"
        description={`Back to the card ${guestName} paid with. Up to ${formatNzd(refundableCents)} can still be refunded. We’ll email them.`}
      >
        <RefundForm refundableCents={refundableCents} onConfirm={onConfirm} />
      </DialogContent>
    </Dialog>
  );
}

function RefundForm({
  refundableCents,
  onConfirm,
}: Pick<RefundDialogProps, 'refundableCents' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const schema = useMemo(() => refundSchema(refundableCents), [refundableCents]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<RefundSchema>, unknown, z.output<RefundSchema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', fundedBy: '', reason: '' },
  });

  const onSubmit = handleSubmit(async ({ amount, fundedBy, reason }) => {
    const amountCents = dollarsToCents(amount);
    if (amountCents === null) return;
    try {
      await confirm.mutateAsync({ amountCents, reason, fundedBy });
    } catch (error) {
      applyFieldErrors(error, ['reason'] as const, setError);
      const amountError = error instanceof ApiError ? error.fields?.amountCents : undefined;
      if (amountError) setError('amount', { message: amountError }, { shouldFocus: true });
    }
  });
  const serverError = confirm.isError
    ? actionErrorMessage(confirm.error, { fields: ['amountCents', 'reason'], needsRefunds: true })
    : null;

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={confirm.isPending} className="grid min-w-0 gap-5">
        <legend className="sr-only">Refund</legend>
        <Field
          label="Amount (NZD)"
          description={`Up to ${formatNzd(refundableCents)}.`}
          error={errors.amount?.message}
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            leadingIcon={<DollarSign />}
            placeholder="0.00"
            {...register('amount')}
          />
        </Field>
        <Controller
          name="fundedBy"
          control={control}
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend="Who pays for it"
              name={field.name}
              value={isFunder(field.value) ? field.value : ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
              choices={FUNDER_CHOICES}
              columns={1}
              error={errors.fundedBy?.message}
            />
          )}
        />
        <Field
          label="Reason"
          description="For the audit log. The Guest doesn’t see it."
          error={errors.reason?.message}
        >
          <Textarea rows={3} maxLength={REASON_MAX} {...register('reason')} />
        </Field>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" loading={confirm.isPending}>
          Refund
        </Button>
      </div>
    </form>
  );
}
