import { useSearchParams } from 'react-router';
import { nzDay } from '@/features/admin/ops/admin-labels';

/*
 * The range of NZ days that the overview and the platform reports cover (plan §12.6). A preset is kept in
 * the address as ?range=7d, so a link to "last 7 days" stays current; custom dates as ?from=…&to=….
 */

/** First and last NZ day, inclusive, as "2026-10-07". */
export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = '7d' | '30d' | 'this-month' | 'last-month';
export type RangeChoice = RangePreset | 'custom';

export const RANGE_CHOICES: readonly { value: RangeChoice; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'custom', label: 'Custom dates' },
];

/** What the API shows when no range is given. */
export const DEFAULT_PRESET: RangePreset = '30d';

/** The longest range the API takes, in days. */
export const MAX_RANGE_DAYS = 400;

const DAY_MS = 86_400_000;

// Day arithmetic on the calendar date alone, in UTC, so daylight saving never shifts a day.
function dayTime(day: string): number {
  const [year = 0, month = 1, date = 1] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date);
}

const dayFrom = (time: number) => new Date(time).toISOString().slice(0, 10);

/** "2026-10-07" plus or minus whole days. */
export const addDaysTo = (day: string, days: number) => dayFrom(dayTime(day) + days * DAY_MS);

/** How many days a range covers, counting both ends. */
export const daysInRange = ({ from, to }: DateRange) =>
  Math.round((dayTime(to) - dayTime(from)) / DAY_MS) + 1;

/** A real day written as "2026-10-07" (not "2026-02-30"). */
function isDay(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && dayFrom(dayTime(value)) === value);
}

/** The days a preset covers, ending today in New Zealand. */
export function presetRange(preset: RangePreset, now = new Date()): DateRange {
  const today = nzDay(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  switch (preset) {
    case '7d':
      return { from: addDaysTo(today, -6), to: today };
    case '30d':
      return { from: addDaysTo(today, -29), to: today };
    case 'this-month':
      return { from: monthStart, to: today };
    case 'last-month': {
      const lastDay = addDaysTo(monthStart, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
  }
}

/**
 * Keeps custom dates the right way round and within `maxDays`, moving the end that wasn't just chosen:
 * picking a start after the end makes it a single day, and a start too far back brings the end with it.
 */
export function fitRange(range: DateRange, maxDays = MAX_RANGE_DAYS, keep: 'from' | 'to' = 'to'): DateRange {
  let { from, to } = range;
  if (from > to) {
    if (keep === 'from') to = from;
    else from = to;
  }
  if (daysInRange({ from, to }) > maxDays) {
    if (keep === 'from') to = addDaysTo(from, maxDays - 1);
    else from = addDaysTo(to, -(maxDays - 1));
  }
  return { from, to };
}

export interface ChosenRange extends DateRange {
  choice: RangeChoice;
}

const isPreset = (value: string | null): value is RangePreset =>
  RANGE_CHOICES.some((choice) => choice.value !== 'custom' && choice.value === value);

/** The range in the address: custom dates, a preset, or the last 30 days. */
export function readDateRange(
  params: URLSearchParams,
  maxDays = MAX_RANGE_DAYS,
  now = new Date(),
): ChosenRange {
  const from = params.get('from');
  const to = params.get('to');
  if (isDay(from) && isDay(to)) return { choice: 'custom', ...fitRange({ from, to }, maxDays) };
  const range = params.get('range');
  const preset = isPreset(range) ? range : DEFAULT_PRESET;
  return { choice: preset, ...presetRange(preset, now) };
}

/** "Tue, 8 Sep – Wed, 7 Oct" or "Wed, 7 Oct" for a single day. */
export function describeRange({ from, to }: DateRange, format: (day: string) => string): string {
  return from === to ? format(from) : `${format(from)} – ${format(to)}`;
}

export interface DateRangeState {
  range: DateRange;
  choice: RangeChoice;
  maxDays: number;
  choosePreset: (preset: RangePreset) => void;
  /** Custom dates; `keep` is the end just chosen, which stays as it is. */
  chooseDates: (dates: DateRange, keep?: 'from' | 'to') => void;
}

/** The page's date range, read from and written to the address. */
export function useDateRange(maxDays = MAX_RANGE_DAYS): DateRangeState {
  const [searchParams, setSearchParams] = useSearchParams();
  const { choice, from, to } = readDateRange(searchParams, maxDays);

  const update = (apply: (params: URLSearchParams) => void) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const key of ['range', 'from', 'to']) next.delete(key);
        apply(next);
        return next;
      },
      { replace: true },
    );

  return {
    range: { from, to },
    choice,
    maxDays,
    choosePreset: (preset) =>
      update((params) => {
        if (preset !== DEFAULT_PRESET) params.set('range', preset);
      }),
    chooseDates: (dates, keep = 'to') =>
      update((params) => {
        const fitted = fitRange(dates, maxDays, keep);
        params.set('from', fitted.from);
        params.set('to', fitted.to);
      }),
  };
}
