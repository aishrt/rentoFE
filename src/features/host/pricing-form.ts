import { z } from 'zod';
import type { HostVehicle, PublicPolicies, VehiclePatch } from '@/api/types';
import { fieldMap } from './use-step-save';
import type { FuelPolicy } from './vehicle-labels';

/*
 * Step 4, pricing (plan §9, Days 8–11; §5). The Host sets their daily price and terms; the backend's
 * pricing engine works out what guests pay, so nothing here adds up a total (plan §2.3).
 */

const dollars = (value: string) => Number(value.replace(/[$,\s]/g, ''));
const isMoney = (value: string) => /^\$?\s*\d{1,3}(,?\d{3})*(\.\d{1,2})?$/.test(value.trim());
const isWhole = (value: string) => /^\d+$/.test(value.trim());

/** The checks the API makes, with the limits in settings (plan §3, Validation rules). */
export function pricingSchema(policies: PublicPolicies) {
  const { min, max } = policies.vehicles.dailyPriceCents;
  const maxDiscount = policies.vehicles.maxDiscountPct;
  const percent = z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+(\.\d)?$/.test(value) && Number(value) <= maxDiscount),
      `Discounts can be up to ${maxDiscount}%`,
    );
  return z
    .object({
      daily: z
        .string()
        .trim()
        .refine((value) => value === '' || isMoney(value), 'Enter an amount in dollars, like 89')
        .refine(
          (value) =>
            value === '' || !isMoney(value) || (dollars(value) * 100 >= min && dollars(value) * 100 <= max),
          `The daily price must be $${min / 100}–$${(max / 100).toLocaleString('en-NZ')}`,
        ),
      weeklyDiscount: percent,
      monthlyDiscount: percent,
      minDays: z
        .string()
        .trim()
        .refine((value) => isWhole(value) && Number(value) >= 1 && Number(value) <= 90, 'Enter 1–90 days'),
      maxDays: z
        .string()
        .trim()
        .refine((value) => isWhole(value) && Number(value) >= 1 && Number(value) <= 365, 'Enter 1–365 days'),
      unlimitedKm: z.boolean(),
      kmPerDay: z
        .string()
        .trim()
        .refine(
          (value) => value === '' || (isWhole(value) && Number(value) >= 50 && Number(value) <= 2000),
          'Enter 50–2,000 km a day',
        ),
      extraKm: z
        .string()
        .trim()
        .refine(
          (value) => value === '' || (isMoney(value) && dollars(value) <= 10),
          'Enter up to $10 a kilometre, like 0.35',
        ),
      fuelPolicy: z.enum(['SAME_LEVEL', 'FULL']),
      cancellationTier: z.string(),
    })
    .superRefine((values, context) => {
      if (
        isWhole(values.minDays) &&
        isWhole(values.maxDays) &&
        Number(values.minDays) > Number(values.maxDays)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['minDays'],
          message: "The minimum trip can't be longer than the maximum",
        });
      }
      if ((values.weeklyDiscount || values.monthlyDiscount || values.extraKm) && !values.daily) {
        context.addIssue({ code: 'custom', path: ['daily'], message: 'Set a daily price first' });
      }
    });
}

export type PricingValues = z.infer<ReturnType<typeof pricingSchema>>;

const money = (cents?: number) => (cents === undefined ? '' : String(Number((cents / 100).toFixed(2))));

export function pricingDefaults(vehicle: HostVehicle, policies: PublicPolicies): PricingValues {
  return {
    daily: vehicle.pricing ? money(vehicle.pricing.dailyCents) : '',
    weeklyDiscount: vehicle.pricing ? String(vehicle.pricing.weeklyDiscountPct) : '',
    monthlyDiscount: vehicle.pricing ? String(vehicle.pricing.monthlyDiscountPct) : '',
    minDays: String(vehicle.rules.minDays),
    maxDays: String(vehicle.rules.maxDays),
    unlimitedKm: vehicle.unlimitedKm,
    kmPerDay: vehicle.kmAllowancePerDay === undefined ? '' : String(vehicle.kmAllowancePerDay),
    extraKm: vehicle.pricing?.extraKmCents ? money(vehicle.pricing.extraKmCents) : '',
    fuelPolicy: vehicle.fuelPolicy,
    cancellationTier: vehicle.rules.cancellationTier ?? policies.cancellation.defaultTier,
  };
}

export function pricingPatch(values: PricingValues, policies: PublicPolicies): VehiclePatch {
  const tierChoosable = policies.cancellation.hostSelectableTiers.length > 1;
  return {
    ...(values.daily && {
      pricing: {
        dailyCents: Math.round(dollars(values.daily) * 100),
        weeklyDiscountPct: Number(values.weeklyDiscount || 0),
        monthlyDiscountPct: Number(values.monthlyDiscount || 0),
        extraKmCents: values.extraKm ? Math.round(dollars(values.extraKm) * 100) : 0,
      },
    }),
    unlimitedKm: values.unlimitedKm,
    ...(!values.unlimitedKm && { kmAllowancePerDay: values.kmPerDay ? Number(values.kmPerDay) : null }),
    fuelPolicy: values.fuelPolicy as FuelPolicy,
    rules: {
      minDays: Number(values.minDays),
      maxDays: Number(values.maxDays),
      ...(tierChoosable && values.cancellationTier && { cancellationTier: values.cancellationTier }),
    },
  };
}

export const pricingFieldFor = fieldMap<keyof PricingValues>({
  pricing: 'daily',
  'pricing.dailyCents': 'daily',
  'pricing.weeklyDiscountPct': 'weeklyDiscount',
  'pricing.monthlyDiscountPct': 'monthlyDiscount',
  'pricing.extraKmCents': 'extraKm',
  kmAllowancePerDay: 'kmPerDay',
  unlimitedKm: 'unlimitedKm',
  fuelPolicy: 'fuelPolicy',
  'rules.minDays': 'minDays',
  'rules.maxDays': 'maxDays',
  'rules.cancellationTier': 'cancellationTier',
});
