import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CarFront, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { CalendarBlock } from '@/api/types';
import { SectionError } from '@/components/errors/section-error';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { WEEKDAYS } from '@/lib/dates';
import { smallPhoto } from '@/lib/photos';
import { BLOCK_TONES, blockLabel, isCheckout } from './calendar-blocks';
import { CalendarLegend } from './calendar-legend';
import {
  MINUTES_PER_DAY,
  addDays,
  addMonths,
  daysBetween,
  formatDayLong,
  formatDayRange,
  formatInstantRange,
  formatMonth,
  monthOf,
  mondayIndex,
  nzToday,
  nzWallClock,
  startOfWeek,
} from './calendar-time';
import { getAllCarsCalendarRequest, hostKeys, type CalendarCar } from './host-api';
import { vehicleDisplayTitle } from './vehicle-labels';

/*
 * The Calendar tab across all the Host's cars (plan §12.6; MILESTONES: "a Calendar tab across all the Host's
 * cars"): one row a car and one column a day, with the same colours and labels as each car's own calendar.
 * A trip or request opens its booking; a car opens its own calendar, where blocks are changed. The date shown
 * stays in the link (`?date=`), shared with the car's calendar, so moving between them keeps the dates.
 */

/** A month's days are wide enough from large screens up; phones and tablets show two weeks. */
const WIDE = '(min-width: 64rem)';
function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}
function useWideScreen() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );
}

const FORTNIGHT = 14;

/** The days shown around a date: its month, or the two weeks from the Monday of its week. */
function windowOf(anchor: string, wide: boolean): string[] {
  const first = wide ? `${monthOf(anchor)}-01` : startOfWeek(anchor);
  const length = wide ? daysBetween(first, `${addMonths(monthOf(anchor), 1)}-01`) : FORTNIGHT;
  return Array.from({ length }, (_, index) => addDays(first, index));
}

/** Trips and requests over the Host's own blocks, and those over weekly times and preparation time. */
const LAYER: Record<CalendarBlock['reason'], number> = {
  RECURRING: 0,
  BUFFER: 0,
  HOST_BLOCK: 1,
  ADMIN: 1,
  HOLD: 2,
  BOOKED: 2,
};

/** Where a block sits in the days shown, in days from the first, cut to the days shown. */
function placement(block: CalendarBlock, first: string, length: number) {
  const at = (iso: string) => {
    const { day, minutes } = nzWallClock(new Date(iso));
    return Math.min(Math.max(daysBetween(first, day) + minutes / MINUTES_PER_DAY, 0), length);
  };
  const start = at(block.start);
  const end = at(block.end);
  return end > start ? { start, end } : null;
}

/** A car's own calendar on the Calendar tab, at the dates shown here. */
const carCalendarPath = (id: string, date: string) =>
  `/host/calendar?${new URLSearchParams({ car: id, date })}`;

function BlockBar({ block, style }: { block: CalendarBlock; style: CSSProperties }) {
  const label = blockLabel(block);
  const when = formatInstantRange(block.start, block.end);
  const bar = cn(
    'flex size-full items-center overflow-hidden rounded-inner px-1.5 text-xs font-medium',
    BLOCK_TONES[block.reason],
  );
  // A trip or a request opens its booking (not dates held while a Guest pays, which aren't one yet); the
  // rest are changed on the car's own calendar.
  const booking = block.booking && !isCheckout(block) ? block.booking : undefined;
  return (
    <li
      style={style}
      title={`${label}, ${when}`}
      className={cn(
        'absolute inset-y-0 min-w-1.5',
        LAYER[block.reason] > 0 && 'z-10',
        booking && 'pointer-events-auto',
      )}
    >
      {booking ? (
        <Link
          to={`/host/bookings/${booking.ref}`}
          aria-label={`${label}, ${when}`}
          className={cn(
            bar,
            'transition-opacity duration-120 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary',
          )}
        >
          <span className="truncate">{label}</span>
        </Link>
      ) : (
        <span className={bar}>
          <span aria-hidden="true" className="truncate">
            {label}
          </span>
          <span className="sr-only">
            {label}, {when}
          </span>
        </span>
      )}
    </li>
  );
}

