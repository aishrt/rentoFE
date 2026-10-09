import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { CalendarBlock, HostVehicle } from '@/api/types';
import { SectionError } from '@/components/errors/section-error';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { tabId, tabPanelId } from '@/components/ui/tab-ids';
import { BlockDialog, type BlockRequest } from './block-dialog';
import { CalendarDetails } from './calendar-details';
import { CalendarLegend } from './calendar-legend';
import { CalendarMonth, type DayRange } from './calendar-month';
import {
  addDays,
  addMonths,
  formatDayLong,
  formatDayRange,
  formatMonth,
  hourValue,
  monthGrid,
  monthOf,
  nzWallClock,
  segmentsOn,
  weekOf,
} from './calendar-time';
import { CalendarWeek, type SlotRange } from './calendar-week';
import { getCalendarRequest, hostKeys } from './host-api';
import { RecurringRulesEditor } from './recurring-rules-editor';
import { TripRulesCard } from './trip-rules-card';
import { vehiclePath } from './use-step-save';
import { isLocked } from './vehicle-labels';

/*
 * One car's availability calendar (plan §9, Days 10–11), shared by the car's own calendar page and the Host's
 * Calendar tab (plan §12.6). The view and the date shown stay in the link (`?view=`, `?date=`).
 */

type View = 'month' | 'week';

const VIEWS = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
] as const;

export function CalendarSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true">
      <span className="sr-only">Loading the calendar</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-11 w-full max-w-md rounded-full" />
      <Skeleton className="h-[30rem] rounded-card" />
    </div>
  );
}

/** Blocks overlapping the days, once each, earliest first. */
function blocksWithin(blocks: readonly CalendarBlock[], days: readonly string[]) {
  const seen = new Map<string, CalendarBlock>();
  for (const day of days)
    for (const segment of segmentsOn(blocks, day)) seen.set(segment.block.id, segment.block);
  return [...seen.values()].sort((a, b) => a.start.localeCompare(b.start));
}

