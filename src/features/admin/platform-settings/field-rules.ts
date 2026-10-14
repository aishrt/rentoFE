import { z } from 'zod';

/*
 * Rules and conversions for the Platform settings tab's fields. Numbers are typed as text, as in the
 * listing editor, and checked with the same limits as the API before they're sent (plan §2.3: the API
 * stays the real check).
 */

const isWhole = (value: string) => /^\d+$/.test(value.trim());
const isDecimal = (value: string) => /^\d+(\.\d{1,2})?$/.test(value.trim());
const isMoney = (value: string) => /^\$?\s*\d{1,3}(,?\d{3})*(\.\d{1,2})?$/.test(value.trim());

/** "1,500" or "$15.50" → 1550 cents. */
export const toCents = (value: string) => Math.round(Number(value.replace(/[$,\s]/g, '')) * 100);
/** 1550 → "15.50", 300000 → "3000". */
export const fromCents = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);

export const percentField = (max = 100) =>
  z
    .string()
    .trim()
    .refine((value) => isDecimal(value) && Number(value) <= max, `Enter 0–${max}`);

export const wholeField = (min: number, max: number, unit = '') =>
  z
    .string()
    .trim()
    .refine(
      (value) => isWhole(value) && Number(value) >= min && Number(value) <= max,
      `Enter ${min}–${max.toLocaleString('en-NZ')}${unit}`,
    );

export const decimalField = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => isDecimal(value) && Number(value) >= min && Number(value) <= max,
      `Enter ${min}–${max}`,
    );

export const moneyField = () =>
  z
    .string()
    .trim()
    .refine((value) => isMoney(value), 'Enter an amount in dollars, like 15 or 1,500');

/** A 24-hour time, "21:00" or "7:00", as the API's HH:MM. */
export const timeField = () =>
  z
    .string()
    .trim()
    .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Enter a 24-hour time, like 21:00')
    .transform((value) => value.padStart(5, '0'));

export const textField = (label: string, max = 200) =>
  z.string().trim().min(1, `Enter the ${label}`).max(max, `Use ${max} characters or fewer`);

/** A note under a setting that nothing uses yet, so it isn't mistaken for one that changes the site. */
export const RECORDED_ONLY = 'Recorded only for now:';
