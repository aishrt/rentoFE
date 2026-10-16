import { useFormContext, type FieldValues } from 'react-hook-form';
import { z } from 'zod';
import type { PlatformSettings } from '@/api/types';
import { Checkbox } from '@/components/ui/checkbox';
import { MAX_BOOKED_DAYS, MIN_BOOKED_DAYS } from '@/features/content/policies';
import { MAX_PHOTO_EDGE } from '@/features/host/photo-checks';
import { BODY_TYPE_LABELS, DOCUMENT_LABELS, PHOTO_ANGLES, PHOTO_LABELS } from '../listings/listing-labels';
import { fromCents, moneyField, percentField, toCents, wholeField } from './field-rules';
import { NumberField } from './fields';
import { SettingsForm } from './settings-form';

/*
 * What a listing needs and the limits on search (plan §16, items 13 and 17), and the Become a Host
 * estimator's assumptions (item 18).
 */

type Vehicles = PlatformSettings['vehicles'];
type RequiredDocument = Vehicles['requiredDocuments'][number];
type PhotoAngle = Vehicles['requiredPhotoAngles'][number];
type BodyType = keyof typeof BODY_TYPE_LABELS;

/**
 * The documents it makes sense to ask of every car. The owner's consent is asked only when the Host isn't the
 * owner.
 */
const DOCUMENTS: readonly RequiredDocument[] = ['REGO', 'WOF', 'INSURANCE'];
/** The spec's angles (spec §6); existing damage is photographed when there is some. */
const ANGLES = PHOTO_ANGLES.filter((angle) => angle !== 'DAMAGE') as PhotoAngle[];
const BODY_TYPES = Object.keys(BODY_TYPE_LABELS) as BodyType[];

const listingsSchema = z
  .object({
    requiredDocuments: z.array(z.string()),
    requiredPhotoAngles: z.array(z.string()),
    minPhotoWidthPx: wholeField(0, MAX_PHOTO_EDGE, ' px'),
    minPhotoHeightPx: wholeField(0, MAX_PHOTO_EDGE, ' px'),
    seatsMin: wholeField(1, 50),
    seatsMax: wholeField(1, 50),
    doorsMin: wholeField(1, 10),
    doorsMax: wholeField(1, 10),
    dailyPriceMin: moneyField(),
    dailyPriceMax: moneyField(),
    maxDiscountPct: percentField(),
    maxTripDays: wholeField(1, 365, ' days'),
    radiusMin: wholeField(1, 1000, ' km'),
    radiusDefault: wholeField(1, 1000, ' km'),
    radiusMax: wholeField(1, 1000, ' km'),
  })
  // The API's rules: each range's lowest is no more than its highest, and the default radius is between them.
  .refine((values) => Number(values.seatsMin) <= Number(values.seatsMax), {
    message: 'Make it at least the fewest seats',
    path: ['seatsMax'],
  })
  .refine((values) => Number(values.doorsMin) <= Number(values.doorsMax), {
    message: 'Make it at least the fewest doors',
    path: ['doorsMax'],
  })
  .refine((values) => toCents(values.dailyPriceMin) <= toCents(values.dailyPriceMax), {
    message: 'Make it at least the lowest price',
    path: ['dailyPriceMax'],
  })
  .refine(
    (values) =>
      Number(values.radiusMin) <= Number(values.radiusDefault) &&
      Number(values.radiusDefault) <= Number(values.radiusMax),
    { message: 'Choose a default between the smallest and largest', path: ['radiusDefault'] },
  );

/** One box for each choice in a list, saved as the list of those ticked. */
function ChoiceList({
  legend,
  name,
  choices,
}: {
  legend: string;
  name: string;
  choices: readonly { value: string; label: string }[];
}) {
  const { register } = useFormContext<FieldValues>();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      {choices.map((choice) => (
        <Checkbox key={choice.value} label={choice.label} value={choice.value} {...register(name)} />
      ))}
    </fieldset>
  );
}

