import { Calendar, Car, Check, Tags } from 'lucide-react';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { BODY_TYPE_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from '@/features/vehicles/vehicle-format';
import { cn } from '@/lib/cn';
import { formatNzdFromCents } from '@/lib/format';
import { BODY_TYPES, FUEL_TYPES, PRICE_RANGE, type SearchFilters } from './search-params';
import { usePolicies } from '@/features/content/content-api';
import { useVehicleMakes } from './search-queries';

// Worked out once per page load; a filter list doesn't need to notice New Year.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 2 - 2000 }, (_, index) => THIS_YEAR + 1 - index);
const DEFAULT_RADIUS = { min: 5, default: 25, max: 300 };

const chipClasses = (on: boolean) =>
  cn(
    'inline-flex min-h-11 select-none items-center gap-1.5 rounded-full border px-4 text-sm font-medium',
    'transition-[background-color,border-color,color,scale] duration-120 ease-out active:scale-96',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
    on ? 'border-primary bg-primary/8 text-primary' : 'border-line bg-surface text-ink hover:border-ink/30',
  );

function FilterSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: (headingId: string) => ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 id={headingId} className="text-sm font-semibold text-ink">
        {title}
      </h3>
      {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      <div className="mt-3">{children(headingId)}</div>
    </section>
  );
}

