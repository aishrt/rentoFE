import { CalendarDays } from 'lucide-react';
import { useRef, useState, type Ref } from 'react';
import { assignRef } from '@/lib/assign-ref';
import { formatDateValue } from '@/lib/dates';
import { Calendar } from './calendar';
import { PickerTrigger } from './picker-trigger';
import { Popover } from './popover';

interface DatePickerProps {
  /** The chosen day as "2026-10-12" (the format of <input type="date">), or empty. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: string;
  max?: string;
  /** A trip to show in the calendar as a band, such as pick-up to return. */
  range?: readonly [start: string, end: string];
  placeholder?: string;
  /** Names the calendar for screen readers, e.g. "Choose a pick-up date". */
  calendarLabel?: string;
  align?: 'start' | 'end';
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * A date field that opens a calendar. Works in a Field and with react-hook-form's Controller (pass
 * `field.ref`, so `setFocus` reaches the button). Choosing a day, or Escape, closes the calendar and puts
 * focus back on the field.
 */
export function DatePicker({
  value,
  onChange,
  onBlur,
  min,
  max,
  range,
  placeholder = 'Choose a date',
  calendarLabel = 'Choose a date',
  align,
  ref,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const choose = (day: string) => {
    onChange(day);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <PickerTrigger
        {...props}
        ref={(node) => {
          triggerRef.current = node;
          assignRef(ref, node);
        }}
        icon={<CalendarDays />}
        open={open}
        aria-haspopup="dialog"
        display={formatDateValue(value)}
        placeholder={placeholder}
        onClick={() => setOpen((current) => !current)}
        onBlur={onBlur}
      />
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchorRef={triggerRef}
        returnFocusRef={triggerRef}
        align={align}
        trapFocus
        role="dialog"
        aria-label={calendarLabel}
        className="w-[min(21rem,calc(100vw-1rem))] p-3"
      >
        <Calendar value={value} onSelect={choose} min={min} max={max} range={range} autoFocus />
      </Popover>
    </>
  );
}
