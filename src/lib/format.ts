const NZ_LOCALE = 'en-NZ';
export const NZ_TIME_ZONE = 'Pacific/Auckland';

const numberFormat = new Intl.NumberFormat(NZ_LOCALE);
const nzdFormat = new Intl.NumberFormat(NZ_LOCALE, {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

export const formatNumber = (value: number) => numberFormat.format(value);

/** Whole dollars from cents, e.g. 8900 → "$89" (plan §12.7). */
export const formatNzdFromCents = (cents: number) => nzdFormat.format(Math.round(cents / 100));

const longDateFormat = new Intl.DateTimeFormat(NZ_LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: NZ_TIME_ZONE,
});

const shortDateTimeFormat = new Intl.DateTimeFormat(NZ_LOCALE, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat(NZ_LOCALE, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: NZ_TIME_ZONE,
});

/** "Friday, 25 September" in NZ time. */
export const formatLongDateNz = (date: Date) => longDateFormat.format(date);

/** "Fri, 12 Oct, 10:00 am" for a local date-time value. */
export const formatShortDateTime = (date: Date) => shortDateTimeFormat.format(date);

/** "11:42 am" in NZ time. */
export const formatTimeNz = (date: Date) => timeFormat.format(date);

/** The current hour (0–23) in New Zealand, whatever the device's time zone. */
export function nzHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: NZ_TIME_ZONE }).format(date),
  );
}
