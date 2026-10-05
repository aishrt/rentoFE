import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { RECORDED_ONLY, fromCents, moneyField, percentField, toCents } from './field-rules';
import { NumberField, SwitchField } from './fields';
import { SettingsForm } from './settings-form';

/* Fees, GST and the security deposit (plan §16, items 2, 4 and 7). */

const feesSchema = z.object({
  guestServiceFeePct: percentField(),
  hostCommissionPct: percentField(),
  platformPaysCardFees: z.boolean(),
});

export function FeesSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="fees"
      title="Fees"
      description="What Guests pay on top of the rental, and what the platform keeps from the Host's rental. Placeholders: a 10% service fee and 20% commission."
      settings={settings}
      schema={feesSchema}
      toValues={({ fees }) => ({
        guestServiceFeePct: String(fees.guestServiceFeePct),
        hostCommissionPct: String(fees.hostCommissionPct),
        platformPaysCardFees: fees.platformPaysCardFees,
      })}
      toUpdate={(values, current) => ({
        fees: {
          ...current.fees,
          guestServiceFeePct: Number(values.guestServiceFeePct),
          hostCommissionPct: Number(values.hostCommissionPct),
          platformPaysCardFees: values.platformPaysCardFees,
        },
      })}
    >
      {() => (
        <>
          <NumberField
            name="guestServiceFeePct"
            label="Guest service fee"
            unit="%"
            description="Of the rental, added at checkout."
          />
          <NumberField
            name="hostCommissionPct"
            label="Host commission"
            unit="%"
            description="Of the rental, kept from the Host's payout."
          />
          <div className="sm:col-span-2">
            <SwitchField
              name="platformPaysCardFees"
              label="The platform pays Stripe's card fees"
              description={`${RECORDED_ONLY} checkout never adds card fees to the Guest's total. Charging them to Guests needs a code change.`}
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}

const gstSchema = z.object({ gstRatePct: percentField() });

export function GstSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="gst"
      title="GST"
      description={
        <>
          Every price includes GST at this rate, and receipts show it on each line. Placeholder: 15% on every
          line, until the client&rsquo;s accountant confirms the treatment. Treating the rental of a Host who
          isn&rsquo;t GST-registered differently needs a change to the pricing code.
        </>
      }
      settings={settings}
      schema={gstSchema}
      toValues={({ fees }) => ({ gstRatePct: String(fees.gstRatePct) })}
      toUpdate={(values, current) => ({ fees: { ...current.fees, gstRatePct: Number(values.gstRatePct) } })}
    >
      {() => <NumberField name="gstRatePct" label="GST rate" unit="%" />}
    </SettingsForm>
  );
}

const depositSchema = z.object({ amount: moneyField() });

export function SecurityDepositSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="securityDeposit"
      title="Security deposit"
      description="A refundable amount held on the Guest's card for the trip. $0 means no deposit, the placeholder."
      settings={settings}
      schema={depositSchema}
      toValues={({ securityDeposit }) => ({ amount: fromCents(securityDeposit.amountCents) })}
      toUpdate={(values) => ({ securityDeposit: { amountCents: toCents(values.amount) } })}
    >
      {() => (
        <NumberField
          name="amount"
          label="Deposit"
          money
          description={`${RECORDED_ONLY} no card hold is placed yet. It's built once the client decides to have one.`}
        />
      )}
    </SettingsForm>
  );
}
