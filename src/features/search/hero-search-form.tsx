import { Clock, MapPin, Plane, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { IconButton } from '@/components/ui/icon-button';
import { TimePicker } from '@/components/ui/time-picker';
import { cn } from '@/lib/cn';
import { toDateInputValue } from '@/lib/dates';
import { NZ_PLACE_SUGGESTIONS } from './nz-places';
import { defaultSearchValues, searchResolver, searchUrl, type SearchValues } from './search-validation';

export interface SearchPrefill {
  where: string;
  /** Changes on every request, so choosing the same destination twice still refocuses the form. */
  nonce: number;
}

const placeIcon = (place: string) => (place.includes('Airport') ? <Plane /> : <MapPin />);

// The legend above each date-and-time pair turns blue while either of its pickers has focus or is open.
const legendClasses = cn(
  'mb-1.5 text-sm font-medium transition-colors duration-120',
  'group-has-[button[aria-haspopup]:focus-visible]/pair:text-primary group-has-[[aria-expanded=true]]/pair:text-primary',
);

export function HeroSearchForm({ prefill, className }: { prefill?: SearchPrefill; className?: string }) {
  const navigate = useNavigate();
  const [defaults] = useState(() => defaultSearchValues());
  const [today] = useState(() => toDateInputValue(new Date()));
  const {
    handleSubmit,
    setValue,
    setFocus,
    control,
    formState: { errors },
  } = useForm<SearchValues>({
    resolver: searchResolver,
    defaultValues: defaults,
    mode: 'onTouched',
  });
  const [where, pickupDate, returnDate] = useWatch({ control, name: ['where', 'pickupDate', 'returnDate'] });
  const trip = [pickupDate, returnDate] as const;

  useEffect(() => {
    if (!prefill) return;
    setValue('where', prefill.where, { shouldValidate: true, shouldDirty: true });
    setFocus('pickupDate');
  }, [prefill, setValue, setFocus]);

  const clearWhere = () => {
    setValue('where', '', { shouldDirty: true });
    setFocus('where');
  };

  const onSubmit = handleSubmit((values) => navigate(searchUrl(values), { viewTransition: true }));

  return (
    <Card asChild variant="raised" className={cn('p-5 text-ink sm:p-6', className)}>
      <form noValidate onSubmit={onSubmit} aria-labelledby="search-heading">
        <h2 id="search-heading" className="headline text-2xl font-medium">
          Find your car
        </h2>

        <div className="mt-5 grid gap-4">
          <Field label="Where are you going?" error={errors.where?.message}>
            <Controller
              control={control}
              name="where"
              render={({ field }) => (
                <Combobox
                  ref={field.ref}
                  name={field.name}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  options={NZ_PLACE_SUGGESTIONS}
                  optionIcon={placeIcon}
                  listLabel="Popular destinations"
                  leadingIcon={<MapPin />}
                  trailing={
                    // Always rendered so the input never remounts; hidden (and out of the tab order) when empty.
                    <IconButton
                      size="inset"
                      label="Clear location"
                      onClick={clearWhere}
                      className={cn(
                        'transition-[opacity,scale,visibility,background-color,color]',
                        where ? 'visible opacity-100' : 'invisible scale-90 opacity-0',
                      )}
                    >
                      <X aria-hidden="true" />
                    </IconButton>
                  }
                  placeholder="City, airport or destination"
                  enterKeyHint="next"
                />
              )}
            />
          </Field>

          {/* Side by side on tablets; stacked beside the headline on desktop, so dates never get cut off. */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <fieldset className="group/pair grid min-w-0 gap-1.5">
              <legend className={legendClasses}>Pick-up</legend>
              <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-2">
                <Field label="Pick-up date" hideLabel error={errors.pickupDate?.message}>
                  <Controller
                    control={control}
                    name="pickupDate"
                    render={({ field }) => (
                      <DatePicker
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        min={today}
                        range={trip}
                        calendarLabel="Choose a pick-up date"
                      />
                    )}
                  />
                </Field>
                <Field label="Pick-up time" hideLabel error={errors.pickupTime?.message}>
                  <Controller
                    control={control}
                    name="pickupTime"
                    render={({ field }) => (
                      <TimePicker
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        align="end"
                        listLabel="Pick-up times"
                      />
                    )}
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="group/pair grid min-w-0 gap-1.5">
              <legend className={legendClasses}>Return</legend>
              <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-2">
                <Field label="Return date" hideLabel error={errors.returnDate?.message}>
                  <Controller
                    control={control}
                    name="returnDate"
                    render={({ field }) => (
                      <DatePicker
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        min={pickupDate || today}
                        range={trip}
                        calendarLabel="Choose a return date"
                      />
                    )}
                  />
                </Field>
                <Field label="Return time" hideLabel error={errors.returnTime?.message}>
                  <Controller
                    control={control}
                    name="returnTime"
                    render={({ field }) => (
                      <TimePicker
                        ref={field.ref}
                        name={field.name}
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        align="end"
                        listLabel="Return times"
                      />
                    )}
                  />
                </Field>
              </div>
            </fieldset>
          </div>

          <Button type="submit" size="lg" block className="mt-1">
            <Search aria-hidden="true" />
            Search Cars
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Clock aria-hidden="true" className="size-3.5" />
            Dates and times are in NZ time.
          </p>
        </div>
      </form>
    </Card>
  );
}