function CarRow({
  car,
  days,
  today,
  anchor,
}: {
  car: CalendarCar;
  days: string[];
  today: string;
  anchor: string;
}) {
  const first = days[0]!;
  const title = vehicleDisplayTitle(car.title);
  const calendar = carCalendarPath(car.id, anchor);
  const percent = (value: number) => `${(value / days.length) * 100}%`;
  const todayIndex = days.indexOf(today);
  const shown = car.blocks
    .map((block) => ({ block, place: placement(block, first, days.length) }))
    .filter((entry) => entry.place !== null)
    .sort((a, b) => LAYER[a.block.reason] - LAYER[b.block.reason] || a.place!.start - b.place!.start);

  return (
    <li className="grid grid-cols-1 gap-2 border-t border-line px-3 py-3 sm:px-4">
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-inner bg-canvas">
          {car.photo ? (
            <img src={smallPhoto(car.photo)} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <CarFront aria-hidden="true" className="size-4 text-primary/60" />
          )}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          <Link
            to={calendar}
            className="link-underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {title}
          </Link>
        </h2>
        <Link
          to={calendar}
          className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-control px-2 text-sm font-medium text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
        >
          Manage <span className="sr-only">the calendar of the {title}</span>
          <ChevronRight aria-hidden="true" className="nudge-right size-4" />
        </Link>
      </div>
      <div
        className="relative h-11 overflow-hidden rounded-inner bg-canvas/40"
        // A hairline between days.
        style={{
          backgroundImage: 'linear-gradient(to right, var(--color-line) 1px, transparent 1px)',
          backgroundSize: `${100 / days.length}% 100%`,
        }}
      >
        {todayIndex >= 0 && (
          <span
            aria-hidden="true"
            className="absolute inset-y-0 bg-primary/10"
            style={{ left: percent(todayIndex), width: percent(1) }}
          />
        )}
        {/* Tapping a free day opens the car's calendar too. */}
        <Link to={calendar} tabIndex={-1} aria-hidden="true" className="absolute inset-0" />
        <ul aria-label={`${title}: trips and blocks`} className="pointer-events-none absolute inset-0">
          {shown.map(({ block, place }) => (
            <BlockBar
              key={block.id}
              block={block}
              style={{ left: percent(place!.start), width: percent(place!.end - place!.start) }}
            />
          ))}
        </ul>
        {shown.length === 0 && <p className="sr-only">Nothing booked or blocked in these dates.</p>}
      </div>
    </li>
  );
}

/** The weekday and date over each column, with today marked. */
function DayHeader({ days, today }: { days: string[]; today: string }) {
  return (
    <div
      aria-hidden="true"
      className="grid bg-canvas/60 px-3 py-2 sm:px-4"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((day) => {
        const weekend = mondayIndex(day) >= 5;
        return (
          <div key={day} className="flex flex-col items-center gap-0.5 text-xs tabular-nums">
            <span className={weekend ? 'text-muted' : 'text-ink/70'}>
              {WEEKDAYS[mondayIndex(day)]?.slice(0, 1)}
            </span>
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full font-medium',
                day === today ? 'bg-primary text-surface' : 'text-ink',
              )}
            >
              {Number(day.slice(8))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-px overflow-hidden rounded-card border border-line bg-surface"
    >
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid gap-2 p-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-11 rounded-inner" />
        </div>
      ))}
    </div>
  );
}

/**
 * Every car's calendar at once: a timeline of a month on large screens and two weeks on phones and tablets,
 * with previous, next and today, and the same key as each car's calendar.
 */
export function AllCarsCalendar() {
  const [params, setParams] = useSearchParams();
  const [today] = useState(() => nzToday());
  const wide = useWideScreen();
  const dateParam = params.get('date') ?? '';
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const days = windowOf(anchor, wide);
  const first = days[0]!;
  const last = days.at(-1)!;
  const to = addDays(last, 1);

  const calendar = useQuery({
    queryKey: hostKeys.allCarsCalendar(first, to),
    queryFn: () => getAllCarsCalendarRequest(first, to),
    placeholderData: keepPreviousData,
  });

  const go = (date: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('date', date);
        return next;
      },
      { replace: true },
    );
  const step = (direction: 1 | -1) =>
    go(wide ? `${addMonths(monthOf(anchor), direction)}-01` : addDays(first, direction * FORTNIGHT));
  const title = wide ? formatMonth(monthOf(anchor)) : `${formatDayRange(first, last)} ${last.slice(0, 4)}`;
  const span = wide ? 'month' : 'two weeks';

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton label={`Previous ${span}`} onClick={() => step(-1)}>
            <ChevronLeft aria-hidden="true" />
          </IconButton>
          <p aria-live="polite" className="headline min-w-40 text-center text-lg font-medium">
            {title}
          </p>
          <IconButton label={`Next ${span}`} onClick={() => step(1)}>
            <ChevronRight aria-hidden="true" />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={() => go(today)}>
            Today
          </Button>
        </div>
      </div>

      <CalendarLegend />

      {calendar.isError ? (
        <SectionError title="We couldn't load your calendars" onRetry={() => calendar.refetch()} />
      ) : calendar.isPending ? (
        <TimelineSkeleton />
      ) : (
        <section
          aria-label={`All cars, ${formatDayLong(first)} to ${formatDayLong(last)}`}
          aria-busy={calendar.isFetching}
          className="overflow-hidden rounded-card border border-line bg-surface shadow-xs"
        >
          <DayHeader days={days} today={today} />
          <ul key={first} className="animate-fade-in">
            {calendar.data.vehicles.map((car) => (
              <CarRow key={car.id} car={car} days={days} today={today} anchor={anchor} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
