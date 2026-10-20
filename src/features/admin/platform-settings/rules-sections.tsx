import { useMemo } from 'react';
import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { Checkbox } from '@/components/ui/checkbox';
import { LICENCE_CLASS_LABELS, type LicenceClass } from '@/features/booking/booking-format';
import { isValidGstNumber } from '@/lib/gst-number';
import { RECORDED_ONLY, decimalField, textField, timeField, wholeField } from './field-rules';
import { NumberField, SwitchField, TextInputField } from './fields';
import { SettingsForm } from './settings-form';

/*
 * Eligibility, reviews and trips, the company, the open booking rules and the optional NZ services
 * (plan §16, items 1, 5, 10, 13 and 15).
 */

const LICENCE_CLASSES = Object.keys(LICENCE_CLASS_LABELS) as LicenceClass[];

const eligibilitySchema = z.object({
  minAge: wholeField(16, 99),
  minYearsLicensed: decimalField(0, 20),
  acceptedLicenceClasses: z.array(z.string()).min(1, 'Accept at least one licence'),
  overseasNeedsEnglishProof: z.boolean(),
  phoneAtCheckout: z.boolean(),
  identityBeforeFirstBooking: z.boolean(),
  identityForHosts: z.boolean(),
  emailBeforeTripStart: z.boolean(),
});

