import { zodResolver } from '@hookform/resolvers/zod';
import { Fuel, Info, PlugZap } from 'lucide-react';
import { useEffect, useMemo, type ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { formatNzdFromCents } from '@/lib/format';
import { ChoiceCards } from './choice-cards';
import { FormSection } from './form-section';
import {
  pricingDefaults,
  pricingFieldFor,
  pricingPatch,
  pricingSchema,
  type PricingValues,
} from './pricing-form';
import type { StepProps } from './step-props';
import { StepFrame } from './step-frame';
import { placeFieldErrors, useStepSave, type StepTarget } from './use-step-save';
import { BODY_TYPE_LABELS } from './vehicle-labels';

/** Text inside the end of an input, such as "a day" or "%". */
function Unit({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="pointer-events-none flex items-center pr-3 text-sm text-muted">
      {children}
    </span>
  );
}

const Dollar = () => <span className="text-base text-muted">$</span>;

/** Step 4: the daily price, discounts, trip length, kilometres, fuel and cancellation (plan §9, Days 8–11). */
export function PricingStep({ vehicle, policies, missing, registerSave }: StepProps) {
  const { save, savingTo, problem } = useStepSave(vehicle, 4);
  const schema = useMemo(() => pricingSchema(policies), [policies]);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<PricingValues>({
    resolver: zodResolver(schema),
    defaultValues: pricingDefaults(vehicle, policies),
    mode: 'onTouched',
  });
  const unlimitedKm = useWatch({ control, name: 'unlimitedKm' });

  const saveTo = (target: StepTarget) =>
    handleSubmit((values) =>
      save(pricingPatch(values, policies), target, {
        changed: isDirty,
        onFieldErrors: (fields) => placeFieldErrors(fields, pricingFieldFor, setError),
      }),
    )();

  useEffect(() => registerSave(saveTo));

  const { min, max } = policies.vehicles.dailyPriceCents;
  const typical = vehicle.bodyType
    ? policies.hostEstimator.dailyCentsByBodyType[vehicle.bodyType]
    : undefined;
  const tiers = policies.cancellation.tiers.filter((tier) =>
    policies.cancellation.hostSelectableTiers.includes(tier.code),
  );
  const defaultTier = policies.cancellation.tiers.find(
    (tier) => tier.code === policies.cancellation.defaultTier,
  );
  const electric = vehicle.fuelType === 'EV';

  return (
    <StepFrame
      step={4}
      title="Pricing"
      description="You set your daily price and terms. We work out each guest's total at checkout."
      onSubmit={(event) => {
        event.preventDefault();
        void saveTo({ step: 5 });
      }}
      onBack={() => void saveTo({ step: 3 })}
      onExit={() => void saveTo('exit')}
      savingTo={savingTo}
      problem={problem}
      missing={missing}
    >
      <FormSection title="Daily price" columns={1}>
        <Field
          label="Price per day (NZD)"
          error={errors.daily?.message}
          description={
            typical && vehicle.bodyType
              ? `Between ${formatNzdFromCents(min)} and ${formatNzdFromCents(max)}. ${BODY_TYPE_LABELS[vehicle.bodyType]}s like yours often list at around ${formatNzdFromCents(typical)} a day.`
              : `Between ${formatNzdFromCents(min)} and ${formatNzdFromCents(max)}.`
          }
          className="max-w-sm"
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="89"
            leadingIcon={<Dollar />}
            trailing={<Unit>a day</Unit>}
            className="text-lg font-semibold"
            {...register('daily')}
          />
        </Field>
        <p className="flex items-start gap-2 rounded-control bg-primary/5 p-3 text-sm text-ink">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Guests also pay a service fee and protection cover, which we add at checkout. Our{' '}
            {policies.fees.hostCommissionPct}% Host commission comes out of your earnings.
          </span>
        </p>
      </FormSection>

      <FormSection
        title="Longer trips"
        description="Optional discounts that make longer trips more appealing."
      >
        <Field
          label="Weekly discount"
          error={errors.weeklyDiscount?.message}
          description="For trips of 7 days or more."
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            trailing={<Unit>%</Unit>}
            {...register('weeklyDiscount')}
          />
        </Field>
        <Field
          label="Monthly discount"
          error={errors.monthlyDiscount?.message}
          description="For trips of 28 days or more."
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            trailing={<Unit>%</Unit>}
            {...register('monthlyDiscount')}
          />
        </Field>
      </FormSection>

      <FormSection title="Trip length">
        <Field label="Shortest trip" error={errors.minDays?.message}>
          <Input
            inputMode="numeric"
            autoComplete="off"
            trailing={<Unit>days</Unit>}
            {...register('minDays')}
          />
        </Field>
        <Field label="Longest trip" error={errors.maxDays?.message}>
          <Input
            inputMode="numeric"
            autoComplete="off"
            trailing={<Unit>days</Unit>}
            {...register('maxDays')}
          />
        </Field>
      </FormSection>

      <FormSection title="Kilometres">
        <Controller
          control={control}
          name="unlimitedKm"
          render={({ field }) => (
            <Switch
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              label="Unlimited kilometres"
              description="Popular with road-trippers, and a filter guests search on."
              className="sm:col-span-2"
            />
          )}
        />
        {!unlimitedKm && (
          <>
            <Field
              label="Kilometres included per day"
              error={errors.kmPerDay?.message}
              className="animate-fade-up"
            >
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="250"
                trailing={<Unit>km</Unit>}
                {...register('kmPerDay')}
              />
            </Field>
            <Field
              label="Price per extra kilometre"
              error={errors.extraKm?.message}
              description="Charged after the trip, from the odometer readings."
              className="animate-fade-up"
            >
              <Input
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.35"
                leadingIcon={<Dollar />}
                trailing={<Unit>/km</Unit>}
                {...register('extraKm')}
              />
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title={electric ? 'Charge' : 'Fuel'} columns={1}>
        <Controller
          control={control}
          name="fuelPolicy"
          render={({ field }) => (
            <ChoiceCards
              ref={field.ref}
              legend={electric ? 'How guests return the battery' : 'How guests return the tank'}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.fuelPolicy?.message}
              choices={[
                {
                  value: 'SAME_LEVEL',
                  label: 'Same level',
                  icon: electric ? <PlugZap /> : <Fuel />,
                  description: electric
                    ? 'Back with the charge it had at pickup.'
                    : 'Back with the fuel it had at pickup.',
                },
                {
                  value: 'FULL',
                  label: electric ? 'Fully charged' : 'Full tank',
                  icon: electric ? <PlugZap /> : <Fuel />,
                  description: electric
                    ? 'Back charged to 100%, whatever it had.'
                    : 'Back full, whatever it had.',
                },
              ]}
            />
          )}
        />
      </FormSection>

      <FormSection title="Cancellation policy" columns={1}>
        {tiers.length > 1 ? (
          <Controller
            control={control}
            name="cancellationTier"
            render={({ field }) => (
              <ChoiceCards
                ref={field.ref}
                legend="What guests get back if they cancel"
                description="Shown on your listing and at checkout. Bookings keep the policy they were made with."
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.cancellationTier?.message}
                columns={1}
                choices={tiers.map((tier) => ({
                  value: tier.code,
                  label: tier.name,
                  description: tier.summary,
                }))}
              />
            )}
          />
        ) : (
          <p className="text-sm text-muted">
            Every listing uses our{' '}
            <span className="font-semibold text-ink">{(tiers[0] ?? defaultTier)?.name ?? 'standard'}</span>{' '}
            policy: {(tiers[0] ?? defaultTier)?.summary}
          </p>
        )}
      </FormSection>
    </StepFrame>
  );
}
