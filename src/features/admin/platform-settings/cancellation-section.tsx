import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useFormContext, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  RECORDED_ONLY,
  fromCents,
  moneyField,
  percentField,
  textField,
  toCents,
  wholeField,
} from './field-rules';
import { NumberField, SwitchField, Unit } from './fields';
import { SettingsForm } from './settings-form';

/* Cancellation tiers, the Host cancellation fee and no-shows (plan §16, item 3). */

const HOURS_IN_A_YEAR = 8_760;

const schema = z
  .object({
    tiers: z.array(
      z.object({
        code: z.string(),
        name: textField('name', 40),
        summary: textField('summary', 300),
        refunds: z
          .array(
            z.object({ minHoursBefore: wholeField(0, HOURS_IN_A_YEAR, ' hours'), refundPct: percentField() }),
          )
          .min(1, 'Add at least one rule'),
      }),
    ),
    hostSelectableTiers: z.array(z.string()),
    defaultTier: z.string(),
    hostCancellationFee: moneyField(),
    guestCancellationHostSharePct: percentField(),
    refundUnusedDaysOnEarlyReturn: z.boolean(),
  })
  .refine((values) => values.hostSelectableTiers.length > 0, {
    path: ['hostSelectableTiers'],
    error: 'Let Hosts pick at least one tier',
  })
  .refine((values) => values.hostSelectableTiers.includes(values.defaultTier), {
    path: ['defaultTier'],
    error: 'The default must be a tier Hosts can pick',
  });
type Values = z.infer<typeof schema>;

/** "120 hours" → "5 days" under the rule, so long notice periods are easy to read. */
function inDays(hours: string): string | undefined {
  const value = Number(hours);
  if (!/^\d+$/.test(hours.trim()) || value < 24) return undefined;
  const days = value / 24;
  return Number.isInteger(days) ? `${days} day${days === 1 ? '' : 's'}` : undefined;
}

function TierRules({ index }: { index: number }) {
  const { control, register, watch, getFieldState, formState } = useFormContext<FieldValues>();
  const name = `tiers.${index}.refunds`;
  const rules = useFieldArray({ control, name });
  const listError = getFieldState(name, formState).error;

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-medium text-ink">Refund of the rental and service fee</legend>
      <p className="-mt-1 text-sm text-muted">
        The first rule the Guest&rsquo;s notice meets applies, from the most notice down. Delivery and
        protection are always refunded.
      </p>
      {rules.fields.map((rule, ruleIndex) => {
        const hours = getFieldState(`${name}.${ruleIndex}.minHoursBefore`, formState).error;
        const pct = getFieldState(`${name}.${ruleIndex}.refundPct`, formState).error;
        const days = inDays(String(watch(`${name}.${ruleIndex}.minHoursBefore`) ?? ''));
        return (
          <div key={rule.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-3">
            <Field label="Hours' notice" error={hours?.message} description={days}>
              <Input
                inputMode="numeric"
                autoComplete="off"
                {...register(`${name}.${ruleIndex}.minHoursBefore`)}
              />
            </Field>
            <Field label="Refund" error={pct?.message}>
              <Input
                inputMode="decimal"
                autoComplete="off"
                trailing={<Unit>%</Unit>}
                {...register(`${name}.${ruleIndex}.refundPct`)}
              />
            </Field>
            <IconButton
              label={`Remove the rule ${ruleIndex + 1}`}
              className="mt-7"
              disabled={rules.fields.length === 1}
              onClick={() => rules.remove(ruleIndex)}
            >
              <Trash2 aria-hidden="true" />
            </IconButton>
          </div>
        );
      })}
      {listError?.message && <p className="text-sm text-danger">{listError.message}</p>}
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => rules.append({ minHoursBefore: '0', refundPct: '0' })}
        >
          <Plus aria-hidden="true" />
          Add a rule
        </Button>
      </div>
    </fieldset>
  );
}

function TierEditor({ index }: { index: number }) {
  const { register, getFieldState, formState, watch } = useFormContext<FieldValues>();
  const nameError = getFieldState(`tiers.${index}.name`, formState).error;
  const summaryError = getFieldState(`tiers.${index}.summary`, formState).error;
  const code = String(watch(`tiers.${index}.code`));

  return (
    <div className="grid gap-5 rounded-control border border-line p-4 sm:col-span-2 sm:p-5">
      <p className="text-sm font-semibold text-ink">
        Tier <span className="font-mono text-xs text-muted">{code}</span>
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" error={nameError?.message}>
          <Input autoComplete="off" {...register(`tiers.${index}.name`)} />
        </Field>
        <Field label="Summary for Guests and Hosts" error={summaryError?.message} className="sm:col-span-2">
          <Input autoComplete="off" {...register(`tiers.${index}.summary`)} />
        </Field>
      </div>
      <TierRules index={index} />
    </div>
  );
}

