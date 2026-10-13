import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { AdminBookingDetail, AdminRefundRequest } from '@/api/types';
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
import { EXTRA_CHARGE_TYPE, FUNDED_BY } from './bookings-labels';

const REASON_MAX = 500;
const FUNDERS = ['PLATFORM', 'HOST'] as const;
const RECOVERIES = ['NEXT_PAYOUT', 'REVERSE_TRANSFER'] as const;
type FundedBy = AdminRefundRequest['fundedBy'];
type RecoverFrom = NonNullable<AdminRefundRequest['recoverFrom']>;

const isFunder = (value: string): value is FundedBy => FUNDERS.some((funder) => funder === value);
const isRecovery = (value: string): value is RecoverFrom => RECOVERIES.some((recovery) => recovery === value);

type HostFunding = NonNullable<AdminBookingDetail['hostFunding']>;

/**
 * What the Host pays back for a refund they fund (plan §8.1, item 15): their share of it, as their payout was
 * worked out, never more than their share left. Rento Vroom covers its commission. As the API works it out.
 */
function hostShareOf(terms: HostFunding, cents: number): number {
  if (terms.baseCents <= 0) return 0;
  return Math.max(
    0,
    Math.min(terms.hostLeftCents, Math.round((cents * terms.payoutCents) / terms.baseCents)),
  );
}

/** A Host-funded refund covers only the rental and delivery (or the extra charge) the Host was paid for. */
const hostLimitMessage = (hostMaxCents: number) =>
  hostMaxCents > 0
    ? `The Host can fund up to ${formatNzd(hostMaxCents)}: the rental and delivery they were paid for. Rento Vroom can fund the rest.`
    : 'Nothing the Host was paid for is left to refund. Choose Rento Vroom.';

function refundSchema(maxCents: number, hostMaxCents: number) {
  return z
    .object({
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
      recoverFrom: z.string().refine(isRecovery, 'Choose how the Host pays it back'),
      reason: z
        .string()
        .trim()
        .min(3, 'Add a short reason')
        .max(REASON_MAX, `Keep it under ${REASON_MAX} characters`),
    })
    .superRefine((value, context) => {
      const cents = dollarsToCents(value.amount);
      if (value.fundedBy === 'HOST' && cents !== null && cents > hostMaxCents)
        context.addIssue({ code: 'custom', path: ['amount'], message: hostLimitMessage(hostMaxCents) });
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
    description:
      'The Host’s share of it, taken from this trip’s payout, or from their next one if it’s already paid. Rento Vroom covers its commission.',
  },
] as const;

/** Once the trip's payout has gone, how a Host-funded refund is taken back (plan §8.1, item 15). */
const RECOVERY_CHOICES = [
  {
    value: 'NEXT_PAYOUT',
    label: 'From their next payout',
    description: 'Shown as its own line on the Host’s next payout.',
  },
  {
    value: 'REVERSE_TRANSFER',
    label: 'Reverse the Stripe transfer',
    description:
      'Taken back from this trip’s payout now. If Stripe can’t, it comes off their next payout instead.',
  },
] as const;

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What can still be refunded on the booking's payment. */
  refundableCents: number;
  /** The trip's payout has been sent, so a Host-funded refund is taken back another way. */
  tripPayoutSent?: boolean;
  /** How much of the booking's payment the Host can fund, and their share (plan §8.1, item 15). */
  hostFunding?: AdminBookingDetail['hostFunding'];
  /** Paid extra charges that can be refunded too (plan §8.1, item 11). */
  charges?: AdminBookingDetail['refundableCharges'];
  guestName: string;
  /** Sends the refund. An API error it throws shows in the dialog. */
  onConfirm: (refund: AdminRefundRequest) => Promise<void>;
}

/**
 * A refund to the Guest's card (plan §6.2: staff with the refunds permission), in dollars up to what's left
 * to refund, with who pays for it (plan §8.1, item 15) and a reason for the audit log. A Host-funded refund
 * after the trip's payout has gone is taken off the Host's next payout, or back from the Stripe transfer.
 */
