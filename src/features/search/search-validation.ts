import { addDays, combineDateTime, parseDateValue, toDateInputValue } from '@/lib/dates';
import { filterParams, tripParams, type PlaceValue } from './place';

/*
 * Search form checks for instant feedback, written without Zod or a form library so the homepage doesn't
 * download them (plan §12.5 speed budget). The backend repeats the checks (plan §3) and its field errors
 * are shown on the results page.
 */

export interface SearchValues {
  /** The place as typed, or as chosen from the suggestions. */
  place: PlaceValue;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

export type SearchField = 'where' | 'pickupDate' | 'pickupTime' | 'returnDate' | 'returnTime';
export type SearchErrors = Partial<Record<SearchField, string>>;

/** The fields in the order they appear, so the first one with an error can take focus. */
export const SEARCH_FIELDS: readonly SearchField[] = [
  'where',
  'pickupDate',
  'pickupTime',
  'returnDate',
  'returnTime',
];

interface ValidateOptions {
  now?: number;
  /** The homepage needs a place; results pages don't (no place means all of NZ). */
  requirePlace?: boolean;
  /** Search Results need dates; Browse Cars doesn't, but once one date is given, so is the rest. */
  requireDates?: boolean;
}

export function validateSearch(
  values: SearchValues,
  { now = Date.now(), requirePlace = true, requireDates = true }: ValidateOptions = {},
): SearchErrors {
  const errors: SearchErrors = {};
  if (requirePlace && values.place.label.trim().length < 2) errors.where = "Tell us where you're headed";
  if (!requireDates && !values.pickupDate && !values.returnDate) return errors;

  if (!values.pickupDate) errors.pickupDate = 'Choose a pick-up date';
  if (!values.pickupTime) errors.pickupTime = 'Choose a pick-up time';
  if (!values.returnDate) errors.returnDate = 'Choose a return date';
  if (!values.returnTime) errors.returnTime = 'Choose a return time';

  const start = combineDateTime(values.pickupDate, values.pickupTime);
  const end = combineDateTime(values.returnDate, values.returnTime);
  if (!errors.pickupDate && !errors.pickupTime && !start) {
    errors.pickupDate = 'Enter a valid pick-up date and time';
  } else if (start && start.getTime() < now) {
    errors.pickupDate = 'Pick-up needs to be in the future';
  }
  if (start && end && end.getTime() <= start.getTime())
    errors.returnDate = 'Return needs to be after pick-up';

  return errors;
}

/** Tomorrow at 10 am, back three days later. */
export function defaultSearchValues(now = new Date()): SearchValues {
  const pickup = addDays(now, 1);
  return {
    place: { label: '' },
    pickupDate: toDateInputValue(pickup),
    pickupTime: '10:00',
    returnDate: toDateInputValue(addDays(pickup, 3)),
    returnTime: '10:00',
  };
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * The dates after choosing a pick-up date. A return that would now be before it moves too, keeping the
 * trip's length, so choosing a later pick-up never leaves the form in error.
 */
export function movePickupDate<Dates extends { pickupDate: string; returnDate: string }>(
  dates: Dates,
  pickupDate: string,
): Dates {
  const pickup = parseDateValue(pickupDate);
  if (!pickup || !dates.returnDate || dates.returnDate >= pickupDate) return { ...dates, pickupDate };
  const oldPickup = parseDateValue(dates.pickupDate);
  const oldReturn = parseDateValue(dates.returnDate);
  const days =
    oldPickup && oldReturn ? Math.max(1, Math.round((oldReturn.getTime() - oldPickup.getTime()) / DAY)) : 3;
  return { ...dates, pickupDate, returnDate: toDateInputValue(addDays(pickup, days)) };
}

/** "2026-10-12T10:00": a date and time as the API and the URLs take them (NZ time). */
export const toDateTimeParam = (date: string, time: string) => `${date}T${time}`;

/** Splits "2026-10-12T10:00" back into the form's date and time. */
export function fromDateTimeParam(value: string | undefined): { date: string; time: string } {
  const [date = '', time = ''] = value?.split('T') ?? [];
  return { date, time: time.slice(0, 5) };
}

/**
 * The results URL for a search (plan §1.4): Search Results with dates, Browse Cars without. `keep` carries
 * the filters and sort over when the place or dates change on the results page.
 */
export function searchUrl(values: SearchValues, keep?: URLSearchParams): string {
  const dated = Boolean(values.pickupDate && values.returnDate);
  const params = tripParams({
    place: { ...values.place, label: values.place.label.trim() },
    start: dated ? toDateTimeParam(values.pickupDate, values.pickupTime) : undefined,
    end: dated ? toDateTimeParam(values.returnDate, values.returnTime) : undefined,
  });
  if (keep) filterParams(keep).forEach((value, key) => params.append(key, value));
  return `${dated ? '/search' : '/cars'}?${params.toString()}`;
}
