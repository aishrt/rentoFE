import type { FieldErrors, Resolver } from 'react-hook-form';
import { addDays, combineDateTime, toDateInputValue } from '@/lib/dates';

/*
 * Homepage search checks for instant feedback. Written without Zod so the homepage doesn't
 * download it (plan §12.5 speed budget). The backend's search validation (plan §3) and
 * NZ-time handling arrive with the search API in Phase 2.
 */

export interface SearchValues {
  where: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

export type SearchErrors = Partial<Record<keyof SearchValues, string>>;

export function validateSearch(values: SearchValues, now = Date.now()): SearchErrors {
  const errors: SearchErrors = {};
  if (values.where.trim().length < 2) errors.where = "Tell us where you're headed";
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

export const searchResolver: Resolver<SearchValues> = (values) => {
  const errors = validateSearch(values);
  const entries = Object.entries(errors);
  if (entries.length === 0) return { values, errors: {} };
  return {
    values: {},
    errors: Object.fromEntries(
      entries.map(([field, message]) => [field, { type: 'validate', message }]),
    ) as FieldErrors<SearchValues>,
  };
};

/** Tomorrow at 10 am, back three days later. */
export function defaultSearchValues(now = new Date()): SearchValues {
  const pickup = addDays(now, 1);
  return {
    where: '',
    pickupDate: toDateInputValue(pickup),
    pickupTime: '10:00',
    returnDate: toDateInputValue(addDays(pickup, 3)),
    returnTime: '10:00',
  };
}

/** The Search Results URL (plan §1.4); the page itself is built in Phase 2. */
export function searchUrl(values: SearchValues): string {
  const params = new URLSearchParams({
    where: values.where.trim(),
    start: `${values.pickupDate}T${values.pickupTime}`,
    end: `${values.returnDate}T${values.returnTime}`,
  });
  return `/search?${params.toString()}`;
}
