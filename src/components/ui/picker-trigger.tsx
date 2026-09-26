import { ChevronDown } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { controlClasses } from './control-styles';
import { useFieldControl } from './field-context';

type PickerTriggerProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Shown on the left, like an Input's `leadingIcon`. */
  icon: ReactNode;
  open: boolean;
  /** The chosen value as text; the placeholder shows while it is empty. */
  display?: string;
  placeholder: string;
  /** A chevron on the right that turns while open, for general selects. */
  chevron?: boolean;
};

/**
 * The button that opens a picker (DatePicker, TimePicker, Select), styled to match Input. Inside a Field it is
 * named by the field's label and its current value, so a screen reader hears "Pick-up date, Sun, 27 Sep".
 */
export function PickerTrigger({
  icon,
  open,
  display,
  placeholder,
  chevron = false,
  className,
  id,
  ...props
}: PickerTriggerProps) {
  const field = useFieldControl();
  const valueId = useId();
  const labelledBy = props['aria-label'] ? undefined : [field?.labelId, valueId].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      id={id ?? field?.id}
      aria-expanded={open}
      aria-labelledby={labelledBy}
      aria-invalid={field?.invalid || undefined}
      aria-describedby={field?.describedBy}
      {...props}
      className={cn(
        controlClasses,
        'group/trigger relative flex items-center pl-11 text-left',
        'aria-expanded:border-primary aria-expanded:ring-4 aria-expanded:ring-primary/12',
        chevron && 'pr-10',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted transition-colors duration-120 group-focus-visible/trigger:text-primary group-aria-expanded/trigger:text-primary [&_svg]:size-4.5"
      >
        {icon}
      </span>
      <span id={valueId} className={cn('min-w-0 flex-1 truncate', !display && 'text-muted/75')}>
        {display || placeholder}
      </span>
      {chevron && (
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 size-4 text-muted transition-[rotate] duration-200 ease-out group-aria-expanded/trigger:rotate-180"
        />
      )}
    </button>
  );
}
