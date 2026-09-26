import { Clock } from 'lucide-react';
import { useMemo } from 'react';
import { formatTimeValue } from '@/lib/dates';
import { Select, type SelectOption, type SelectProps } from './select';

type TimePickerProps = Omit<SelectProps, 'options' | 'icon' | 'chevron' | 'listLabel'> & {
  /** Minutes between the times offered. */
  step?: number;
  /** Names the list for screen readers. */
  listLabel?: string;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** Every time of day at the step, plus the current value if it falls between steps (e.g. from a link). */
function timeOptions(step: number, current: string): SelectOption[] {
  const values: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += step) {
    values.push(`${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`);
  }
  if (/^\d{2}:\d{2}$/.test(current) && !values.includes(current)) values.push(current);
  return values.sort().map((value) => ({ value, label: formatTimeValue(value) }));
}

/**
 * A time field with a list of times ("10:00 am"), as "HH:MM" values in the format of <input type="time">.
 * Built on Select, so it opens, moves and chooses the same way; typing "2" jumps to 2:00 am.
 */
export function TimePicker({
  step = 30,
  value,
  placeholder = 'Time',
  listLabel = 'Times',
  ...props
}: TimePickerProps) {
  const options = useMemo(() => timeOptions(step, value), [step, value]);
  return (
    <Select
      {...props}
      value={value}
      options={options}
      icon={<Clock />}
      chevron={false}
      placeholder={placeholder}
      listLabel={listLabel}
    />
  );
}
