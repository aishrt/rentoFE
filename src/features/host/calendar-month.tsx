import type { CalendarBlock } from '@/api/types';
import { cn } from '@/lib/cn';
import { WEEKDAYS } from '@/lib/dates';
import { BLOCK_TONES, blockLabel } from './calendar-blocks';
import { formatDayLong, monthGrid, monthOf, segmentsOn } from './calendar-time';

/** Blocks shown in a day before "+2 more". */
const SHOWN = 3;

export interface DayRange {
  start: string;
  /** Included. Missing while only the first day is chosen. */
  end?: string;
}

interface CalendarMonthProps {
  month: string;
  blocks: readonly CalendarBlock[];
  today: string;
  selection: DayRange | null;
  onDayClick: (day: string) => void;
}

const inRange = (day: string, range: DayRange | null) =>
  Boolean(range && day >= range.start && day <= (range.end ?? range.start));

/**
 * A month of the car's calendar, Monday first, with each day's blocks as coloured bars (plan §9, Days
 * 10–11). Tap one day, then another, to choose a range to block; past days can't be chosen. On phones the
 * bars are thin lines and the day's details show below the grid.
 */
export function CalendarMonth({ month, blocks, today, selection, onDayClick }: CalendarMonthProps) {
  const days = monthGrid(month);
  const weeks = Array.from({ length: 6 }, (_, row) => days.slice(row * 7, row * 7 + 7));

  return (
    <div
      role="grid"
      aria-label="Month"
      className="overflow-hidden rounded-card border border-line bg-surface"
    >
      <div role="row" className="grid grid-cols-7 border-b border-line bg-canvas/60">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            role="columnheader"
            aria-label={weekday}
            className="py-2 text-center text-xs font-medium text-muted"
          >
            <span aria-hidden="true">
              <span className="sm:hidden">{weekday.slice(0, 1)}</span>
              <span className="hidden sm:inline">{weekday.slice(0, 3)}</span>
            </span>
          </div>
        ))}
      </div>
      {/* Keyed by month, so a new month fades in (plan §12.4). */}
      <div key={month} role="rowgroup" className="animate-fade-in">
        {weeks.map((week) => (
          <div key={week[0]} role="row" className="grid grid-cols-7 border-b border-line last:border-b-0">
            {week.map((day) => {
              const segments = segmentsOn(blocks, day);
              const outside = monthOf(day) !== month;
              const past = day < today;
              const selected = inRange(day, selection);
              const edge = selection && (day === selection.start || day === selection.end);
              const summary = segments.map((segment) => blockLabel(segment.block)).join(', ');
              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-selected={selected}
                  className="border-r border-line last:border-r-0"
                >
                  <button
                    type="button"
                    disabled={past}
                    aria-label={`${formatDayLong(day)}${summary ? `: ${summary}` : ': free'}`}
                    aria-current={day === today ? 'date' : undefined}
                    onClick={() => onDayClick(day)}
                    className={cn(
                      'group/day flex h-full min-h-16 w-full flex-col gap-1 p-1 text-left sm:min-h-24 sm:p-1.5',
                      'transition-colors duration-120 focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                      'enabled:hover:bg-primary/5 disabled:cursor-not-allowed',
                      selected && 'bg-primary/8 enabled:hover:bg-primary/10',
                      outside && !selected && 'bg-canvas/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 items-center justify-center rounded-full text-sm tabular-nums',
                        outside || past ? 'text-muted/70' : 'text-ink',
                        day === today && 'font-semibold text-primary ring-1 ring-primary/40',
                        edge && 'bg-primary font-semibold text-surface ring-0',
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                    <span aria-hidden="true" className="grid w-full gap-0.5">
                      {segments.slice(0, SHOWN).map((segment) => (
                        <span
                          key={segment.block.id}
                          className={cn(
                            'block h-1 truncate rounded-full text-xs leading-4 font-medium sm:h-auto sm:px-1.5 sm:py-0.5',
                            BLOCK_TONES[segment.block.reason],
                            segment.continuesBefore && 'sm:rounded-l-none',
                            segment.continuesAfter && 'sm:rounded-r-none',
                            past && 'opacity-60',
                          )}
                        >
                          <span className="hidden sm:inline">{blockLabel(segment.block)}</span>
                        </span>
                      ))}
                      {segments.length > SHOWN && (
                        <span className="hidden text-xs text-muted sm:block">
                          +{segments.length - SHOWN} more
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
