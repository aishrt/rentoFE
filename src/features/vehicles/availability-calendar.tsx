import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import {
  WEEKDAYS,
  addMonths,
  formatMonthYear,
  parseDateValue,
  toDateInputValue,
  weekdayIndex,
} from '@/lib/dates';
import { busyDays } from './availability';
import { ListingSection } from './listing-section';
import { useVehicleAvailability } from './vehicle-api';

function MonthTable({ month, busy, today }: { month: Date; busy: Set<string>; today: string }) {
  const year = month.getFullYear();
  const index = month.getMonth();
  const offset = weekdayIndex(new Date(year, index, 1));
  const daysInMonth = new Date(year, index + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, cell) => {
    const day = cell - offset + 1;
    return day >= 1 && day <= daysInMonth ? toDateInputValue(new Date(year, index, day)) : null;
  });
  const weeks = Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));

  return (
    <table className="w-full table-fixed border-collapse text-center text-sm">
      <caption className="headline pb-2 text-left text-lg font-medium">{formatMonthYear(month)}</caption>
      <thead>
        <tr>
          {WEEKDAYS.map((weekday) => (
            <th key={weekday} scope="col" abbr={weekday} className="pb-1 text-xs font-medium text-muted">
              {weekday.slice(0, 2)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, row) => (
          <tr key={row}>
            {week.map((day, column) => {
              if (!day) return <td key={column} />;
              const past = day < today;
              const booked = busy.has(day);
              return (
                <td key={day} className="p-0.5">
                  <span
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-full tabular-nums',
                      past && 'text-muted/50',
                      !past && booked && 'bg-ink/6 text-muted line-through',
                      !past && !booked && 'text-ink',
                      day === today && 'font-semibold text-primary',
                    )}
                  >
                    {Number(day.slice(8))}
                    {booked && !past && <span className="sr-only"> (booked)</span>}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * When the car is free (plan §9, Days 8–10): this month and next, with booked days crossed out. The busy
 * times come from the API merged and without reasons. A day marked booked may still be free for part of
 * it; the price check on the booking panel confirms the exact times.
 */
export function AvailabilitySection({ vehicleId }: { vehicleId: string }) {
  const availability = useVehicleAvailability(vehicleId);
  const [today] = useState(() => toDateInputValue(new Date()));
  const thisMonth = parseDateValue(`${today.slice(0, 8)}01`) ?? new Date();
  const busy = busyDays(availability.data?.busy ?? []);

  return (
    <ListingSection
      id="availability"
      title="Availability"
      description="Booked days are crossed out. Your dates and times are checked when you see the price."
    >
      {availability.isPending ? (
        <div className="grid gap-8 sm:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-card" />
          <Skeleton className="hidden aspect-square w-full rounded-card sm:block" />
        </div>
      ) : (
        <div className="grid gap-8 rounded-card border border-line/80 bg-surface p-5 shadow-card sm:grid-cols-2 sm:p-6">
          <MonthTable month={thisMonth} busy={busy} today={today} />
          <MonthTable month={addMonths(thisMonth, 1)} busy={busy} today={today} />
        </div>
      )}
    </ListingSection>
  );
}
