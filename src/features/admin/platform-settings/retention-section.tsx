import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { RECORDED_ONLY, wholeField } from './field-rules';
import { NumberField } from './fields';
import { SettingsForm } from './settings-form';

/*
 * How long records are kept, and when suspicious activity raises a risk flag (plan §14; §16, item 11). The
 * periods are proposed until the client's legal adviser confirms them. The API has the same floors, so a
 * mistyped value can't have the 3 am retention job delete the audit log or trip evidence.
 */

const retentionSchema = z.object({
  financialRecordsYears: wholeField(7, 50, ' years'),
  auditLogYears: wholeField(7, 50, ' years'),
  tripRecordsYears: wholeField(1, 50, ' years'),
  idImagesDays: wholeField(1, 3650, ' days'),
  failedPaymentsPerDay: wholeField(1, 100),
  bookingsPerDay: wholeField(1, 100),
  reportsBeforeFlag: wholeField(1, 100),
  hostCancellationsPer90Days: wholeField(1, 100),
});

export function RetentionAndRiskSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="retentionAndRisk"
      title="Retention and risk"
      description="How long we keep records before the nightly clean-up removes them, and when someone is flagged for the team to look at. Proposed periods until the client’s legal adviser confirms them."
      settings={settings}
      schema={retentionSchema}
      toValues={({ retention, risk }) => ({
        financialRecordsYears: String(retention.financialRecordsYears),
        auditLogYears: String(retention.auditLogYears),
        tripRecordsYears: String(retention.tripRecordsYears),
        idImagesDays: String(retention.idImagesDays),
        failedPaymentsPerDay: String(risk.failedPaymentsPerDay),
        bookingsPerDay: String(risk.bookingsPerDay),
        reportsBeforeFlag: String(risk.reportsBeforeFlag),
        hostCancellationsPer90Days: String(risk.hostCancellationsPer90Days),
      })}
      toUpdate={(values) => ({
        retention: {
          financialRecordsYears: Number(values.financialRecordsYears),
          auditLogYears: Number(values.auditLogYears),
          tripRecordsYears: Number(values.tripRecordsYears),
          idImagesDays: Number(values.idImagesDays),
        },
        risk: {
          failedPaymentsPerDay: Number(values.failedPaymentsPerDay),
          bookingsPerDay: Number(values.bookingsPerDay),
          reportsBeforeFlag: Number(values.reportsBeforeFlag),
          hostCancellationsPer90Days: Number(values.hostCancellationsPer90Days),
        },
      })}
    >
      {() => (
        <>
          <h3 className="text-sm font-semibold text-ink sm:col-span-2">How long we keep records</h3>
          <NumberField
            name="financialRecordsYears"
            label="Bookings, payments and receipts"
            unit="years"
            description={`At least 7 years, as NZ tax law asks. ${RECORDED_ONLY} nothing deletes them yet.`}
          />
          <NumberField
            name="auditLogYears"
            label="Audit log"
            unit="years"
            description="The record of every staff action. At least 7 years, like the financial records."
          />
          <NumberField
            name="tripRecordsYears"
            label="Messages, inspection photos and incident evidence"
            unit="years"
            description="Counted from the end of the trip. Kept longer while a case on the trip is open."
          />
          <NumberField
            name="idImagesDays"
            label="ID photos and selfies"
            unit="days"
            description="After an identity check passes, or after one turned down or not finished began. Stripe deletes them; we keep only the result."
          />

          <h3 className="mt-2 text-sm font-semibold text-ink sm:col-span-2">When someone is flagged</h3>
          <NumberField
            name="failedPaymentsPerDay"
            label="Failed card payments in 24 hours"
            description="A Guest is flagged once this many of their payments fail."
          />
          <NumberField
            name="bookingsPerDay"
            label="Bookings started in 24 hours"
            description="A Guest is flagged when they start more than this many."
          />
          <NumberField
            name="reportsBeforeFlag"
            label="Members reporting the same person in 90 days"
            description="Each member counts once; dismissed reports don’t count."
          />
          <NumberField
            name="hostCancellationsPer90Days"
            label="Host cancellations in 90 days"
            description="A Host is flagged once they cancel this many bookings, no-shows included."
          />
        </>
      )}
    </SettingsForm>
  );
}
