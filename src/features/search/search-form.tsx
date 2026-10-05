import { Clock, Search } from 'lucide-react';
import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/cn';
import { toDateInputValue } from '@/lib/dates';
import { LocationAutocomplete } from './location-autocomplete';
import {
  SEARCH_FIELDS,
  defaultSearchValues,
  movePickupDate,
  searchUrl,
  validateSearch,
  type SearchField,
  type SearchValues,
} from './search-validation';

// The legend above each date-and-time pair turns blue while either of its pickers has focus or is open.
const pairLegendClasses = cn(
  'mb-1.5 text-sm font-medium transition-colors duration-120',
  'group-has-[button[aria-haspopup]:focus-visible]/pair:text-primary group-has-[[aria-expanded=true]]/pair:text-primary',
);

interface SearchFormProps {
  /** Starting values, e.g. the current search on the results page or a destination's city. */
  initial?: Partial<SearchValues>;
  /**
   * `hero`: stacked, with the date pairs side by side on tablets (homepage, destination pages).
   * `sheet`: stacked in one column (phones' search sheet). `inline`: one row on desktop results pages.
   */
  layout?: 'hero' | 'sheet' | 'inline';
  /** On results pages the place is optional (all of NZ) and so are the dates (Browse Cars). */
  optional?: boolean;
  /** Filters and sort to keep when the search changes on the results page. */
  keepParams?: URLSearchParams;
  submitLabel?: string;
  /** Called after a valid search, e.g. to close the sheet it's in. */
  onSubmitted?: () => void;
  /** A heading inside the form, above the fields. */
  heading?: ReactNode;
  className?: string;
  'aria-labelledby'?: string;
}

/**
 * The trip search (spec §4): where, pick-up date and time, return date and time. Checked as you go, like the
 * site's other forms: a field shows its error once you've left it, and every field after the first submit;
 * the first one with an error takes focus. Written with plain state instead of react-hook-form, which saves
 * the homepage about 11 KB of JavaScript (plan §12.5).
 */
export function SearchForm({
  initial,
  layout = 'hero',
  optional = false,
  keepParams,
  submitLabel = 'Search Cars',
  onSubmitted,
  heading,
  className,
  'aria-labelledby': labelledBy,
}: SearchFormProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SearchValues>(() => ({ ...defaultSearchValues(), ...initial }));
  const [today] = useState(() => toDateInputValue(new Date()));
  const [touched, setTouched] = useState<Partial<Record<SearchField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const whereRef = useRef<HTMLInputElement>(null);
  const pickupDateRef = useRef<HTMLButtonElement>(null);
  const pickupTimeRef = useRef<HTMLButtonElement>(null);
  const returnDateRef = useRef<HTMLButtonElement>(null);
  const returnTimeRef = useRef<HTMLButtonElement>(null);
  const fieldRefs = {
    where: whereRef,
    pickupDate: pickupDateRef,
    pickupTime: pickupTimeRef,
    returnDate: returnDateRef,
    returnTime: returnTimeRef,
  };
  const errors = validateSearch(values, { requirePlace: !optional, requireDates: !optional });
  const trip = [values.pickupDate, values.returnDate] as const;
  const inline = layout === 'inline';

  const errorFor = (field: SearchField) => (submitted || touched[field] ? errors[field] : undefined);
  const touch = (field: SearchField) =>
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }));
  const set = <Key extends keyof SearchValues>(key: Key, value: SearchValues[Key]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    const firstError = SEARCH_FIELDS.find((field) => errors[field]);
    if (firstError) {
      fieldRefs[firstError].current?.focus();
      return;
    }
    navigate(searchUrl(values, keepParams), { viewTransition: !inline });
    onSubmitted?.();
  };

  const datePair = (kind: 'pickup' | 'return') => {
    const pickup = kind === 'pickup';
    const dateField: SearchField = pickup ? 'pickupDate' : 'returnDate';
    const timeField: SearchField = pickup ? 'pickupTime' : 'returnTime';
    const noun = pickup ? 'Pick-up' : 'Return';
    return (
      <fieldset className="group/pair grid min-w-0 gap-1.5">
        <legend className={pairLegendClasses}>{noun}</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-2">
          <Field label={`${noun} date`} hideLabel error={errorFor(dateField)}>
            <DatePicker
              ref={pickup ? pickupDateRef : returnDateRef}
              name={dateField}
              value={values[dateField]}
              onChange={(date) =>
                pickup ? setValues((current) => movePickupDate(current, date)) : set('returnDate', date)
              }
              onBlur={() => touch(dateField)}
              min={pickup ? today : values.pickupDate || today}
              range={trip}
              placeholder={optional ? 'Add date' : undefined}
              calendarLabel={pickup ? 'Choose a pick-up date' : 'Choose a return date'}
            />
          </Field>
          <Field label={`${noun} time`} hideLabel error={errorFor(timeField)}>
            <TimePicker
              ref={pickup ? pickupTimeRef : returnTimeRef}
              name={timeField}
              value={values[timeField]}
              onChange={(time) => set(timeField, time)}
              onBlur={() => touch(timeField)}
              align="end"
              listLabel={pickup ? 'Pick-up times' : 'Return times'}
            />
          </Field>
        </div>
      </fieldset>
    );
  };

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={labelledBy} className={className}>
      {heading}
      <div
        className={cn(
          'grid gap-4',
          heading && 'mt-5',
          inline &&
            'items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)_auto]',
        )}
      >
        <Field
          label="Where are you going?"
          error={errorFor('where')}
          className={cn(inline && 'lg:col-span-3 xl:col-span-1')}
        >
          <LocationAutocomplete
            ref={whereRef}
            name="where"
            value={values.place}
            onValueChange={(place) => set('place', place)}
            onBlur={() => touch('where')}
            placeholder={optional ? 'All of New Zealand' : undefined}
            enterKeyHint="next"
          />
        </Field>

        {inline ? (
          <>
            {datePair('pickup')}
            {datePair('return')}
            <Button type="submit" className="lg:mt-6.5 lg:h-12">
              <Search aria-hidden="true" />
              {submitLabel}
            </Button>
          </>
        ) : (
          <>
            {/* Side by side on tablets; stacked beside the headline on desktop, so dates never get cut off. */}
            <div className={cn('grid gap-4', layout === 'hero' && 'sm:grid-cols-2 lg:grid-cols-1')}>
              {datePair('pickup')}
              {datePair('return')}
            </div>
            <Button type="submit" size="lg" block className="mt-1">
              <Search aria-hidden="true" />
              {submitLabel}
            </Button>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Clock aria-hidden="true" className="size-3.5" />
              Dates and times are in NZ time.
            </p>
          </>
        )}
      </div>
    </form>
  );
}
