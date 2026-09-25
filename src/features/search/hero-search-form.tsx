import { Clock, MapPin, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import { toDateInputValue } from '@/lib/dates';
import { NZ_PLACE_SUGGESTIONS } from './nz-places';
import { defaultSearchValues, searchResolver, searchUrl, type SearchValues } from './search-validation';

export interface SearchPrefill {
  where: string;
  /** Changes on every request, so choosing the same destination twice still refocuses the form. */
  nonce: number;
}

const dateInputClasses = 'min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left';

export function HeroSearchForm({ prefill, className }: { prefill?: SearchPrefill; className?: string }) {
  const navigate = useNavigate();
  const [defaults] = useState(() => defaultSearchValues());
  const [today] = useState(() => toDateInputValue(new Date()));
  const {
    register,
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
  const pickupDate = useWatch({ control, name: 'pickupDate' });

  useEffect(() => {
    if (!prefill) return;
    setValue('where', prefill.where, { shouldValidate: true, shouldDirty: true });
    setFocus('pickupDate');
  }, [prefill, setValue, setFocus]);

  const onSubmit = handleSubmit((values) => navigate(searchUrl(values), { viewTransition: true }));

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="search-heading"
      className={cn('rounded-sheet bg-surface p-5 text-ink shadow-lift sm:p-6', className)}
    >
      <h2 id="search-heading" className="headline text-2xl font-medium">
        Find your car
      </h2>

      <div className="mt-5 grid gap-4">
        <Field label="Where are you going?" error={errors.where?.message}>
          <Input
            leadingIcon={<MapPin />}
            list="nz-place-suggestions"
            placeholder="City, airport or destination"
            autoComplete="off"
            enterKeyHint="next"
            {...register('where')}
          />
        </Field>
        <datalist id="nz-place-suggestions">
          {NZ_PLACE_SUGGESTIONS.map((place) => (
            <option key={place} value={place} />
          ))}
        </datalist>

        {/* Side by side on tablets; stacked beside the headline on desktop, so dates never get cut off. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Pick-up</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-2">
              <Field label="Pick-up date" hideLabel error={errors.pickupDate?.message}>
                <Input type="date" min={today} className={dateInputClasses} {...register('pickupDate')} />
              </Field>
              <Field label="Pick-up time" hideLabel error={errors.pickupTime?.message}>
                <Input type="time" step={900} className={dateInputClasses} {...register('pickupTime')} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="grid min-w-0 gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Return</legend>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] items-start gap-2">
              <Field label="Return date" hideLabel error={errors.returnDate?.message}>
                <Input
                  type="date"
                  min={pickupDate || today}
                  className={dateInputClasses}
                  {...register('returnDate')}
                />
              </Field>
              <Field label="Return time" hideLabel error={errors.returnTime?.message}>
                <Input type="time" step={900} className={dateInputClasses} {...register('returnTime')} />
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
  );
}
