import { CalendarX, Clock, MapPin, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TripProblem, VehicleDetail } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { PlacePicker } from '@/features/host/place-picker';
import { fromDateTimeParam, movePickupDate, toDateTimeParam } from '@/features/search/search-validation';
import { earliestPickupDay, upcomingBusy } from '@/features/vehicles/availability';
import { useVehicleAvailability } from '@/features/vehicles/vehicle-api';
import { optionDetail, optionFee } from '@/features/vehicles/vehicle-format';
import { cn } from '@/lib/cn';
import { nzWallClockParts } from './booking-format';
import type { AddressDraft, AddressErrors, CheckoutChoices, ResolvedChoices } from './checkout-state';

// The legend above each date-and-time pair turns blue while either of its pickers has focus or is open.
const legendClasses = cn(
  'mb-1.5 text-sm font-medium text-ink transition-colors duration-120',
  'group-has-[button[aria-haspopup]:focus-visible]/pair:text-primary group-has-[[aria-expanded=true]]/pair:text-primary',
);

interface TripSectionProps {
  vehicle: VehicleDetail;
  resolved: ResolvedChoices;
  onChange: (patch: Partial<CheckoutChoices>) => void;
  deliveryNeeded: boolean;
  address: AddressDraft;
  onAddressChange: (draft: AddressDraft) => void;
  addressErrors: AddressErrors;
  /** Field errors from the quote (400), e.g. a pick-up in the past. */
  fieldErrors?: Record<string, string>;
  /** Shown once Continue has been pressed. */
  showErrors: boolean;
  /** What stops this trip, from the quote for the choices on screen. */
  problems: readonly TripProblem[];
  /** Something to say first, such as dates taken while the Guest was checking out. */
  notice?: string | null;
  /** Waiting for the price of the choices on screen. */
  pricing: boolean;
  onContinue: () => void;
}

/**
 * Step 1 (spec §7, steps 1–3): when and where the trip starts and ends, in NZ time, with the availability
 * check from the quote. A delivery needs the Guest's address, with the suburb or town chosen from our places
 * so the API can check it's inside the Host's delivery area.
 */
