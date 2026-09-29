import type { ExchangeRates } from '@/api/types';
import { formatNzdFromCents } from '@/lib/format';

/**
 * The currencies visitors can see prices in (plan §12.7). Everyone is charged in NZD; the others are
 * estimates at the day's European Central Bank rate, and the visitor's card issuer does the real
 * conversion.
 */
export const DISPLAY_CURRENCIES = ['NZD', 'AUD', 'USD', 'EUR', 'CAD'] as const;
export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];

export const CURRENCY_NAMES: Record<DisplayCurrency, string> = {
  NZD: 'New Zealand dollar',
  AUD: 'Australian dollar',
  USD: 'US dollar',
  EUR: 'Euro',
  CAD: 'Canadian dollar',
};

export const isDisplayCurrency = (value: unknown): value is DisplayCurrency =>
  DISPLAY_CURRENCIES.includes(value as DisplayCurrency);

/** "NZ$180": the NZD price with its country, for when an estimate in another currency sits beside it. */
export const formatNzdLabelled = (cents: number) => `NZ${formatNzdFromCents(cents)}`;

/**
 * "≈ A$162" for an NZD price, or null for NZD or while the rates load. Whole units, except under 10
 * where cents matter.
 */
export function formatEstimate(
  nzdCents: number,
  currency: DisplayCurrency,
  rates: ExchangeRates['rates'] | undefined,
): string | null {
  if (currency === 'NZD' || !rates) return null;
  const amount = (nzdCents / 100) * rates[currency];
  const digits = amount < 10 ? 2 : 0;
  const format = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `≈ ${format.format(amount)}`;
}