export function RefundDialog({
  open,
  onOpenChange,
  refundableCents,
  tripPayoutSent = false,
  hostFunding,
  charges = [],
  guestName,
  onConfirm,
}: RefundDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Refund the Guest"
        description={`Back to the card ${guestName} paid with. We’ll email them.`}
      >
        <RefundForm
          refundableCents={refundableCents}
          tripPayoutSent={tripPayoutSent}
          hostFunding={hostFunding}
          charges={charges}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

/** The booking's own payment, or one of its paid extra charges. */
const BOOKING_PAYMENT = 'BOOKING';

function RefundForm({
  refundableCents,
  tripPayoutSent,
  hostFunding,
  charges = [],
  onConfirm,
}: Pick<RefundDialogProps, 'refundableCents' | 'tripPayoutSent' | 'hostFunding' | 'charges' | 'onConfirm'>) {
  const confirm = useMutation({ mutationFn: onConfirm });
  const [target, setTarget] = useState(
    refundableCents > 0 || charges.length === 0 ? BOOKING_PAYMENT : charges[0]!.paymentId,
  );
  const charge = charges.find((candidate) => candidate.paymentId === target);
  const maxCents = charge ? charge.refundableCents : refundableCents;
  const payoutSent = charge ? charge.payoutSent : tripPayoutSent;
  // Without the terms (an older API), the API still checks it.
  const terms = charge ? charge.hostFunding : hostFunding;
  const hostMaxCents = terms ? Math.min(maxCents, terms.maxCents) : maxCents;
  const schema = refundSchema(maxCents, hostMaxCents);
  const targets = [
    ...(refundableCents > 0
      ? [
          {
            value: BOOKING_PAYMENT,
            label: 'The booking',
            description: `Up to ${formatNzd(refundableCents)} of the trip’s payment.`,
          },
        ]
      : []),
    ...charges.map((option) => ({
      value: option.paymentId,
      label: `Extra charge: ${EXTRA_CHARGE_TYPE[option.type]}`,
      description: `${option.description} Up to ${formatNzd(option.refundableCents)}.`,
    })),
  ];
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.input<RefundSchema>, unknown, z.output<RefundSchema>>({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', fundedBy: '', recoverFrom: 'NEXT_PAYOUT', reason: '' },
  });
  const funder = useWatch({ control, name: 'fundedBy' });
  const askRecovery = Boolean(payoutSent) && funder === 'HOST';
  const amountCents = dollarsToCents(useWatch({ control, name: 'amount' }) ?? '');
  const hostPays =
    funder === 'HOST' && terms && amountCents !== null && amountCents > 0 && amountCents <= hostMaxCents
      ? hostShareOf(terms, amountCents)
      : null;

  const onSubmit = handleSubmit(async ({ amount, fundedBy, recoverFrom, reason }) => {
    const amountCents = dollarsToCents(amount);
    if (amountCents === null) return;
    try {
      await confirm.mutateAsync({
        amountCents,
        reason,
        fundedBy,
        ...(charge && { paymentId: charge.paymentId }),
        ...(fundedBy === 'HOST' && payoutSent && { recoverFrom }),
      });
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
        {targets.length > 1 && (
          <ChoiceCards
            legend="What to refund"
            name="target"
            value={target}
            onChange={setTarget}
            choices={targets}
            columns={1}
          />
        )}
        <Field
          label="Amount (NZD)"
          description={
            funder === 'HOST' && hostMaxCents < maxCents
              ? `Up to ${formatNzd(hostMaxCents)} when the Host funds it: the rental and delivery they were paid for.`
              : `Up to ${formatNzd(maxCents)}.`
          }
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
        {hostPays !== null && amountCents !== null && (
          <p className="text-sm text-muted" role="status">
            {hostPays < amountCents
              ? `The Host pays ${formatNzd(hostPays)} of this (their share); Rento Vroom covers its commission.`
              : `The Host pays all ${formatNzd(hostPays)} of this.`}
          </p>
        )}
        {askRecovery && (
          <Controller
            name="recoverFrom"
            control={control}
            render={({ field }) => (
              <ChoiceCards
                ref={field.ref}
                legend="How the Host pays it back"
                description={
                  charge
                    ? 'The Host’s share of this charge has already been sent to them.'
                    : 'This trip’s payout has already been sent to the Host.'
                }
                name={field.name}
                value={isRecovery(field.value) ? field.value : ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                choices={RECOVERY_CHOICES}
                columns={1}
                error={errors.recoverFrom?.message}
              />
            )}
          />
        )}
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
