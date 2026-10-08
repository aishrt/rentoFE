import { zodResolver } from '@hookform/resolvers/zod';
import { DollarSign, Receipt, Tag } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import type { Incident } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { StatusBadge } from '@/features/booking/booking-parts';
import { dollarsToCents } from '@/features/admin/ops/admin-labels';
import { formatNzd } from '@/features/booking/booking-format';
import { useIncidentCharge } from './operations-api';
import {
  CHARGE_MAX_CENTS,
  CHARGE_STATUS,
  CHARGE_TYPES,
  defaultChargeType,
  extraChargeTypeLabel,
  type ChargeType,
} from './operations-labels';

// The API's limits for a charge's description.
const DESCRIPTION_MIN = 3;
const DESCRIPTION_MAX = 200;

const isChargeType = (value: string): value is ChargeType =>
  CHARGE_TYPES.some((type) => type.value === value);

const chargeSchema = z.object({
  // Not narrowed to ChargeType here, so the form's values and the schema's output stay the same type.
  type: z
    .string()
    .refine((value) => CHARGE_TYPES.some((type) => type.value === value), 'Choose what it’s for'),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, 'Say what it’s for, such as “Interior clean after smoking”')
    .max(DESCRIPTION_MAX, `Keep it under ${DESCRIPTION_MAX} characters`),
  amount: z.string().superRefine((value, context) => {
    const cents = dollarsToCents(value);
    const message =
      value.trim() === ''
        ? 'Enter an amount'
        : cents === null
          ? 'Enter an amount in dollars, such as 45 or 45.50'
          : cents <= 0
            ? 'Enter an amount above $0'
            : cents > CHARGE_MAX_CENTS
              ? `A charge can be up to ${formatNzd(CHARGE_MAX_CENTS)}`
              : null;
    if (message) context.addIssue({ code: 'custom', message });
  }),
});

type ChargeValues = z.infer<typeof chargeSchema>;

/** The message above the form for an API error; field errors show under their field. */
function chargeErrorMessage(error: Error): string | null {
  if (!(error instanceof ApiError)) return error.message;
  if (error.status === 403)
    return 'You need the refunds permission to charge a Guest. An admin can give it to you.';
  if (error.fields) return null;
  return error.message;
}

function ChargeForm({ incident }: { incident: Incident }) {
  const charge = useIncidentCharge(incident.caseRef);
  const defaults: ChargeValues = { type: defaultChargeType(incident.type), description: '', amount: '' };
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<ChargeValues>({ resolver: zodResolver(chargeSchema), defaultValues: defaults });
  const cents = dollarsToCents(useWatch({ control, name: 'amount' }) ?? '');

  const onSubmit = handleSubmit(async ({ type, description, amount }) => {
    const amountCents = dollarsToCents(amount);
    if (amountCents === null || !isChargeType(type)) return;
    try {
      await charge.mutateAsync({ type, description, amountCents });
    } catch (error) {
      if (!(error instanceof ApiError) || !error.fields) return;
      if (error.fields.description) setError('description', { message: error.fields.description });
      if (error.fields.amountCents) setError('amount', { message: error.fields.amountCents });
      return;
    }
    reset(defaults);
    toast(`${formatNzd(amountCents)} charge added`, {
      description: 'We’re charging the Guest’s saved card; the Host’s share is paid out to them.',
    });
  });

  const serverError = charge.error ? chargeErrorMessage(charge.error) : null;
  const valid = cents !== null && cents > 0 && cents <= CHARGE_MAX_CENTS;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Charge the Guest" className="grid gap-4">
      {serverError && (
        <Alert variant="danger" role="alert">
          {serverError}
        </Alert>
      )}
      <fieldset disabled={charge.isPending} className="grid min-w-0 gap-4">
        <legend className="sr-only">Charge the Guest</legend>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Field label="For" error={errors.type?.message}>
              <Select
                ref={field.ref}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={CHARGE_TYPES}
                icon={<Tag />}
                listLabel="Charge types"
              />
            </Field>
          )}
        />
        <Field
          label="Description"
          description="The Guest sees it on the charge."
          error={errors.description?.message}
        >
          <Input autoComplete="off" maxLength={DESCRIPTION_MAX} {...register('description')} />
        </Field>
        <Field label="Amount (NZD)" error={errors.amount?.message}>
          <Input
            inputMode="decimal"
            autoComplete="off"
            leadingIcon={<DollarSign />}
            placeholder="0.00"
            {...register('amount')}
          />
        </Field>
      </fieldset>
      <Button type="submit" loading={charge.isPending} className="justify-self-start">
        {valid ? `Charge ${formatNzd(cents)}` : 'Charge the Guest'}
      </Button>
    </form>
  );
}

/**
 * Charges from a case (plan §8.1, item 11): those already added, and once the case is resolved, a new one
 * for fuel, cleaning, a late return, damage, tolls or fines. Needs the refunds permission.
 */
export function IncidentCharges({ incident }: { incident: Incident }) {
  const resolved = incident.status === 'RESOLVED';
  return (
    <Card asChild className="p-5 sm:p-6">
      <section aria-labelledby="case-charges-title">
        <h2 id="case-charges-title" className="flex items-center gap-2 font-semibold text-ink">
          <Receipt aria-hidden="true" className="size-4.5 text-primary" />
          Charges
        </h2>

        {incident.extraCharges.length > 0 ? (
          <ul aria-label="Charges from this case" className="mt-4 grid gap-3 text-sm">
            {incident.extraCharges.map((item, index) => (
              <li key={`${item.description}-${index}`} className="grid gap-1">
                <div className="flex justify-between gap-3">
                  <span className="text-ink">{item.description}</span>
                  <span className="font-medium tabular-nums text-ink">{formatNzd(item.amountCents)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-muted">
                  {extraChargeTypeLabel(item.type)}
                  <StatusBadge status={CHARGE_STATUS[item.status]} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No charges from this case.</p>
        )}

        <div className="mt-5 border-t border-line pt-5">
          {resolved ? (
            <>
              <p className="mb-4 text-sm text-muted">
                Charged to the Guest’s saved card, and the Host’s share is paid on to them as its own payout.
                We’ll email the Guest.
              </p>
              <ChargeForm incident={incident} />
            </>
          ) : (
            <p className="text-sm text-muted">
              Once the case is resolved, you can charge the Guest for fuel, cleaning, a late return, damage,
              tolls or fines.
            </p>
          )}
        </div>
      </section>
    </Card>
  );
}