export function TripSection({
  vehicle,
  resolved,
  onChange,
  deliveryNeeded,
  address,
  onAddressChange,
  addressErrors,
  fieldErrors,
  showErrors,
  problems,
  notice,
  pricing,
  onContinue,
}: TripSectionProps) {
  const [today] = useState(() => nzWallClockParts(new Date()).date);
  const { minNoticeHours } = vehicle.rules;
  // Days wholly inside the Host's minimum notice can't be chosen.
  const earliest = useMemo(() => {
    const day = earliestPickupDay(minNoticeHours);
    return day > today ? day : today;
  }, [minNoticeHours, today]);
  const availability = useVehicleAvailability(vehicle.id);
  const booked = upcomingBusy(availability.data?.busy ?? []);
  const pickup = fromDateTimeParam(resolved.start || undefined);
  const dropoff = fromDateTimeParam(resolved.end || undefined);
  const dates = {
    pickupDate: pickup.date,
    pickupTime: pickup.time || '10:00',
    returnDate: dropoff.date,
    returnTime: dropoff.time || '10:00',
  };
  const options = vehicle.deliveryOptions;
  const optionChoices = options.map((option) => ({
    value: option.id,
    label: `${option.label} · ${optionFee(option)}`,
  }));

  const setDates = (patch: Partial<typeof dates>) => {
    const next =
      patch.pickupDate !== undefined
        ? movePickupDate({ ...dates, ...patch }, patch.pickupDate)
        : { ...dates, ...patch };
    onChange({
      start: next.pickupDate ? toDateTimeParam(next.pickupDate, next.pickupTime) : '',
      end: next.returnDate ? toDateTimeParam(next.returnDate, next.returnTime) : '',
    });
  };

  const missingDates = showErrors && (!dates.pickupDate || !dates.returnDate);
  const dateError = (key: 'start' | 'end') => fieldErrors?.[key];
  const addressError = (key: keyof AddressErrors) => (showErrors ? addressErrors[key] : undefined);

  const datePair = (kind: 'pickup' | 'return') => {
    const isPickup = kind === 'pickup';
    const noun = isPickup ? 'Pick-up' : 'Return';
    const dateKey = isPickup ? 'pickupDate' : 'returnDate';
    const timeKey = isPickup ? 'pickupTime' : 'returnTime';
    const error =
      dateError(isPickup ? 'start' : 'end') ??
      (missingDates && !dates[dateKey] ? `Choose a ${noun.toLowerCase()} date` : undefined);
    return (
      <fieldset className="group/pair grid min-w-0 gap-1.5">
        <legend className={legendClasses}>{noun}</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-2">
          <Field label={`${noun} date`} hideLabel error={error}>
            <DatePicker
              value={dates[dateKey]}
              onChange={(value) => setDates(isPickup ? { pickupDate: value } : { returnDate: value })}
              min={isPickup ? earliest : dates.pickupDate || earliest}
              range={[dates.pickupDate, dates.returnDate]}
              placeholder="Add date"
              calendarLabel={isPickup ? 'Choose a pick-up date' : 'Choose a return date'}
            />
          </Field>
          <Field label={`${noun} time`} hideLabel>
            <TimePicker
              value={dates[timeKey]}
              onChange={(value) => setDates(isPickup ? { pickupTime: value } : { returnTime: value })}
              align="end"
              listLabel={isPickup ? 'Pick-up times' : 'Return times'}
            />
          </Field>
        </div>
      </fieldset>
    );
  };

  // A missing delivery address is asked for by the fields below, not as a problem.
  const shown = problems.filter((problem) => !(deliveryNeeded && problem.code === 'ADDRESS_NEEDED'));
  const single = options.length === 1 ? options[0] : undefined;

  return (
    <div className="grid gap-6">
      {notice && (
        <Alert variant="danger" role="alert">
          {notice}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {datePair('pickup')}
        {datePair('return')}
      </div>
      <div className="-mt-2 grid gap-2">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Clock aria-hidden="true" className="size-3.5" />
          Dates and times are in NZ time.
        </p>
        {booked.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-muted">
            <CalendarX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>Already booked: {booked.join(', ')}.</span>
          </p>
        )}
      </div>

      {single ? (
        <div className="flex items-start gap-3 rounded-control border border-line bg-canvas/60 p-4 text-sm">
          <MapPin aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-primary" />
          <p>
            <span className="font-medium text-ink">Pick-up and return: {single.label}</span>
            {optionDetail(single) && <span className="block text-muted">{optionDetail(single)}</span>}
            <span className="block text-muted">
              The exact address is shared once your booking is confirmed.
            </span>
          </p>
        </div>
      ) : (
        options.length > 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pick-up from">
              <Select
                value={resolved.pickupOptionId ?? ''}
                onChange={(id) => {
                  // The return follows the pick-up until it's changed on its own, as on the listing.
                  onChange(
                    resolved.returnOptionId === resolved.pickupOptionId
                      ? { pickup: id, return: id }
                      : { pickup: id },
                  );
                }}
                options={optionChoices}
                icon={<MapPin />}
                listLabel="Pick-up options"
              />
            </Field>
            <Field label="Return to">
              <Select
                value={resolved.returnOptionId ?? ''}
                onChange={(id) => onChange({ return: id })}
                options={optionChoices}
                icon={<Undo2 />}
                listLabel="Return options"
              />
            </Field>
          </div>
        )
      )}

      {deliveryNeeded && (
        <fieldset className="grid gap-4 rounded-card border border-line p-4 sm:p-5">
          <legend className="px-1 text-sm font-semibold text-ink">Where should we deliver the car?</legend>
          <p className="-mt-1 text-sm text-muted">
            Only your host sees this address, once your booking is confirmed.
          </p>
          <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
            <Field label="Unit (optional)">
              <Input
                autoComplete="off"
                value={address.unit}
                onChange={(event) => onAddressChange({ ...address, unit: event.target.value })}
              />
            </Field>
            <Field label="Number" error={addressError('streetNumber')}>
              <Input
                autoComplete="off"
                value={address.streetNumber}
                onChange={(event) => onAddressChange({ ...address, streetNumber: event.target.value })}
              />
            </Field>
            <Field label="Street" error={addressError('street')} className="col-span-2 sm:col-span-1">
              <Input
                autoComplete="off"
                placeholder="Queen Street"
                value={address.street}
                onChange={(event) => onAddressChange({ ...address, street: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <Field label="Suburb or town" error={addressError('place')}>
              <PlacePicker
                value={address.place}
                onValueChange={(place) => onAddressChange({ ...address, place })}
                types={['SUBURB', 'CITY']}
                placeholder="Start typing, then choose"
                listLabel="Suburbs and towns"
              />
            </Field>
            <Field label="Postcode" error={addressError('postcode')}>
              <Input
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={4}
                value={address.postcode}
                onChange={(event) => onAddressChange({ ...address, postcode: event.target.value })}
              />
            </Field>
          </div>
        </fieldset>
      )}

      {shown.length > 0 && (
        <Alert variant="danger" role="alert" title="This trip can’t be booked yet">
          <ul className="grid gap-1">
            {shown.map((problem) => (
              <li key={problem.code}>{problem.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      <div>
        <Button size="lg" onClick={onContinue} loading={pricing} className="max-sm:w-full">
          Continue
        </Button>
      </div>
    </div>
  );
}
