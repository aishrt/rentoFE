const pad = (value: number) => String(value).padStart(2, '0');

/** "2026-10-12" in the device's local time, the format of <input type="date">. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Combines <input type="date"> and <input type="time"> values into a local Date, or null if either is invalid. */
export function combineDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const result = new Date(`${date}T${time}`);
  return Number.isNaN(result.getTime()) ? null : result;
}

/** Parses a "2026-10-12" value as a local date, or null if it isn't a real day. */
export function parseDateValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
  const date = new Date(year, month, day);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}

/** Moves by whole months, keeping the day where it can: 31 January plus a month is the end of February. */
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

/** Keeps a "2026-10-12" value within optional bounds in the same format, which sort as text. */
export function clampDateValue(value: string, min?: string, max?: string): string {
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

/** Monday first, as calendars are laid out in New Zealand. */
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** 0 for Monday through 6 for Sunday. */
export const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

/** "September 2026". */
export const formatMonthYear = (date: Date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;

/** "Sunday, 27 September 2026" for a "2026-09-27" value, as screen readers announce a calendar day. */
export function formatFullDate(value: string): string {
  const date = parseDateValue(value);
  if (!date) return value;
  return `${WEEKDAYS[weekdayIndex(date)]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "Sun, 27 Sep" for a "2026-09-27" value, with the year added when it isn't this year. */
export function formatDateValue(value: string, now = new Date()): string {
  const date = parseDateValue(value);
  if (!date) return value;
  const label = `${WEEKDAYS[weekdayIndex(date)]?.slice(0, 3)}, ${date.getDate()} ${MONTHS[date.getMonth()]?.slice(0, 3)}`;
  return date.getFullYear() === now.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** "10:00 am" for a "10:00" value, the format of <input type="time">. */
export function formatTimeValue(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours < 12 ? 'am' : 'pm'}`;
}