export function EligibilitySection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="eligibility"
      title="Driver eligibility and verification"
      description="Who can book, and what they confirm before a trip. Checkout checks the driver's licence against these now. Placeholders: 21 or older, a licence held for a year, identity checked before the first booking."
      settings={settings}
      schema={eligibilitySchema}
      toValues={({ eligibility, verification }) => ({
        minAge: String(eligibility.minAge),
        minYearsLicensed: String(eligibility.minYearsLicensed),
        acceptedLicenceClasses: eligibility.acceptedLicenceClasses,
        overseasNeedsEnglishProof: eligibility.overseasNeedsEnglishProof,
        phoneAtCheckout: verification.phoneAtCheckout,
        identityBeforeFirstBooking: verification.identityBeforeFirstBooking,
        identityForHosts: verification.identityForHosts,
        emailBeforeTripStart: verification.emailBeforeTripStart,
      })}
      toUpdate={(values) => ({
        eligibility: {
          minAge: Number(values.minAge),
          minYearsLicensed: Number(values.minYearsLicensed),
          acceptedLicenceClasses: values.acceptedLicenceClasses as LicenceClass[],
          overseasNeedsEnglishProof: values.overseasNeedsEnglishProof,
        },
        verification: {
          phoneAtCheckout: values.phoneAtCheckout,
          identityBeforeFirstBooking: values.identityBeforeFirstBooking,
          identityForHosts: values.identityForHosts,
          emailBeforeTripStart: values.emailBeforeTripStart,
        },
      })}
    >
      {(form) => (
        <>
          <NumberField name="minAge" label="Minimum age" unit="years" />
          <NumberField name="minYearsLicensed" label="Licence held for at least" unit="years" />
          <fieldset className="grid gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-ink">Licences accepted</legend>
            {LICENCE_CLASSES.map((licence) => (
              <Checkbox
                key={licence}
                label={LICENCE_CLASS_LABELS[licence]}
                value={licence}
                {...form.register('acceptedLicenceClasses')}
              />
            ))}
            {form.formState.errors.acceptedLicenceClasses?.message && (
              <p className="text-sm text-danger">{form.formState.errors.acceptedLicenceClasses.message}</p>
            )}
          </fieldset>
          <div className="grid gap-1 sm:col-span-2">
            <SwitchField
              name="overseasNeedsEnglishProof"
              label="An overseas licence not in English needs an IDP or an approved translation"
            />
            <SwitchField name="phoneAtCheckout" label="Guests verify their mobile number at checkout" />
            <SwitchField
              name="identityBeforeFirstBooking"
              label="Guests pass an identity check before their first booking"
              description="A photo of their ID and a selfie, at checkout. A check our team is reviewing can still book: the booking waits as a request until it's decided."
            />
            <SwitchField
              name="identityForHosts"
              label="Hosts pass an identity check before their application is approved"
              description="They start it from Hosting once they've applied. Approving waits until it passes."
            />
            <SwitchField
              name="emailBeforeTripStart"
              label="Guests confirm their email before the trip starts"
              description="Check-in waits until they have."
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}

const reviewsAndTripsSchema = z
  .object({
    windowDays: wholeField(1, 90, ' days'),
    revealTogether: z.boolean(),
    requireApproval: z.boolean(),
    homepageThreshold: wholeField(0, 1000),
    damageReportWindowHours: wholeField(1, 720, ' hours'),
    lateReturnGraceMinutes: wholeField(0, 720, ' minutes'),
    threadReadOnlyDays: wholeField(0, 365, ' days'),
    extraKmReviewAboveKmPerDay: wholeField(1, 10_000, ' km'),
    quietHoursStart: timeField(),
    quietHoursEnd: timeField(),
  })
  // The same start and end would mean no quiet hours at all: texts at any hour of the night.
  .refine((values) => values.quietHoursStart !== values.quietHoursEnd, {
    message: 'Choose an end time different from the start',
    path: ['quietHoursEnd'],
  });

export function ReviewsAndTripsSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="reviewsAndTrips"
      title="Reviews and trips"
      description="When reviews can be left and shown, the windows after a trip, and the quiet hours for text messages. The review window and grace period are also on the public pages."
      settings={settings}
      schema={reviewsAndTripsSchema}
      toValues={({ reviews, trips, sms }) => ({
        windowDays: String(reviews.windowDays),
        revealTogether: reviews.revealTogether,
        requireApproval: reviews.requireApproval,
        homepageThreshold: String(reviews.homepageThreshold),
        damageReportWindowHours: String(trips.damageReportWindowHours),
        lateReturnGraceMinutes: String(trips.lateReturnGraceMinutes),
        threadReadOnlyDays: String(trips.threadReadOnlyDays),
        extraKmReviewAboveKmPerDay: String(trips.extraKmReviewAboveKmPerDay),
        quietHoursStart: sms.quietHoursStart,
        quietHoursEnd: sms.quietHoursEnd,
      })}
      toUpdate={(values, current) => ({
        reviews: {
          windowDays: Number(values.windowDays),
          revealTogether: values.revealTogether,
          requireApproval: values.requireApproval,
          homepageThreshold: Number(values.homepageThreshold),
        },
        trips: {
          ...current.trips,
          damageReportWindowHours: Number(values.damageReportWindowHours),
          lateReturnGraceMinutes: Number(values.lateReturnGraceMinutes),
          threadReadOnlyDays: Number(values.threadReadOnlyDays),
          extraKmReviewAboveKmPerDay: Number(values.extraKmReviewAboveKmPerDay),
        },
        sms: { quietHoursStart: values.quietHoursStart, quietHoursEnd: values.quietHoursEnd },
      })}
    >
      {() => (
        <>
          <NumberField
            name="windowDays"
            label="Time to leave a review"
            unit="days"
            description="From when the trip is completed: at check-out, or when our team completes it."
          />
          <NumberField
            name="homepageThreshold"
            label="Reviews before the homepage shows them"
            description="Published reviews needed for the homepage's reviews section."
          />
          <NumberField
            name="damageReportWindowHours"
            label="Time to report damage"
            unit="hours"
            description="After the car is returned."
          />
          <NumberField
            name="lateReturnGraceMinutes"
            label="Late-return grace period"
            unit="minutes"
            description="Before a return counts as late."
          />
          <NumberField
            name="threadReadOnlyDays"
            label="Messages stay open for"
            unit="days"
            description="After the trip ends or is cancelled, while no case on it is open. Then the conversation can be read but not added to."
          />
          <NumberField
            name="extraKmReviewAboveKmPerDay"
            label="Check extra kilometres above"
            unit="km a day"
            description="Our team checks the odometer readings before charging more than this a day, in case one was typed wrong."
          />
          <div className="sm:col-span-2">
            <SwitchField
              name="revealTogether"
              label="Show both reviews of a trip at the same time"
              description="Once both are in, or when the time to review runs out, so neither side can reply in kind."
            />
          </div>
          <div className="sm:col-span-2">
            <SwitchField
              name="requireApproval"
              label="Approve every review before it’s published"
              description="Reviews stay hidden from the website until our team approves them in Moderation. Off: only reviews with contact details, links or strong language are checked."
            />
          </div>
          <TextInputField
            name="quietHoursStart"
            label="Quiet hours for texts start at"
            description="NZ time, 24-hour, like 21:00. Texts that can wait are sent when quiet hours end."
          />
          <TextInputField
            name="quietHoursEnd"
            label="Quiet hours end at"
            description="Like 07:00. A pick-up reminder within 3 hours of pick-up, and alerts about check-in or a late return, still go at once. A return reminder waits like other texts, and isn’t sent if it would arrive after the return time."
          />
        </>
      )}
    </SettingsForm>
  );
}

/**
 * The check digit is checked only on a changed GST number, as the API does: one saved before the check
 * (a placeholder) doesn't stop staff saving the rest of the card.
 */
const companySchema = (savedGstNumber: string) =>
  z.object({
    legalName: textField('legal name', 120),
    gstNumber: z
      .string()
      .trim()
      .regex(/^(\d{2,3}-\d{3}-\d{3})?$/, 'Use the format 123-456-789, or leave it empty')
      .refine((value) => !value || value === savedGstNumber || isValidGstNumber(value), {
        message: 'That isn’t a valid GST number. Check it on the IRD registration.',
      }),
    supportEmail: z
      .string()
      .trim()
      .pipe(z.email({ error: 'Enter a valid email address' })),
    finalLogoSupplied: z.boolean(),
    trademarkSearchDone: z.boolean(),
    companyNameCheckDone: z.boolean(),
  });