export function CancellationSection({ settings }: { settings: PlatformSettings }) {
  const tierOptions = settings.cancellation.tiers.map((tier) => ({ value: tier.code, label: tier.name }));

  return (
    <SettingsForm
      decision="cancellation"
      title="Cancellations"
      description={
        <>
          The tiers Hosts choose from, and what each refunds when a Guest cancels. Bookings keep the terms
          they were made with. Adding, removing or renaming a tier needs a code change, since listings refer
          to them.
        </>
      }
      settings={settings}
      schema={schema}
      toValues={({ cancellation }): Values => ({
        tiers: cancellation.tiers.map((tier) => ({
          code: tier.code,
          name: tier.name,
          summary: tier.summary,
          refunds: tier.refunds.map((rule) => ({
            minHoursBefore: String(rule.minHoursBefore),
            refundPct: String(rule.refundPct),
          })),
        })),
        hostSelectableTiers: cancellation.hostSelectableTiers,
        defaultTier: cancellation.defaultTier,
        hostCancellationFee: fromCents(cancellation.hostCancellationFeeCents),
        guestCancellationHostSharePct: String(cancellation.guestCancellationHostSharePct),
        refundUnusedDaysOnEarlyReturn: cancellation.refundUnusedDaysOnEarlyReturn,
      })}
      toUpdate={(values, current) => ({
        cancellation: {
          ...current.cancellation,
          tiers: values.tiers.map((tier) => ({
            code: tier.code,
            name: tier.name,
            summary: tier.summary,
            refunds: tier.refunds.map((rule) => ({
              minHoursBefore: Number(rule.minHoursBefore),
              refundPct: Number(rule.refundPct),
            })),
          })),
          hostSelectableTiers: values.hostSelectableTiers,
          defaultTier: values.defaultTier,
          hostCancellationFeeCents: toCents(values.hostCancellationFee),
          guestCancellationHostSharePct: Number(values.guestCancellationHostSharePct),
          refundUnusedDaysOnEarlyReturn: values.refundUnusedDaysOnEarlyReturn,
        },
      })}
    >
      {(form) => (
        <>
          {settings.cancellation.tiers.map((tier, index) => (
            <TierEditor key={tier.code} index={index} />
          ))}

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium text-ink">Tiers Hosts can pick</legend>
            {settings.cancellation.tiers.map((tier) => (
              <Checkbox
                key={tier.code}
                label={tier.name}
                value={tier.code}
                {...form.register('hostSelectableTiers')}
              />
            ))}
            {form.formState.errors.hostSelectableTiers?.message && (
              <p className="text-sm text-danger">{form.formState.errors.hostSelectableTiers.message}</p>
            )}
          </fieldset>
          <Field label="Default tier for new listings" error={form.formState.errors.defaultTier?.message}>
            <Controller
              control={form.control}
              name="defaultTier"
              render={({ field }) => (
                <Select
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={tierOptions}
                  icon={<ListChecks />}
                  listLabel="Cancellation tiers"
                />
              )}
            />
          </Field>

          <NumberField
            name="hostCancellationFee"
            label="Host cancellation fee"
            money
            description="Taken from the Host's next payout when they cancel a confirmed booking. Placeholder: $0."
          />
          <NumberField
            name="guestCancellationHostSharePct"
            label="Host's share of a kept Guest fee"
            unit="%"
            description="Of the rental the Guest doesn't get back, before commission. Placeholder: all of it."
          />
          <div className="sm:col-span-2">
            <SwitchField
              name="refundUnusedDaysOnEarlyReturn"
              label="Refund unused days when a Guest returns early"
              description={`${RECORDED_ONLY} a Guest who returns early isn't refunded for the days left. The refund is built if the client chooses to give one. Placeholder: no refund.`}
            />
          </div>
          <p className="text-sm text-muted sm:col-span-2">
            <span className="font-medium text-ink">No-shows:</span> staff record them from the booking. A
            Guest no-show counts as a Guest cancellation at the start time, so the tier&rsquo;s 0-hour rule
            sets the refund; a Host no-show counts as a Host cancellation, with a full refund and the Host
            cancellation fee. Changing how no-shows work needs a code change.
          </p>
        </>
      )}
    </SettingsForm>
  );
}
