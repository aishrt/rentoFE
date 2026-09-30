import type { VehicleAvailability } from '@/api/types';
import { addDays, parseDateValue, toDateInputValue } from '@/lib/dates';
import { NZ_TIME_ZONE } from '@/lib/format';

// "2026-10-12" for an instant, in New Zealand, whatever the device's time zone.
const nzDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: NZ_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const nzShort = new Intl.DateTimeFormat('en-NZ', { timeZone: NZ_TIME_ZONE, day: 'numeric', month: 'short' });

/** The NZ days a busy time touches, as "2026-10-12" keys. A booking that ends at midnight doesn't touch the next day. */
export function busyDays(busy: VehicleAvailability['busy']): Set<string> {
  const days = new Set<string>();
  for (const range of busy) {
    const start = new Date(range.start);
    const end = new Date(new Date(range.end).getTime() - 1);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) continue;
    let day = parseDateValue(nzDay.format(start));
    const last = nzDay.format(end);
    // Bounded, in case of a malformed range: availability covers six months.
    for (let guard = 0; day && guard < 400; guard += 1) {
      const key = toDateInputValue(day);
      days.add(key);
      if (key >= last) break;
      day = addDays(day, 1);
    }
  }
  return days;
}

/**
 * The NZ days a busy time covers from start to end, for the date pickers to rule out. The first and
 * last days are left open: the car may be free for part of them (a return at 10 am, then a pick-up
 * after the preparation time), and the quote has the final say.
 */
export function fullyBookedDays(busy: VehicleAvailability['busy']): Set<string> {
  const days = new Set<string>();
  for (const range of busy) {
    const first = parseDateValue(nzDay.format(new Date(range.start)));
    const last = nzDay.format(new Date(new Date(range.end).getTime() - 1));
    if (!first) continue;
    let day = addDays(first, 1);
    for (let guard = 0; guard < 400 && toDateInputValue(day) < last; guard += 1) {
      days.add(toDateInputValue(day));
      day = addDays(day, 1);
    }
  }
  return days;
}

/** "12 Oct – 15 Oct": the next few busy times, for the booking panel. */
export function upcomingBusy(busy: VehicleAvailability['busy'], limit = 3): string[] {
  return busy.slice(0, limit).map((range) => {
    const from = nzShort.format(new Date(range.start));
    const to = nzShort.format(new Date(new Date(range.end).getTime() - 1));
    return from === to ? from : `${from} – ${to}`;
  });
}

/** Whether a trip ("2026-10-12T10:00" NZ wall-clock times) touches any booked day. The quote has the final say. */
export function tripTouchesBusyDays(busy: Set<string>, startDate: string, endDate: string): boolean {
  let day = parseDateValue(startDate);
  for (let guard = 0; day && guard < 400; guard += 1) {
    const key = toDateInputValue(day);
    if (busy.has(key)) return true;
    if (key >= endDate) return false;
    day = addDays(day, 1);
  }
  return false;
}