export function CompanySection({ settings }: { settings: PlatformSettings }) {
  const savedGstNumber = settings.business.gstNumber;
  const schema = useMemo(() => companySchema(savedGstNumber), [savedGstNumber]);
  return (
    <SettingsForm
      decision="company"
      title="Company and brand"
      description="Who issues receipts, and the checks on the name and logo. The legal name and GST number appear on receipts now."
      settings={settings}
      schema={schema}
      toValues={({ business, brandChecks }) => ({
        legalName: business.legalName,
        gstNumber: business.gstNumber,
        supportEmail: business.supportEmail,
        ...brandChecks,
      })}
      toUpdate={(values) => ({
        business: {
          legalName: values.legalName,
          gstNumber: values.gstNumber,
          supportEmail: values.supportEmail,
        },
        brandChecks: {
          finalLogoSupplied: values.finalLogoSupplied,
          trademarkSearchDone: values.trademarkSearchDone,
          companyNameCheckDone: values.companyNameCheckDone,
        },
      })}
    >
      {() => (
        <>
          <TextInputField name="legalName" label="Legal name" />
          <TextInputField
            name="gstNumber"
            label="GST number"
            description="Once the client is GST-registered; receipts then become tax invoices."
          />
          <TextInputField
            name="supportEmail"
            label="Support email"
            type="email"
            description={`${RECORDED_ONLY} emails use the reply-to address set on the server.`}
          />
          <div className="grid gap-1 sm:col-span-2">
            <SwitchField
              name="finalLogoSupplied"
              label="The client has supplied the final logo"
              description={`${RECORDED_ONLY} the website shows the Rento Vroom wordmark until the logo is added to the code.`}
            />
            <SwitchField name="trademarkSearchDone" label="The trade mark search (IPONZ) is done" />
            <SwitchField
              name="companyNameCheckDone"
              label="The company name check (Companies Office) is done"
            />
          </div>
        </>
      )}
    </SettingsForm>
  );
}

const bookingRulesSchema = z.object({
  enquiriesBeforeBooking: z.boolean(),
  additionalDrivers: z.boolean(),
  vinOrChassisRequired: z.boolean(),
});

export function BookingRulesSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="bookingRules"
      title="Other booking rules"
      description="Items the specification leaves open."
      settings={settings}
      schema={bookingRulesSchema}
      columns={1}
      toValues={({ bookingRules, vehicles }) => ({
        ...bookingRules,
        vinOrChassisRequired: vehicles.vinOrChassisRequired,
      })}
      toUpdate={(values, current) => ({
        bookingRules: {
          enquiriesBeforeBooking: values.enquiriesBeforeBooking,
          additionalDrivers: values.additionalDrivers,
        },
        vehicles: { ...current.vehicles, vinOrChassisRequired: values.vinOrChassisRequired },
      })}
    >
      {() => (
        <>
          <div className="grid gap-1">
            <SwitchField
              name="vinOrChassisRequired"
              label="Every listing needs a VIN or chassis number"
              description="Checked before a listing can be sent for review."
            />
            <SwitchField
              name="enquiriesBeforeBooking"
              label="Guests can message a Host before booking"
              description={`${RECORDED_ONLY} messaging opens with a booking or request. Messages before booking are built if the client chooses them.`}
            />
            <SwitchField
              name="additionalDrivers"
              label="Bookings can have additional drivers"
              description={`${RECORDED_ONLY} a booking has one driver.`}
            />
          </div>
          <p className="text-sm text-muted">
            <span className="font-medium text-ink">Trip changes:</span> the support team makes them on
            request. Changing dates or cars from the website needs a code change.
          </p>
        </>
      )}
    </SettingsForm>
  );
}

const servicesSchema = z.object({ nzLicenceCheck: z.boolean(), plateLookup: z.boolean() });

export function VerificationServicesSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="verificationServices"
      title="NZ licence check and plate lookup"
      description={`Optional paid services. ${RECORDED_ONLY} no provider is connected, so the support team checks licences and listing documents by hand.`}
      settings={settings}
      schema={servicesSchema}
      columns={1}
      toValues={({ verificationServices }) => verificationServices}
      toUpdate={(values) => ({ verificationServices: values })}
    >
      {() => (
        <div className="grid gap-1">
          <SwitchField name="nzLicenceCheck" label="Use an NZ driver licence check service" />
          <SwitchField name="plateLookup" label="Use a number plate lookup service" />
        </div>
      )}
    </SettingsForm>
  );
}