function Calendar({ vehicle }: { vehicle: HostVehicle }) {
  const [params, setParams] = useSearchParams();
  const [now] = useState(() => nzWallClock(new Date()));
  const today = now.day;
  const view: View = params.get('view') === 'week' ? 'week' : 'month';
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '')
    ? (params.get('date') as string)
    : today;
  const month = monthOf(anchor);
  const days = view === 'month' ? monthGrid(month) : weekOf(anchor);
  const from = days[0] ?? today;
  const to = addDays(days.at(-1) ?? today, 1);

  const [dayRange, setDayRange] = useState<DayRange | null>(null);
  const [slotRange, setSlotRange] = useState<SlotRange | null>(null);
  const [request, setRequest] = useState<BlockRequest | null>(null);

  const calendar = useQuery({
    queryKey: hostKeys.calendarRange(vehicle.id, from, to),
    queryFn: () => getCalendarRequest(vehicle.id, from, to),
    placeholderData: keepPreviousData,
  });
  const blocks = calendar.data?.blocks ?? [];

  const go = (next: { view?: View; date?: string }) => {
    setDayRange(null);
    setSlotRange(null);
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        if (next.view) updated.set('view', next.view);
        if (next.date) updated.set('date', next.date);
        return updated;
      },
      { replace: true },
    );
  };
  const step = (direction: 1 | -1) =>
    go({ date: view === 'month' ? `${addMonths(month, direction)}-01` : addDays(anchor, direction * 7) });

  const onDayClick = (day: string) =>
    setDayRange((current) =>
      !current || current.end || day < current.start ? { start: day } : { start: current.start, end: day },
    );
  const onSlotClick = (day: string, hour: number) =>
    setSlotRange((current) => {
      if (!current || current.endDay !== undefined) return { day, hour };
      const before = day < current.day || (day === current.day && hour < current.hour);
      return before ? { day, hour } : { ...current, endDay: day, endHour: hour };
    });

  const blockSelection = () => {
    if (view === 'month' && dayRange) {
      setRequest({ kind: 'days', first: dayRange.start, last: dayRange.end ?? dayRange.start });
    } else if (view === 'week' && slotRange) {
      const endDay = slotRange.endDay ?? slotRange.day;
      const endHour = (slotRange.endHour ?? slotRange.hour) + 1;
      setRequest({
        kind: 'times',
        startDay: slotRange.day,
        startTime: hourValue(slotRange.hour),
        endDay: endHour === 24 ? addDays(endDay, 1) : endDay,
        endTime: hourValue(endHour % 24),
      });
    } else {
      // Nothing chosen: a time range starting at the next hour, to adjust in the dialog.
      const hour = Math.min(23, Math.floor(now.minutes / 60) + 1);
      setRequest({
        kind: 'times',
        startDay: today,
        startTime: hourValue(hour),
        endDay: hour === 23 ? addDays(today, 1) : today,
        endTime: hourValue((hour + 1) % 24),
      });
    }
  };

  const title =
    view === 'month'
      ? formatMonth(month)
      : `${formatDayRange(days[0] ?? anchor, days[6] ?? anchor)} ${anchor.slice(0, 4)}`;
  const selectionText =
    view === 'month' && dayRange
      ? dayRange.end
        ? `${formatDayRange(dayRange.start, dayRange.end)} chosen`
        : `${formatDayLong(dayRange.start)} chosen. Tap another day to choose a range.`
      : view === 'week' && slotRange
        ? slotRange.endDay
          ? 'Times chosen'
          : 'Tap another hour to choose a range, or block this hour.'
        : null;
  const detailDays = view === 'month' ? (dayRange ? [dayRange.start] : []) : days;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 content-start gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            idPrefix="calendar-view"
            label="Calendar view"
            options={VIEWS}
            value={view}
            onChange={(next) => go({ view: next })}
            className="w-full sm:w-56"
          />
          <div className="flex items-center gap-1">
            <IconButton
              label={view === 'month' ? 'Previous month' : 'Previous week'}
              onClick={() => step(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </IconButton>
            <p aria-live="polite" className="headline min-w-40 text-center text-lg font-medium">
              {title}
            </p>
            <IconButton label={view === 'month' ? 'Next month' : 'Next week'} onClick={() => step(1)}>
              <ChevronRight aria-hidden="true" />
            </IconButton>
            <Button variant="ghost" size="sm" onClick={() => go({ date: today })}>
              Today
            </Button>
          </div>
        </div>

        <CalendarLegend />

        <div
          role="tabpanel"
          id={tabPanelId('calendar-view', view)}
          aria-labelledby={tabId('calendar-view', view)}
          aria-busy={calendar.isFetching}
          className="min-w-0"
        >
          {calendar.isError ? (
            <SectionError title="We couldn't load the calendar" onRetry={() => calendar.refetch()} />
          ) : calendar.isPending ? (
            <Skeleton className="h-[30rem] rounded-card" />
          ) : view === 'month' ? (
            <CalendarMonth
              month={month}
              blocks={blocks}
              today={today}
              selection={dayRange}
              onDayClick={onDayClick}
            />
          ) : (
            <CalendarWeek
              days={days}
              blocks={blocks}
              today={today}
              nowMinutes={now.minutes}
              selection={slotRange}
              onSlotClick={onSlotClick}
            />
          )}
        </div>

        <div
          aria-live="polite"
          className="glass sticky bottom-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:rounded-card sm:border sm:bg-surface sm:pb-3"
        >
          <p className="min-w-0 flex-1 text-sm text-ink">
            {selectionText ??
              (view === 'month'
                ? 'Tap a day, then another, to block dates.'
                : 'Tap an hour, then another, to block a time.')}
          </p>
          {selectionText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDayRange(null);
                setSlotRange(null);
              }}
            >
              Clear
            </Button>
          )}
          <Button size="sm" onClick={blockSelection}>
            <CalendarPlus aria-hidden="true" />
            {view === 'month' && dayRange
              ? `Block ${formatDayRange(dayRange.start, dayRange.end ?? dayRange.start)}`
              : view === 'week' && slotRange
                ? 'Block these times'
                : 'Block a time'}
          </Button>
        </div>

        {(view === 'week' || dayRange) && (
          <CalendarDetails
            vehicleId={vehicle.id}
            title={view === 'week' ? 'This week' : formatDayLong(dayRange?.start ?? today)}
            blocks={blocksWithin(blocks, detailDays)}
            empty={
              view === 'week' ? 'Nothing booked or blocked this week.' : 'Free: nothing booked or blocked.'
            }
          />
        )}
      </div>

      <div className="grid content-start gap-6">
        <RecurringRulesEditor vehicle={vehicle} />
        <TripRulesCard vehicle={vehicle} />
      </div>

      <BlockDialog
        vehicleId={vehicle.id}
        request={request}
        onClose={() => setRequest(null)}
        onBlocked={() => {
          setRequest(null);
          setDayRange(null);
          setSlotRange(null);
        }}
      />
    </div>
  );
}

/**
 * A car's calendar: month and week views of every block by reason, with a key; choose days or hours to block,
 * remove your own blocks, set weekly availability, and the minimum notice and preparation time. A listing that
 * can no longer change says so instead.
 */
export function VehicleCalendar({ vehicle }: { vehicle: HostVehicle }) {
  if (isLocked(vehicle.status)) {
    return (
      <EmptyState
        titleAs="h2"
        title="This car's calendar can't be changed"
        description="It isn't listed any more. Its listing overview says why."
        actions={
          <Button asChild variant="secondary">
            <Link to={vehiclePath(vehicle.id)}>Listing overview</Link>
          </Button>
        }
      />
    );
  }
  return <Calendar vehicle={vehicle} />;
}
