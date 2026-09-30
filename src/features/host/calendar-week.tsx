import { useEffect, useRef } from 'react';
import type { CalendarBlock } from '@/api/types';
import { cn } from '@/lib/cn';
import { BLOCK_TONES, blockLabel } from './calendar-blocks';
import { MINUTES_PER_DAY, formatDayLong, formatMinutes, mondayIndex, segmentsOn } from './calendar-time';

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** The week opens scrolled to the working day. */
const FIRST_VISIBLE_HOUR = 7;

export interface SlotRange {
  day: string;
  hour: number;
  /** The last hour chosen (included), once a second slot is tapped. */
  endDay?: string;
  endHour?: number;
}

interface CalendarWeekProps {
  days: readonly string[];
  blocks: readonly CalendarBlock[];
  today: string;
  /** The current hour in NZ, to stop blocks starting in the past. */
  nowMinutes: number;
  selection: SlotRange | null;
  onSlotClick: (day: string, hour: number) => void;
}

const slotKey = (day: string, hour: number) => `${day}T${String(hour).padStart(2, '0')}`;

function inSelection(day: string, hour: number, selection: SlotRange | null) {
  if (!selection) return false;
  const key = slotKey(day, hour);
  const start = slotKey(selection.day, selection.hour);
  const end = slotKey(selection.endDay ?? selection.day, selection.endHour ?? selection.hour);
  return key >= start && key <= end;
}

/**
 * A week of the car's calendar in hours (plan §9, Days 10–11), each block drawn at its NZ times. Tap an
 * hour, then another, to choose a time to block.
 */
export function CalendarWeek({ days, blocks, today, nowMinutes, selection, onSlotClick }: CalendarWeekProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollRef.current;
    const hour = scroller?.querySelector<HTMLElement>('[data-hour]');
    if (scroller && hour) scroller.scrollTop = hour.offsetHeight * FIRST_VISIBLE_HOUR;
  }, []);

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] border-b border-line bg-canvas/60 sm:grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
        <span aria-hidden="true" />
        {days.map((day) => (
          <p
            key={day}
            className={cn(
              'py-2 text-center text-xs text-muted',
              day === today && 'font-semibold text-primary',
            )}
          >
            <span className="block">{WEEKDAY_SHORT[mondayIndex(day)]}</span>
            <span className={cn('text-base tabular-nums', day === today ? 'text-primary' : 'text-ink')}>
              {Number(day.slice(8))}
            </span>
          </p>
        ))}
      </div>
      <div ref={scrollRef} className="scrollbar-subtle max-h-[34rem] overflow-y-auto">
        {/* Keyed by week, so a new week fades in. */}
        <div
          key={days[0]}
          className="grid animate-fade-in grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] sm:grid-cols-[4rem_repeat(7,minmax(0,1fr))]"
        >
          <div aria-hidden="true">
            {HOURS.map((hour) => (
              <div
                key={hour}
                data-hour
                className="h-11 pr-1.5 text-right text-xs text-muted tabular-nums sm:pr-2"
              >
                <span className="relative -top-2">
                  {hour === 0 ? '' : formatMinutes(hour * 60).replace(':00', '')}
                </span>
              </div>
            ))}
          </div>
          {days.map((day) => {
            const segments = segmentsOn(blocks, day);
            return (
              <div
                key={day}
                className="relative border-l border-line"
                role="group"
                aria-label={formatDayLong(day)}
              >
                {HOURS.map((hour) => {
                  const past = day < today || (day === today && (hour + 1) * 60 <= nowMinutes);
                  const selected = inSelection(day, hour, selection);
                  // Screen readers hear what's already in each hour, since the coloured bars are hidden from them.
                  const taken = segments
                    .filter((segment) => segment.start < (hour + 1) * 60 && segment.end > hour * 60)
                    .map((segment) => blockLabel(segment.block));
                  return (
                    <button
                      key={hour}
                      type="button"
                      disabled={past}
                      aria-pressed={selected}
                      aria-label={`${formatDayLong(day)}, ${formatMinutes(hour * 60)}${taken.length ? `: ${taken.join(', ')}` : ''}`}
                      onClick={() => onSlotClick(day, hour)}
                      className={cn(
                        'block h-11 w-full border-b border-line/60 transition-colors duration-120 last:border-b-0',
                        'focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                        'enabled:hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-canvas/50',
                        selected && 'bg-primary/15 enabled:hover:bg-primary/20',
                      )}
                    />
                  );
                })}
                {segments.map((segment) => (
                  <div
                    key={segment.block.id}
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute inset-x-0.5 overflow-clip rounded-inner px-1 py-0.5 text-xs leading-4 font-medium sm:inset-x-1 sm:px-1.5',
                      BLOCK_TONES[segment.block.reason],
                      segment.continuesBefore && 'rounded-t-none',
                      segment.continuesAfter && 'rounded-b-none',
                    )}
                    style={{
                      top: `${(segment.start / MINUTES_PER_DAY) * 100}%`,
                      height: `max(0.375rem, ${((segment.end - segment.start) / MINUTES_PER_DAY) * 100}%)`,
                    }}
                  >
                    {/* Sticks to the top of the scrolled view, so a long trip stays named. */}
                    <span className="sticky top-1 hidden sm:line-clamp-2">{blockLabel(segment.block)}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