export function ListingsAndSearchSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="listingsAndSearch"
      title="Listings and search"
      description="What a Host’s listing needs before it goes to our team for review, the limits on its details, and the limits on search. Placeholders: registration, WOF and insurance, and a photo of each of the eight angles."
      settings={settings}
      schema={listingsSchema}
      toValues={({ vehicles, search }) => ({
        requiredDocuments: vehicles.requiredDocuments,
        requiredPhotoAngles: vehicles.requiredPhotoAngles,
        minPhotoWidthPx: String(vehicles.minPhotoWidthPx),
        minPhotoHeightPx: String(vehicles.minPhotoHeightPx),
        seatsMin: String(vehicles.seats.min),
        seatsMax: String(vehicles.seats.max),
        doorsMin: String(vehicles.doors.min),
        doorsMax: String(vehicles.doors.max),
        dailyPriceMin: fromCents(vehicles.dailyPriceCents.min),
        dailyPriceMax: fromCents(vehicles.dailyPriceCents.max),
        maxDiscountPct: String(vehicles.maxDiscountPct),
        maxTripDays: String(search.maxTripDays),
        radiusMin: String(search.radiusKm.min),
        radiusDefault: String(search.radiusKm.default),
        radiusMax: String(search.radiusKm.max),
      })}
      toUpdate={(values, current) => ({
        vehicles: {
          ...current.vehicles,
          // Anything required that isn't offered here stays as it is.
          requiredDocuments: [
            ...current.vehicles.requiredDocuments.filter((type) => !DOCUMENTS.includes(type)),
            ...DOCUMENTS.filter((type) => values.requiredDocuments.includes(type)),
          ],
          requiredPhotoAngles: ANGLES.filter((angle) => values.requiredPhotoAngles.includes(angle)),
          minPhotoWidthPx: Number(values.minPhotoWidthPx),
          minPhotoHeightPx: Number(values.minPhotoHeightPx),
          seats: { min: Number(values.seatsMin), max: Number(values.seatsMax) },
          doors: { min: Number(values.doorsMin), max: Number(values.doorsMax) },
          dailyPriceCents: { min: toCents(values.dailyPriceMin), max: toCents(values.dailyPriceMax) },
          maxDiscountPct: Number(values.maxDiscountPct),
        },
        search: {
          maxTripDays: Number(values.maxTripDays),
          radiusKm: {
            min: Number(values.radiusMin),
            default: Number(values.radiusDefault),
            max: Number(values.radiusMax),
          },
        },
      })}
    >
      {() => (
        <>
          <h3 className="text-sm font-semibold text-ink sm:col-span-2">What every listing needs</h3>
          <div className="grid gap-2">
            <ChoiceList
              legend="Documents"
              name="requiredDocuments"
              choices={DOCUMENTS.map((type) => ({ value: type, label: DOCUMENT_LABELS[type] }))}
            />
            <p className="text-sm text-muted">
              A CoF counts as the WOF. The registered owner’s consent is always needed when the Host isn’t the
              owner.
            </p>
          </div>
          <ChoiceList
            legend="Photos"
            name="requiredPhotoAngles"
            choices={ANGLES.map((angle) => ({ value: angle, label: PHOTO_LABELS[angle] }))}
          />
          <NumberField
            name="minPhotoWidthPx"
            label="Photos at least this wide"
            unit="px"
            description="Whichever way round they’re taken. Smaller photos are flagged to the Host and our team, not refused."
          />
          <NumberField
            name="minPhotoHeightPx"
            label="And at least this tall"
            unit="px"
            description={`Photos are uploaded at up to ${MAX_PHOTO_EDGE.toLocaleString('en-NZ')} pixels on the long side.`}
          />

          <h3 className="mt-2 text-sm font-semibold text-ink sm:col-span-2">Limits on a listing’s details</h3>
          <NumberField name="seatsMin" label="Fewest seats" />
          <NumberField name="seatsMax" label="Most seats" />
          <NumberField name="doorsMin" label="Fewest doors" />
          <NumberField name="doorsMax" label="Most doors" />
          <NumberField name="dailyPriceMin" label="Lowest daily price" money />
          <NumberField name="dailyPriceMax" label="Highest daily price" money />
          <NumberField
            name="maxDiscountPct"
            label="Weekly and monthly discounts up to"
            unit="%"
            description="Hosts choose their own, up to this."
          />

          <h3 className="mt-2 text-sm font-semibold text-ink sm:col-span-2">Search</h3>
          <NumberField
            name="maxTripDays"
            label="Longest trip"
            unit="days"
            description="A Host can set a shorter longest trip for their car."
          />
          <NumberField
            name="radiusDefault"
            label="Search radius to start with"
            unit="km"
            description="Around the place searched, until the Guest changes it."
          />
          <NumberField name="radiusMin" label="Smallest search radius" unit="km" />
          <NumberField name="radiusMax" label="Largest search radius" unit="km" />
        </>
      )}
    </SettingsForm>
  );
}

const estimatorSchema = z.object({
  bookedDaysPerMonth: wholeField(MIN_BOOKED_DAYS, MAX_BOOKED_DAYS, ' days'),
  daily: z.object(
    Object.fromEntries(BODY_TYPES.map((type) => [type, moneyField()])) as Record<
      BodyType,
      ReturnType<typeof moneyField>
    >,
  ),
});

export function HostEstimatorSection({ settings }: { settings: PlatformSettings }) {
  return (
    <SettingsForm
      decision="hostEstimator"
      title="Become a Host estimator"
      description="The typical daily prices and booked days behind the earnings estimate on the Become a Host page, which always says it’s an estimate. The estimate takes off the Host commission in Fees. Placeholders until the client supplies the figures."
      settings={settings}
      schema={estimatorSchema}
      toValues={({ hostEstimator }) => ({
        bookedDaysPerMonth: String(hostEstimator.bookedDaysPerMonth),
        daily: Object.fromEntries(
          BODY_TYPES.map((type) => [type, fromCents(hostEstimator.dailyCentsByBodyType[type] ?? 0)]),
        ) as Record<BodyType, string>,
      })}
      toUpdate={(values) => ({
        hostEstimator: {
          bookedDaysPerMonth: Number(values.bookedDaysPerMonth),
          dailyCentsByBodyType: Object.fromEntries(
            BODY_TYPES.map((type) => [type, toCents(values.daily[type])]),
          ) as Record<BodyType, number>,
        },
      })}
    >
      {() => (
        <>
          <NumberField
            name="bookedDaysPerMonth"
            label="Days booked each month"
            unit="days"
            description="Where the estimate starts. Visitors can change it."
          />
          <h3 className="mt-2 text-sm font-semibold text-ink sm:col-span-2">Typical daily price</h3>
          {BODY_TYPES.map((type) => (
            <NumberField key={type} name={`daily.${type}`} label={BODY_TYPE_LABELS[type]} money />
          ))}
        </>
      )}
    </SettingsForm>
  );
}
