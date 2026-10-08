import { CalendarRange } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import { RANGE_CHOICES, type DateRangeState, type RangeChoice } from './date-range';

/**
 * A preset range (last 7 or 30 days, this or last month) or custom From and To days. The days of a
 * preset show in the pickers too, and changing either day makes the range custom.
 */
export function DateRangeControl({
  range,
  choice,
  maxDays,
  choosePreset,
  chooseDates,
  className,
}: DateRangeState & { className?: string }) {
  const choose = (value: RangeChoice) => (value === 'custom' ? chooseDates(range) : choosePreset(value));

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">Dates</legend>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Dates">
          <Select
            value={choice}
            onChange={(value) => choose(value as RangeChoice)}
            options={RANGE_CHOICES}
            icon={<CalendarRange />}
            listLabel="Date ranges"
          />
        </Field>
        <Field label="From">
          <DatePicker
            value={range.from}
            onChange={(from) => chooseDates({ from, to: range.to }, 'from')}
            calendarLabel="Choose the first day"
          />
        </Field>
        <Field label="To">
          <DatePicker
            value={range.to}
            onChange={(to) => chooseDates({ from: range.from, to }, 'to')}
            calendarLabel="Choose the last day"
            align="end"
          />
        </Field>
      </div>
      <p className="mt-2 text-xs text-muted">
        Days in New Zealand time, both included, up to {formatNumber(maxDays)} at a time.
      </p>
    </fieldset>
  );
}
