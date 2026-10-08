import { ShieldCheck } from 'lucide-react';
import { Controller, useFormContext, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { fromCents, moneyField, textField, toCents } from './field-rules';
import { NumberField, TextInputField } from './fields';
import { SettingsForm } from './settings-form';

/* Protection plans and the roadside assistance number (plan §16, item 9). */

const NONE = 'NONE';

/** A phone number, or empty for none yet. */
const phoneField = z
  .string()
  .trim()
  .regex(/^(\+?[\d ()-]{6,20})?$/, 'Enter a phone number, like 0800 123 456');

const schema = z.object({
  plans: z.array(
    z.object({
      code: z.string(),
      name: textField('name', 40),
      dailyPrice: moneyField(),
      excess: moneyField(),
      coverSummary: textField('cover summary', 300),
      /** The plan's own roadside number, when its insurer gives one; empty uses the platform-wide one. */
      roadsidePhone: phoneField,
    }),
  ),
  /** The plan every booking includes unless the Guest picks another, or NONE. */
  mandatory: z.string(),
  roadsidePhone: phoneField,
});

function PlanEditor({ index }: { index: number }) {
  const { register, getFieldState, formState, watch } = useFormContext<FieldValues>();
  const error = (field: string) => getFieldState(`plans.${index}.${field}`, formState).error?.message;
  const code = String(watch(`plans.${index}.code`));

  return (
    <div className="grid gap-5 rounded-control border border-line p-4 sm:col-span-2 sm:grid-cols-3 sm:p-5">
      <p className="text-sm font-semibold text-ink sm:col-span-3">
        Plan <span className="font-mono text-xs text-muted">{code}</span>
      </p>
      <Field label="Name" error={error('name')}>
        <Input autoComplete="off" {...register(`plans.${index}.name`)} />
      </Field>
      <NumberField name={`plans.${index}.dailyPrice`} label="Price a day" money />
      <NumberField name={`plans.${index}.excess`} label="Excess" money />
      <Field label="Cover summary" error={error('coverSummary')} className="sm:col-span-3">
        <Input autoComplete="off" {...register(`plans.${index}.coverSummary`)} />
      </Field>
      <Field
        label="Roadside assistance number (optional)"
        description="Only if this plan’s insurer has its own. Leave it empty to use the number below."
        error={error('roadsidePhone')}
        className="sm:col-span-3"
      >
        <Input
          type="tel"
          autoComplete="off"
          spellCheck={false}
          className="sm:max-w-xs"
          {...register(`plans.${index}.roadsidePhone`)}
        />
      </Field>
    </div>
  );
}

export function ProtectionSection({ settings }: { settings: PlatformSettings }) {
  const options = [
    { value: NONE, label: 'None: Guests choose' },
    ...settings.protectionPlans.map((plan) => ({ value: plan.code, label: plan.name })),
  ];

  return (
    <SettingsForm
      decision="protection"
      title="Protection plans and roadside assistance"
      description="The cover Guests choose at checkout, from the insurance partner. Bookings keep the plan and price they were made with. Adding or removing a plan needs a code change."
      settings={settings}
      schema={schema}
      toValues={({ protectionPlans, roadsideAssistance }) => ({
        plans: protectionPlans.map((plan) => ({
          code: plan.code,
          name: plan.name,
          dailyPrice: fromCents(plan.dailyPriceCents),
          excess: fromCents(plan.excessCents),
          coverSummary: plan.coverSummary,
          roadsidePhone: plan.roadsidePhone ?? '',
        })),
        mandatory: protectionPlans.find((plan) => plan.mandatory)?.code ?? NONE,
        roadsidePhone: roadsideAssistance.phone,
      })}
      toUpdate={(values) => ({
        protectionPlans: values.plans.map((plan) => ({
          code: plan.code,
          name: plan.name,
          dailyPriceCents: toCents(plan.dailyPrice),
          excessCents: toCents(plan.excess),
          coverSummary: plan.coverSummary,
          mandatory: plan.code === values.mandatory,
          ...(plan.roadsidePhone && { roadsidePhone: plan.roadsidePhone }),
        })),
        roadsideAssistance: { phone: values.roadsidePhone },
      })}
    >
      {(form) => (
        <>
          {settings.protectionPlans.map((plan, index) => (
            <PlanEditor key={plan.code} index={index} />
          ))}
          <Field
            label="Included in every booking"
            description="The plan a Guest gets unless they pick a better one."
          >
            <Controller
              control={form.control}
              name="mandatory"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={options}
                  icon={<ShieldCheck />}
                  listLabel="Protection plans"
                />
              )}
            />
          </Field>
          <TextInputField
            name="roadsidePhone"
            label="Roadside assistance number"
            type="tel"
            description="Shown with the protection plans on the website, and in the emergency help when reporting an accident or breakdown, unless the booking’s plan has its own. Empty until the insurance partner gives it."
          />
        </>
      )}
    </SettingsForm>
  );
}
