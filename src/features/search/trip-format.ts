import { formatDateValue, formatTimeValue, parseDateValue } from '@/lib/dates';
import { fromDateTimeParam } from './search-validation';

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "12–15 Oct", or "30 Oct – 2 Nov" across months: the dates in the phone's summary bar (plan §12.6). */
export function formatTripRange(start: string, end: string): string {
  const from = parseDateValue(fromDateTimeParam(start).date);
  const to = parseDateValue(fromDateTimeParam(end).date);
  if (!from || !to) return '';
  const fromMonth = SHORT_MONTHS[from.getMonth()];
  const toMonth = SHORT_MONTHS[to.getMonth()];
  if (from.getFullYear() !== to.getFullYear())
    return `${from.getDate()} ${fromMonth} ${from.getFullYear()} – ${to.getDate()} ${toMonth} ${to.getFullYear()}`;
  if (from.getMonth() !== to.getMonth()) return `${from.getDate()} ${fromMonth} – ${to.getDate()} ${toMonth}`;
  if (from.getDate() === to.getDate()) return `${from.getDate()} ${fromMonth}`;
  return `${from.getDate()}–${to.getDate()} ${fromMonth}`;
}

/** "Mon, 12 Oct, 10:00 am – Thu, 15 Oct, 10:00 am": the trip in full, in NZ time. */
export function formatTripDates(start: string, end: string): string {
  const from = fromDateTimeParam(start);
  const to = fromDateTimeParam(end);
  return `${formatDateValue(from.date)}, ${formatTimeValue(from.time)} – ${formatDateValue(to.date)}, ${formatTimeValue(to.time)}`;
}