/** Several can be on at once, e.g. SUV and wagon. Each chip is a toggle button. */
function ToggleChips<Value extends string>({
  labelledBy,
  options,
  selected,
  onChange,
}: {
  labelledBy: string;
  options: readonly { value: Value; label: string }[];
  selected: readonly Value[];
  onChange: (next: Value[]) => void;
}) {
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const on = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() =>
              onChange(on ? selected.filter((value) => value !== option.value) : [...selected, option.value])
            }
            className={chipClasses(on)}
          >
            {on && <Check aria-hidden="true" className="-ml-1 size-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** One of a few, e.g. Any, Automatic or Manual: a radio group, so arrow keys move between them. */
function ChoiceChips<Value extends string | number>({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: readonly { value: Value | undefined; label: string }[];
  value: Value | undefined;
  onChange: (value: Value | undefined) => void;
}) {
  const current = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = (current + step + options.length) % options.length;
    onChange(options[next]?.value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {options.map((option, index) => {
        const on = index === current;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={chipClasses(on)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A slider that moves freely while it's dragged and changes the search once it's let go. The draft belongs
 * to the values it started from, so it gives way as soon as the search catches up.
 */
function useSliderDraft(committed: number[]) {
  const key = committed.join(',');
  const [draft, setDraft] = useState<{ base: string; value: number[] } | null>(null);
  const value = draft && draft.base === key ? draft.value : committed;
  return [value, (next: number[]) => setDraft({ base: key, value: next })] as const;
}

const dollars = (cents: number) => formatNzdFromCents(cents);

function PriceFilter({ filters, onChange }: Pick<FilterPanelProps, 'filters' | 'onChange'>) {
  const [value, setValue] = useSliderDraft([
    filters.minDailyCents ?? PRICE_RANGE.min,
    filters.maxDailyCents ?? PRICE_RANGE.max,
  ]);
  const [low = PRICE_RANGE.min, high = PRICE_RANGE.max] = value;
  const topLabel = (cents: number) => (cents >= PRICE_RANGE.max ? `${dollars(cents)}+` : dollars(cents));

  return (
    <FilterSection title="Price per day">
      {() => (
        <>
          <p className="text-sm text-ink tabular-nums" aria-hidden="true">
            {dollars(low)} – {topLabel(high)}
          </p>
          <Slider
            className="mt-1"
            value={value}
            min={PRICE_RANGE.min}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
            thumbLabels={['Lowest price per day', 'Highest price per day']}
            formatValue={(cents) => `${topLabel(cents)} a day`}
            onValueChange={setValue}
            onValueCommit={([min = PRICE_RANGE.min, max = PRICE_RANGE.max]) =>
              onChange({
                minDailyCents: min > PRICE_RANGE.min ? min : undefined,
                maxDailyCents: max < PRICE_RANGE.max ? max : undefined,
              })
            }
          />
        </>
      )}
    </FilterSection>
  );
}

function RadiusFilter({
  filters,
  onChange,
  placeLabel,
}: Pick<FilterPanelProps, 'filters' | 'onChange' | 'placeLabel'>) {
  const policies = usePolicies();
  const range = policies.data?.search.radiusKm ?? DEFAULT_RADIUS;
  const [value, setValue] = useSliderDraft([filters.radiusKm ?? range.default]);
  const radius = value[0] ?? range.default;
  const disabled = !placeLabel;

  return (
    <FilterSection
      title="Distance"
      description={disabled ? 'Choose a place to search around it.' : `Within ${radius} km of ${placeLabel}`}
    >
      {() => (
        <Slider
          value={value}
          min={range.min}
          max={range.max}
          step={5}
          disabled={disabled}
          thumbLabels={['Search radius']}
          formatValue={(km) => `${km} kilometres`}
          onValueChange={setValue}
          onValueCommit={([km]) => onChange({ radiusKm: km === range.default ? undefined : km })}
        />
      )}
    </FilterSection>
  );
}

function MakeModelFilter({ filters, onChange }: Pick<FilterPanelProps, 'filters' | 'onChange'>) {
  const makes = useVehicleMakes();
  const makeOptions = [
    { value: '', label: 'Any make' },
    ...(makes.data ?? []).map(({ make }) => ({ value: make, label: make })),
  ];
  // Keep a make from the URL listed even before the list loads, or if no live car has it any more.
  if (filters.make && !makeOptions.some((option) => option.value === filters.make))
    makeOptions.push({ value: filters.make, label: filters.make });
  const models = makes.data?.find(({ make }) => make === filters.make)?.models ?? [];
  const modelOptions = [
    { value: '', label: 'Any model' },
    ...models.map((model) => ({ value: model, label: model })),
  ];
  if (filters.model && !models.includes(filters.model))
    modelOptions.push({ value: filters.model, label: filters.model });

  return (
    <FilterSection title="Make and model">
      {() => (
        <div className="grid gap-3">
          <Field label="Make" hideLabel>
            <Select
              value={filters.make ?? ''}
              onChange={(make) => onChange({ make: make || undefined, model: undefined })}
              options={makeOptions}
              icon={<Car />}
              listLabel="Makes"
            />
          </Field>
          <Field label="Model" hideLabel>
            <Select
              value={filters.model ?? ''}
              onChange={(model) => onChange({ model: model || undefined })}
              options={modelOptions}
              icon={<Tags />}
              listLabel="Models"
              disabled={!filters.make}
            />
          </Field>
        </div>
      )}
    </FilterSection>
  );
}

function YearFilter({ filters, onChange }: Pick<FilterPanelProps, 'filters' | 'onChange'>) {
  const options = (any: string) => [
    { value: '', label: any },
    ...YEARS.map((year) => ({ value: String(year), label: String(year) })),
  ];
  const toYear = (value: string) => (value ? Number(value) : undefined);

  return (
    <FilterSection title="Year">
      {() => (
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Select
              value={filters.minYear ? String(filters.minYear) : ''}
              onChange={(value) => onChange({ minYear: toYear(value) })}
              options={options('Any')}
              icon={<Calendar />}
              listLabel="Oldest year"
            />
          </Field>
          <Field label="To">
            <Select
              value={filters.maxYear ? String(filters.maxYear) : ''}
              onChange={(value) => onChange({ maxYear: toYear(value) })}
              options={options('Any')}
              icon={<Calendar />}
              listLabel="Newest year"
              align="end"
            />
          </Field>
        </div>
      )}
    </FilterSection>
  );
}

const bodyTypeOptions = BODY_TYPES.map((value) => ({ value, label: BODY_TYPE_LABELS[value] }));
const fuelOptions = FUEL_TYPES.map((value) => ({ value, label: FUEL_LABELS[value] }));
const transmissionOptions = [
  { value: undefined, label: 'Any' },
  { value: 'AUTOMATIC' as const, label: TRANSMISSION_LABELS.AUTOMATIC },
  { value: 'MANUAL' as const, label: TRANSMISSION_LABELS.MANUAL },
];
const seatOptions = [
  { value: undefined, label: 'Any' },
  ...[2, 4, 5, 7, 8].map((seats) => ({ value: seats, label: `${seats}+` })),
];
const ratingOptions = [
  { value: undefined, label: 'Any' },
  ...[3, 4, 4.5].map((stars) => ({ value: stars, label: `${stars}+ stars` })),
];

interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (patch: Partial<SearchFilters>) => void;
  /** The searched place, which the distance filter measures from. None: all of NZ. */
  placeLabel?: string;
  className?: string;
}

/**
 * Every search filter in spec §5: price range, location and radius, vehicle type, make and model, year,
 * automatic or manual, seats, fuel type, hybrid or EV, airport delivery, delivery, Instant Book, minimum
 * rating, unlimited kilometres, pet friendly and child seat. Each change applies straight away (the results
 * update behind the panel); sliders apply once they're let go.
 */
export function FilterPanel({ filters, onChange, placeLabel, className }: FilterPanelProps) {
  return (
    <div className={className}>
      <PriceFilter filters={filters} onChange={onChange} />
      <RadiusFilter filters={filters} onChange={onChange} placeLabel={placeLabel} />

      <FilterSection title="Vehicle type">
        {(headingId) => (
          <ToggleChips
            labelledBy={headingId}
            options={bodyTypeOptions}
            selected={filters.types}
            onChange={(types) => onChange({ types })}
          />
        )}
      </FilterSection>

      <MakeModelFilter filters={filters} onChange={onChange} />
      <YearFilter filters={filters} onChange={onChange} />

      <FilterSection title="Transmission">
        {(headingId) => (
          <ChoiceChips
            labelledBy={headingId}
            options={transmissionOptions}
            value={filters.transmission}
            onChange={(transmission) => onChange({ transmission })}
          />
        )}
      </FilterSection>

      <FilterSection title="Seats">
        {(headingId) => (
          <ChoiceChips
            labelledBy={headingId}
            options={seatOptions}
            value={filters.minSeats}
            onChange={(minSeats) => onChange({ minSeats })}
          />
        )}
      </FilterSection>

      <FilterSection title="Fuel type">
        {(headingId) => (
          <>
            <ToggleChips
              labelledBy={headingId}
              options={fuelOptions}
              selected={filters.fuel}
              onChange={(fuel) => onChange({ fuel })}
            />
            <Switch
              className="mt-3"
              label="Hybrid or electric"
              description="Hybrids, plug-in hybrids and EVs"
              checked={filters.electrified}
              onCheckedChange={(electrified) => onChange({ electrified })}
            />
          </>
        )}
      </FilterSection>

      <FilterSection title="Booking and delivery">
        {() => (
          <div className="grid gap-1">
            <Switch
              label="Instant Book"
              description="Booked straight away, without waiting for the host"
              checked={filters.instantBook}
              onCheckedChange={(instantBook) => onChange({ instantBook })}
            />
            <Switch
              label="Delivery available"
              description="The host can bring the car to you"
              checked={filters.delivery}
              onCheckedChange={(delivery) => onChange({ delivery })}
            />
            <Switch
              label="Airport delivery"
              description="Waiting for you at the airport"
              checked={filters.airportDelivery}
              onCheckedChange={(airportDelivery) => onChange({ airportDelivery })}
            />
          </div>
        )}
      </FilterSection>

      <FilterSection title="Minimum rating" description="Cars without reviews yet are left out.">
        {(headingId) => (
          <ChoiceChips
            labelledBy={headingId}
            options={ratingOptions}
            value={filters.minRating}
            onChange={(minRating) => onChange({ minRating })}
          />
        )}
      </FilterSection>

      <FilterSection title="Extras">
        {() => (
          <div className="grid gap-1">
            <Switch
              label="Unlimited kilometres"
              checked={filters.unlimitedKm}
              onCheckedChange={(unlimitedKm) => onChange({ unlimitedKm })}
            />
            <Switch
              label="Pet friendly"
              checked={filters.petFriendly}
              onCheckedChange={(petFriendly) => onChange({ petFriendly })}
            />
            <Switch
              label="Child seat available"
              checked={filters.childSeat}
              onCheckedChange={(childSeat) => onChange({ childSeat })}
            />
          </div>
        )}
      </FilterSection>
    </div>
  );
}
