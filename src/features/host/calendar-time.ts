import type { CalendarBlock } from '@/api/types';

/*
 * The Host calendar in NZ time (plan §3: times are shown in Pacific/Auckland, whatever the device's zone).
 * Days are "2026-10-12" strings, stepped with UTC arithmetic so daylight saving never skips or repeats one;
 * a block's instants are turned into NZ wall-clock days and minutes to lay it out.
 */

export const NZ_TIME_ZONE = 'Pacific/Auckland';
export const MINUTES_PER_DAY = 24 * 60;

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The NZ day ("2026-10-12") and minutes since NZ midnight of an instant. */
export function nzWallClock(date: Date): { day: string; minutes: number } {
  const parts = Object.fromEntries(partsFormat.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    day: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export const nzToday = (now = new Date()) => nzWallClock(now).day;

const utc = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, date ?? 1));
};
const dayString = (date: Date) => date.toISOString().slice(0, 10);

export const addDays = (day: string, days: number) => {
  const date = utc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return dayString(date);
};

/** Whole days from one day to another: 1 from "2026-10-12" to "2026-10-13". */
export const daysBetween = (from: string, to: string) =>
  Math.round((utc(to).getTime() - utc(from).getTime()) / (MINUTES_PER_DAY * 60_000));

/** 0 for Monday through 6 for Sunday: NZ calendars start on Monday. */
export const mondayIndex = (day: string) => (utc(day).getUTCDay() + 6) % 7;

/** The API's day of the week: 0 = Sunday. */
export const apiWeekday = (day: string) => utc(day).getUTCDay();

export const startOfWeek = (day: string) => addDays(day, -mondayIndex(day));

export const weekOf = (day: string) =>
  Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(day), index));

/** "2026-10" for a day. */
export const monthOf = (day: string) => day.slice(0, 7);

export function addMonths(month: string, months: number): string {
  const date = utc(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return dayString(date).slice(0, 7);
}

/** Six weeks from the Monday on or before the 1st, so every month has the same height. */
export function monthGrid(month: string): string[] {
  const first = startOfWeek(`${month}-01`);
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

/** The part of a block that falls on one NZ day, in minutes from midnight. */
export interface DaySegment {
  block: CalendarBlock;
  start: number;
  end: number;
  /** Whether the block carries on from the day before, or into the next. */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

/** The blocks on a day, clipped to it, earliest first. A block ending at midnight doesn't touch the next day. */
export function segmentsOn(blocks: readonly CalendarBlock[], day: string): DaySegment[] {
  const segments: DaySegment[] = [];
  for (const block of blocks) {
    const start = nzWallClock(new Date(block.start));
    const end = nzWallClock(new Date(block.end));
    if (day < start.day || day > end.day || (day === end.day && end.minutes === 0)) continue;
    const continuesBefore = day > start.day;
    const continuesAfter = day < end.day && !(day === addDays(end.day, -1) && end.minutes === 0);
    segments.push({
      block,
      start: continuesBefore ? 0 : start.minutes,
      end: day === end.day ? end.minutes : MINUTES_PER_DAY,
      continuesBefore,
      continuesAfter,
    });
  }
  return segments.sort((a, b) => a.start - b.start || a.block.start.localeCompare(b.block.start));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
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
];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const partsOf = (day: string) => {
  const [year, month, date] = day.split('-').map(Number);
  return { year: year ?? 0, month: (month ?? 1) - 1, date: date ?? 1 };
};

/** "October 2026". */
export function formatMonth(month: string): string {
  const { year, month: index } = partsOf(`${month}-01`);
  return `${LONG_MONTHS[index]} ${year}`;
}

/** "Mon 12 Oct". */
export function formatDayShort(day: string): string {
  const { month, date } = partsOf(day);
  return `${WEEKDAYS[mondayIndex(day)]?.slice(0, 3)} ${date} ${MONTHS[month]}`;
}

/** "Monday, 12 October 2026", as screen readers announce a day. */
export function formatDayLong(day: string): string {
  const { year, month, date } = partsOf(day);
  return `${WEEKDAYS[mondayIndex(day)]}, ${date} ${LONG_MONTHS[month]} ${year}`;
}

/** "12–15 Oct", "30 Oct – 2 Nov" or "12 Oct" for a range of whole days (both ends included). */
export function formatDayRange(first: string, last: string): string {
  const a = partsOf(first);
  const b = partsOf(last);
  if (first === last) return `${a.date} ${MONTHS[a.month]}`;
  if (a.month === b.month && a.year === b.year) return `${a.date}–${b.date} ${MONTHS[b.month]}`;
  return `${a.date} ${MONTHS[a.month]} – ${b.date} ${MONTHS[b.month]}`;
}

/** "8:00 am" for minutes from midnight; 1440 is "midnight". */
export function formatMinutes(minutes: number): string {
  if (minutes === 0 || minutes === MINUTES_PER_DAY) return 'midnight';
  const hours = Math.floor(minutes / 60);
  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

/** "Sat 12 Oct, 8:00 am" in NZ time. */
export function formatInstant(iso: string): string {
  const { day, minutes } = nzWallClock(new Date(iso));
  return `${formatDayShort(day)}, ${formatMinutes(minutes)}`;
}

/** "Sat 12 Oct, 8:00 am – 6:00 pm", or across days "Sat 12 Oct, 8:00 am – Mon 14 Oct, 10:00 am", in NZ time. */
export function formatInstantRange(startIso: string, endIso: string): string {
  const start = nzWallClock(new Date(startIso));
  const end = nzWallClock(new Date(endIso));
  const from = `${formatDayShort(start.day)}, ${formatMinutes(start.minutes)}`;
  if (start.day === end.day) return `${from} – ${formatMinutes(end.minutes)}`;
  if (end.minutes === 0 && start.minutes === 0) {
    return formatDayRange(start.day, addDays(end.day, -1));
  }
  return `${from} – ${formatDayShort(end.day)}, ${formatMinutes(end.minutes)}`;
}

/** "08:00" for an hour, as the API's times and block starts are written. */
export const hourValue = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
