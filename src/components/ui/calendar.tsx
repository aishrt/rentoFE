import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import {
  addDays,
  addMonths,
  clampDateValue,
  formatFullDate,
  formatMonthYear,
  parseDateValue,
  toDateInputValue,
  weekdayIndex,
  WEEKDAYS,
} from '@/lib/dates';
import { IconButton } from './icon-button';

interface CalendarProps {
  /** The chosen day as "2026-10-12", or empty. */
  value: string;
  onSelect: (value: string) => void;
  /** The earliest and latest days that can be chosen, in the same format. */
  min?: string;
  max?: string;
  /** A trip to show as a band from start to end, such as pick-up to return. */
  range?: readonly [start: string, end: string];
  /** Puts keyboard focus on the chosen (or first available) day when the calendar appears. */
  autoFocus?: boolean;
  className?: string;
}

/** The month's days in rows of seven, Monday first. Always six rows, so the calendar keeps its height. */
function monthRows(month: Date): (string | null)[][] {
  const year = month.getFullYear();
  const index = month.getMonth();
  const offset = weekdayIndex(new Date(year, index, 1));
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, column) => {
      const date = new Date(year, index, row * 7 + column - offset + 1);
      return date.getMonth() === index ? toDateInputValue(date) : null;
    }),
  );
}

const dayClasses = cn(
  'relative flex aspect-square w-full items-center justify-center rounded-full text-sm tabular-nums text-ink',
  'transition-[background-color,color,scale] duration-120 ease-out enabled:active:scale-94',
  'enabled:hover:bg-primary/10 enabled:hover:text-primary',
  'disabled:cursor-not-allowed disabled:text-muted/45',
);

/**
 * A month grid for choosing a day, used by DatePicker. Arrow keys move by day and week, Home and End to the
 * week's ends, Page Up and Page Down by month (with Shift, by year), and Enter chooses (the WAI-ARIA date
 * picker pattern). Today is marked with a dot.
 */
export function Calendar({ value, onSelect, min, max, range, autoFocus = false, className }: CalendarProps) {
  const headingId = useId();
  const [today] = useState(() => toDateInputValue(new Date()));
  const [focused, setFocused] = useState(() =>
    clampDateValue(parseDateValue(value) ? value : today, min, max),
  );
  const gridRef = useRef<HTMLDivElement>(null);
  // Whether keyboard focus should follow `focused`: on opening and after arrow keys, not after the month buttons.
  const focusFollows = useRef(autoFocus);

  useEffect(() => {
    if (focusFollows.current) gridRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [focused]);

  const focusedDate = parseDateValue(focused) ?? new Date();
  const month = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1);
  const canGoBack = !min || toDateInputValue(addDays(month, -1)) >= min;
  const canGoForward = !max || toDateInputValue(addMonths(month, 1)) <= max;
  const [rangeStart, rangeEnd] = range && range[0] && range[0] < range[1] ? range : [];

  const moveTo = (date: Date, byKeyboard: boolean) => {
    focusFollows.current = byKeyboard;
    setFocused(clampDateValue(toDateInputValue(date), min, max));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const weekday = weekdayIndex(focusedDate);
    const months = event.shiftKey ? 12 : 1;
    const moves: Record<string, (() => Date) | undefined> = {
      ArrowLeft: () => addDays(focusedDate, -1),
      ArrowRight: () => addDays(focusedDate, 1),
      ArrowUp: () => addDays(focusedDate, -7),
      ArrowDown: () => addDays(focusedDate, 7),
      Home: () => addDays(focusedDate, -weekday),
      End: () => addDays(focusedDate, 6 - weekday),
      PageUp: () => addMonths(focusedDate, -months),
      PageDown: () => addMonths(focusedDate, months),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    moveTo(move(), true);
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2">
        <p id={headingId} aria-live="polite" className="headline pl-2 text-lg font-medium">
          {formatMonthYear(month)}
        </p>
        <div className="flex">
          <IconButton
            label="Previous month"
            tooltip="none"
            disabled={!canGoBack}
            onClick={() => moveTo(addMonths(focusedDate, -1), false)}
          >
            <ChevronLeft aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Next month"
            tooltip="none"
            disabled={!canGoForward}
            onClick={() => moveTo(addMonths(focusedDate, 1), false)}
          >
            <ChevronRight aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div ref={gridRef} role="grid" aria-labelledby={headingId} onKeyDown={onKeyDown} className="mt-1">
        <div role="row" className="grid grid-cols-7">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              role="columnheader"
              aria-label={weekday}
              className="flex h-8 items-center justify-center text-xs font-medium text-muted"
            >
              <span aria-hidden="true">{weekday.slice(0, 2)}</span>
            </div>
          ))}
        </div>

        {/* Keyed by month, so a new month fades in. */}
        <div key={focused.slice(0, 7)} role="rowgroup" className="grid animate-fade-in gap-y-1">
          {monthRows(month).map((week, row) => (
            <div key={row} role="row" className="grid grid-cols-7">
              {week.map((day, column) => {
                if (!day) return <div key={column} role="gridcell" />;
                const selected = day === value;
                const isToday = day === today;
                const disabled = Boolean((min && day < min) || (max && day > max));
                const inRange = Boolean(rangeStart && rangeEnd && day > rangeStart && day < rangeEnd);
                const isStart = day === rangeStart;
                const isEnd = day === rangeEnd;
                return (
                  <div
                    key={day}
                    role="gridcell"
                    aria-selected={selected}
                    className={cn(
                      // The trip band runs behind the days, from the middle of the first to the middle of the last.
                      inRange && 'bg-primary/8',
                      isStart && 'bg-linear-to-r from-transparent from-50% to-primary/8 to-50%',
                      isEnd && 'bg-linear-to-l from-transparent from-50% to-primary/8 to-50%',
                      (inRange || isStart || isEnd) && column === 0 && 'rounded-l-full',
                      (inRange || isStart || isEnd) && column === 6 && 'rounded-r-full',
                    )}
                  >
                    <button
                      type="button"
                      tabIndex={day === focused ? 0 : -1}
                      disabled={disabled}
                      aria-label={formatFullDate(day)}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => onSelect(day)}
                      className={cn(
                        dayClasses,
                        isToday &&
                          'font-semibold text-primary after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-current',
                        (isStart || isEnd) &&
                          'bg-surface font-semibold text-primary ring-1 ring-primary/45 ring-inset',
                        selected &&
                          'bg-primary font-semibold text-surface ring-0 inset-shadow-highlight enabled:hover:bg-primary-hover enabled:hover:text-surface',
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
