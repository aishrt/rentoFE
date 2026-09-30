import { z } from 'zod';
import type { HostVehicle, PublicPolicies, VehiclePatch } from '@/api/types';
import { fieldMap } from './use-step-save';
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  hasBattery,
  type BodyType,
  type FuelType,
  type Transmission,
} from './vehicle-labels';

/*
 * Step 1, vehicle details (plan §9, Days 8–11). Drafts save whatever is filled in, so nothing here is
 * required: the listing checklist says what's missing before submitting. These are the format checks the
 * API also makes, for instant feedback (plan §3, Validation rules).
 */

/** 17 letters and numbers, without I, O or Q. */
export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const NEXT_YEAR = new Date().getFullYear() + 1;

const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      message,
    );

export const detailsSchema = z
  .object({
    regoPlate: z
      .string()
      .trim()
      .refine((value) => value === '' || /^[A-Za-z0-9]{1,6}$/.test(value.replace(/\s+/g, '')), {
        error: 'Number plates have 1–6 letters and numbers',
      }),
    noVin: z.boolean(),
    vin: z.string().trim(),
    chassisNo: z.string().trim(),
    make: z.string().trim().max(40, 'Keep the make under 40 characters'),
    model: z.string().trim().max(40, 'Keep the model under 40 characters'),
    year: wholeNumber(1950, NEXT_YEAR, `Enter a year from 1950 to ${NEXT_YEAR}`),
    variant: z.string().trim().max(60, 'Keep the variant under 60 characters'),
    bodyType: z.string(),
    fuelType: z.string(),
    transmission: z.string(),
    seats: z.string(),
    doors: z.string(),
    engineCc: wholeNumber(0, 10_000, 'Enter the engine size in cc, like 1800'),
    cylinders: wholeNumber(0, 16, 'Enter 0–16 cylinders'),
    evRangeKm: wholeNumber(0, 1_500, 'Enter the range in kilometres, up to 1,500'),
    batteryKwh: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || (/^\d+(\.\d)?$/.test(value) && Number(value) <= 250),
        'Enter the battery size in kWh, like 64 or 77.4',
      ),
    features: z.array(z.string()).max(20, 'List up to 20 features'),
    petFriendly: z.boolean(),
    childSeat: z.boolean(),
    damageNotes: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
  })
  .superRefine((values, context) => {
    if (!values.noVin && values.vin && !VIN_PATTERN.test(values.vin.toUpperCase())) {
      context.addIssue({
        code: 'custom',
        path: ['vin'],
        message: 'VINs have 17 letters and numbers, without I, O or Q',
      });
    }
    if (values.noVin && values.chassisNo && (values.chassisNo.length < 5 || values.chassisNo.length > 30)) {
      context.addIssue({
        code: 'custom',
        path: ['chassisNo'],
        message: 'Chassis numbers have 5–30 characters',
      });
    }
  });

export type DetailsValues = z.infer<typeof detailsSchema>;

const text = (value?: string | number) => (value === undefined ? '' : String(value));

export function detailsDefaults(vehicle: HostVehicle): DetailsValues {
  return {
    regoPlate: text(vehicle.regoPlate),
    noVin: Boolean(vehicle.chassisNo && !vehicle.vin),
    vin: text(vehicle.vin),
    chassisNo: text(vehicle.chassisNo),
    make: text(vehicle.make),
    model: text(vehicle.model),
    year: text(vehicle.year),
    variant: text(vehicle.variant),
    bodyType: text(vehicle.bodyType),
    fuelType: text(vehicle.fuelType),
    transmission: text(vehicle.transmission),
    seats: text(vehicle.seats),
    doors: text(vehicle.doors),
    engineCc: text(vehicle.powertrain?.engineCc),
    cylinders: text(vehicle.powertrain?.cylinders),
    evRangeKm: text(vehicle.powertrain?.evRangeKm),
    batteryKwh: text(vehicle.powertrain?.batteryKwh),
    features: vehicle.features,
    petFriendly: vehicle.petFriendly,
    childSeat: vehicle.childSeat,
    damageNotes: text(vehicle.damageNotes),
  };
}

const number = (value: string) => (value === '' ? undefined : Number(value));

