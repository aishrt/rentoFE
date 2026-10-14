import type { AddressWithPoint, AdminVehicle, CalendarBlock, HostApplication } from '@/api/types';
import { addDays, addMonths, parseDateValue, toDateInputValue } from '@/lib/dates';
import { NZ_TIME_ZONE } from '@/lib/format';

/*
 * Formatters for the staff approval queues. Here rather than in lib/format.ts, which the homepage loads:
 * only the staff portal needs them. Dates are New Zealand's, whatever the device's time zone.
 */

const dateWithYear = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: NZ_TIME_ZONE,
});

/**
 * "Wed, 30 Sept 2026": an instant's day in NZ, such as when someone joined or applied. Written out like the
 * portal's other dates (the audit log has "Wed, 30 Sept 2026, 9:30 am"), and with the year, as staff records
 * go back years.
 */
export const formatDateNz = (iso: string) => dateWithYear.format(new Date(iso));

// A day with no time of day is the same day everywhere, so it's formatted in UTC, where it starts.
const calendarDay = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "12 Oct 2027" for the API's "2027-10-12" dates, such as a WOF expiry or a date of birth. */
export function formatDayValue(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDay.format(new Date(`${value}T00:00:00Z`)) : value;
}

// en-CA writes dates as "2026-09-30", the format of <input type="date"> and the API.
const isoDay = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: NZ_TIME_ZONE,
});

/** Today in New Zealand as "2026-09-30". */
export const todayNz = (now = new Date()) => isoDay.format(now);

/** Moves a "2026-09-30" value by whole days. */
export function addDaysToValue(value: string, days: number): string {
  const date = parseDateValue(value);
  return date ? toDateInputValue(addDays(date, days)) : value;
}

/** Moves a "2026-09-30" value by whole months, keeping the day where it can. */
export function addMonthsToValue(value: string, months: number): string {
  const date = parseDateValue(value);
  return date ? toDateInputValue(addMonths(date, months)) : value;
}

const relative = new Intl.RelativeTimeFormat('en-NZ', { numeric: 'auto' });
const DAY_MS = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "5 days ago": how long something has waited, by NZ calendar days. */
export function waitingFor(iso: string, now = new Date()): string {
  const days = Math.round((Date.parse(todayNz(now)) - Date.parse(isoDay.format(new Date(iso)))) / DAY_MS);
  return relative.format(-Math.max(0, days), 'day');
}

const dayFormat = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: NZ_TIME_ZONE,
});
const dayTimeFormat = new Intl.DateTimeFormat('en-NZ', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: NZ_TIME_ZONE,
});
const clock = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: NZ_TIME_ZONE,
});

const isNzMidnight = (date: Date) => clock.format(date) === '00:00';

/**
 * When a calendar block runs, in NZ time: "Mon, 12 Oct" for one whole day, "Mon, 12 Oct – Wed, 14 Oct"
 * for whole days (the API's end is exclusive, so the last day shown is the day before), or with times.
 */
export function formatBlockRange(block: Pick<CalendarBlock, 'start' | 'end'>): string {
  const start = new Date(block.start);
  const end = new Date(block.end);
  if (isNzMidnight(start) && isNzMidnight(end)) {
    const lastDay = new Date(end.getTime() - 1);
    const first = dayFormat.format(start);
    const last = dayFormat.format(lastDay);
    return first === last ? `${first}, all day` : `${first} – ${last}`;
  }
  return `${dayTimeFormat.format(start)} – ${dayTimeFormat.format(end)}`;
}

const moneyFormat = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "$89", or "$0.35" when there are cents: fees and per-kilometre prices need them. */
export const formatNzd = (cents: number) => moneyFormat.format(cents / 100);

/** "Unit 2, 14 Queen Street, Grey Lynn, Auckland 1010": a full NZ address on one line. */
export function formatAddress(address: AddressWithPoint): string {
  const street = [address.streetNumber, address.street].filter(Boolean).join(' ');
  return [
    address.unit && `Unit ${address.unit}`,
    street,
    address.suburb,
    `${address.city} ${address.postcode}`,
    address.region !== address.city && address.region,
  ]
    .filter(Boolean)
    .join(', ');
}

export const applicantName = (application: Pick<HostApplication, 'firstName' | 'lastName'>) =>
  `${application.firstName} ${application.lastName}`;

/** Where a Host's application is listed: the Host applications tab for its status. */
export function hostApplicationsLink(status: AdminVehicle['host']['status']): string {
  return status === 'APPROVED' || status === 'REJECTED'
    ? `/admin/host-applications?status=${status.toLowerCase()}`
    : '/admin/host-applications';
}