/** The engine for fuel cars, the battery for EVs, and both for plug-in hybrids. */
function powertrainOf(values: DetailsValues): VehiclePatch['powertrain'] {
  const engine = values.fuelType !== 'EV';
  const battery = hasBattery(values.fuelType);
  const powertrain = {
    ...(engine && number(values.engineCc) !== undefined && { engineCc: number(values.engineCc) }),
    ...(engine && number(values.cylinders) !== undefined && { cylinders: number(values.cylinders) }),
    ...(battery && number(values.evRangeKm) !== undefined && { evRangeKm: number(values.evRangeKm) }),
    ...(battery && number(values.batteryKwh) !== undefined && { batteryKwh: number(values.batteryKwh) }),
  };
  return Object.keys(powertrain).length > 0 ? powertrain : null;
}

/**
 * What to PATCH. Make, model and year can't be cleared once saved (the API keeps them), so empty ones are
 * left out; optional details are cleared with null.
 */
export function detailsPatch(values: DetailsValues): VehiclePatch {
  const plate = values.regoPlate.replace(/\s+/g, '').toUpperCase();
  return {
    ...(plate && { regoPlate: plate }),
    vin: values.noVin ? null : values.vin.toUpperCase() || null,
    chassisNo: values.noVin ? values.chassisNo.toUpperCase() || null : null,
    ...(values.make && { make: values.make }),
    ...(values.model && { model: values.model }),
    ...(values.year && { year: Number(values.year) }),
    variant: values.variant || null,
    ...(values.bodyType && { bodyType: values.bodyType as BodyType }),
    ...(values.fuelType && { fuelType: values.fuelType as FuelType }),
    ...(values.transmission && { transmission: values.transmission as Transmission }),
    ...(values.seats && { seats: Number(values.seats) }),
    ...(values.doors && { doors: Number(values.doors) }),
    powertrain: powertrainOf(values),
    features: values.features,
    petFriendly: values.petFriendly,
    childSeat: values.childSeat,
    damageNotes: values.damageNotes || null,
  };
}

/** The details that send a live listing back for review when they change (plan §3, "Changes to live listings"). */
export function changedKeyDetails(vehicle: HostVehicle, patch: VehiclePatch): string[] {
  const changes: [string, unknown, unknown][] = [
    ['number plate', patch.regoPlate, vehicle.regoPlate],
    ['VIN', patch.vin ?? undefined, vehicle.vin],
    ['chassis number', patch.chassisNo ?? undefined, vehicle.chassisNo],
    ['make', patch.make, vehicle.make],
    ['model', patch.model, vehicle.model],
    ['year', patch.year, vehicle.year],
  ];
  return changes
    .filter(
      ([, next, current]) =>
        (next === undefined ? '' : String(next)) !== (current === undefined ? '' : String(current)),
    )
    .filter(([name, next]) => next !== undefined || name === 'VIN' || name === 'chassis number')
    .map(([name]) => name);
}

export const detailsFieldFor = fieldMap<keyof DetailsValues>({
  regoPlate: 'regoPlate',
  vin: 'vin',
  chassisNo: 'chassisNo',
  make: 'make',
  model: 'model',
  year: 'year',
  variant: 'variant',
  bodyType: 'bodyType',
  fuelType: 'fuelType',
  transmission: 'transmission',
  seats: 'seats',
  doors: 'doors',
  'powertrain.engineCc': 'engineCc',
  'powertrain.cylinders': 'cylinders',
  'powertrain.evRangeKm': 'evRangeKm',
  'powertrain.batteryKwh': 'batteryKwh',
  features: 'features',
  damageNotes: 'damageNotes',
});

export const bodyTypeOptions = Object.entries(BODY_TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const fuelTypeOptions = Object.entries(FUEL_LABELS).map(([value, label]) => ({ value, label }));
export const transmissionChoices = (Object.keys(TRANSMISSION_LABELS) as Transmission[]).map((value) => ({
  value,
  label: TRANSMISSION_LABELS[value],
}));

/** Seat and door counts within the limits in settings. */
export function countOptions(limits: PublicPolicies['vehicles']['seats']) {
  return Array.from({ length: limits.max - limits.min + 1 }, (_, index) => {
    const value = String(limits.min + index);
    return { value, label: value };
  });
}

/** Common makes in New Zealand, suggested as you type. Any make can be entered. */
export const POPULAR_MAKES = [
  'Toyota',
  'Mazda',
  'Nissan',
  'Honda',
  'Suzuki',
  'Mitsubishi',
  'Subaru',
  'Hyundai',
  'Kia',
  'Ford',
  'Holden',
  'Volkswagen',
  'Tesla',
  'BYD',
  'MG',
  'Skoda',
  'Audi',
  'BMW',
  'Mercedes-Benz',
  'Lexus',
  'Volvo',
  'Peugeot',
  'Polestar',
  'Jeep',
  'Land Rover',
  'Isuzu',
];
