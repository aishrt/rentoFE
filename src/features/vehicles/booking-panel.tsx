import { CalendarX, Clock, MapPin, Undo2 } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import type { VehicleDetail } from '@/api/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TimePicker } from '@/components/ui/time-picker';
import { PriceBreakdown } from '@/features/booking/price-breakdown';
import { PriceWithEstimate } from '@/features/currency/price-with-estimate';
import { cn } from '@/lib/cn';
import { toDateInputValue } from '@/lib/dates';
import { fullyBookedDays, upcomingBusy } from './availability';
import type { Booking } from './use-booking';
import { useVehicleAvailability } from './vehicle-api';
import { formatNzdPrecise, optionFee } from './vehicle-format';

// The legend above each date-and-time pair turns blue while either of its pickers has focus or is open.
const legendClasses = cn(
  'mb-1.5 text-sm font-medium transition-colors duration-120',
  'group-has-[button[aria-haspopup]:focus-visible]/pair:text-primary group-has-[[aria-expanded=true]]/pair:text-primary',
);

interface BookingPanelProps {
  vehicle: VehicleDetail;
  booking: Booking;
  className?: string;
}

/**
 * Booking on the listing page (plan §12.6): dates and times, where the trip starts and ends, the protection
 * plan, then the live price from the API with anything in the way explained, and Book (or Request to book).
 * On desktop it's the sticky right-hand panel; on phones it opens from the sticky bar in a bottom sheet.
 */
export function BookingPanel({ vehicle, booking, className }: BookingPanelProps) {
  const id = useId();
  const [today] = useState(() => toDateInputValue(new Date()));
  const pickupDateRef = useRef<HTMLButtonElement>(null);
  const availability = useVehicleAvailability(vehicle.id);
  const booked = upcomingBusy(availability.data?.busy ?? []);
  const fullyBooked = useMemo(() => fullyBookedDays(availability.data?.busy ?? []), [availability.data]);
  const { dates, setDates, errors, quote, showErrors } = booking;
  const trip = [dates.pickupDate, dates.returnDate] as const;
  const options = vehicle.deliveryOptions;
  const optionChoices = options.map((option) => ({
    value: option.id,
    label: `${option.label} · ${optionFee(option)}`,
  }));
  const { weeklyDiscountPct, monthlyDiscountPct } = vehicle.pricing;
  const discounts = [
    weeklyDiscountPct > 0 ? `${weeklyDiscountPct}% off 7+ days` : undefined,
    monthlyDiscountPct > 0 ? `${monthlyDiscountPct}% off 28+ days` : undefined,
  ].filter(Boolean);

  const datePair = (kind: 'pickup' | 'return') => {
    const pickup = kind === 'pickup';
    const noun = pickup ? 'Pick-up' : 'Return';
    const dateKey = pickup ? 'pickupDate' : 'returnDate';
    const timeKey = pickup ? 'pickupTime' : 'returnTime';
    return (
      <fieldset className="group/pair grid min-w-0 gap-1.5">
        <legend className={legendClasses}>{noun}</legend>
        <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-start gap-2">
          <Field label={`${noun} date`} hideLabel error={showErrors ? errors[dateKey] : undefined}>
            <DatePicker
              ref={pickup ? pickupDateRef : undefined}
              value={dates[dateKey]}
              onChange={(value) => setDates(pickup ? { pickupDate: value } : { returnDate: value })}
              min={pickup ? today : dates.pickupDate || today}
              range={trip}
              isDateDisabled={(day) => fullyBooked.has(day)}
              placeholder="Add date"
              calendarLabel={pickup ? 'Choose a pick-up date' : 'Choose a return date'}
            />
          </Field>
          <Field label={`${noun} time`} hideLabel error={showErrors ? errors[timeKey] : undefined}>
            <TimePicker
              value={dates[timeKey]}
              onChange={(value) => setDates(pickup ? { pickupTime: value } : { returnTime: value })}
              align="end"
              listLabel={pickup ? 'Pick-up times' : 'Return times'}
            />
          </Field>
        </div>
      </fieldset>
    );
  };

  let price;
  if (!booking.hasDates) {
    price = (
      <p className="text-sm text-muted">
        Add your dates to see the total price, with every mandatory fee included.
      </p>
    );
  } else if (quote.isError) {
    price = (
      <Alert
        variant="danger"
        title="We couldn't price this trip"
        action={
          <Button variant="secondary" size="sm" onClick={() => void quote.refetch()}>
            Try again
          </Button>
        }
      >
        {quote.error.message}
      </Alert>
    );
  } else if (quote.data) {
    price = (
      <div className="grid gap-4">
        {booking.blocking.length > 0 && (
          <Alert variant="danger" role="alert" title="This trip can't be booked yet">
            <ul className="grid gap-1">
              {booking.blocking.map((problem) => (
                <li key={problem.code}>{problem.message}</li>
              ))}
            </ul>
          </Alert>
        )}
        {booking.addressNeeded && (
          <Alert title="Delivery address">You'll add the address to deliver to at checkout.</Alert>
        )}
        <PriceBreakdown
          lineItems={quote.data.lineItems}
          price={quote.data.price}
          animateTotal
          className={cn('transition-opacity duration-200', !booking.current && 'opacity-50')}
        />
      </div>
    );
  } else if (booking.pricing) {
    price = (
      <div aria-hidden="true" className="grid gap-2.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-6 w-full" />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="tabular-nums">
          <span className="headline text-3xl font-medium text-ink">
            <PriceWithEstimate cents={vehicle.pricing.dailyCents} />
          </span>
          <span className="text-muted"> /day</span>
        </p>
        {discounts.length > 0 && <p className="text-sm font-medium text-primary">{discounts.join(' · ')}</p>}
      </div>

      <div className="mt-5 grid gap-4">
        {datePair('pickup')}
        {datePair('return')}
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Clock aria-hidden="true" className="size-3.5" />
          Dates and times are in NZ time.
        </p>
        {booked.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-muted">
            <CalendarX aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              Already booked: {booked.join(', ')}.{' '}
              <a href="#availability" className="link-underline font-medium text-primary">
                See the calendar
              </a>
            </span>
          </p>
        )}

        {options.length > 1 && (
          <div className="grid gap-3">
            <Field label="Pick-up from">
              <Select
                value={booking.pickupOptionId ?? ''}
                onChange={booking.setPickupOption}
                options={optionChoices}
                icon={<MapPin />}
                listLabel="Pick-up options"
              />
            </Field>
            <Field label="Return to">
              <Select
                value={booking.returnOptionId ?? ''}
                onChange={booking.setReturnOption}
                options={optionChoices}
                icon={<Undo2 />}
                listLabel="Return options"
              />
            </Field>
          </div>
        )}

        {vehicle.protectionPlans.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium text-ink">Protection</legend>
            {vehicle.protectionPlans.map((plan) => (
              <label
                key={plan.code}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-control border border-line bg-surface p-3',
                  'transition-[border-color,background-color] duration-120 hover:border-ink/25',
                  'has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-4 has-focus-visible:ring-primary/12',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-plan`}
                  value={plan.code}
                  checked={booking.planCode === plan.code}
                  onChange={() => booking.setPlanCode(plan.code)}
                  className="mt-0.5 size-4.5 shrink-0 cursor-pointer accent-primary outline-none"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink">{plan.name}</span>
                    <span className="text-sm text-ink tabular-nums">
                      {formatNzdPrecise(plan.dailyPriceCents)}/day{plan.mandatory && ' · included'}
                    </span>
                  </span>
                  <span className="block text-xs text-muted">
                    {/* The summary usually states the excess already; add it only when it doesn't. */}
                    {plan.coverSummary.includes(formatNzdPrecise(plan.excessCents))
                      ? plan.coverSummary
                      : `${formatNzdPrecise(plan.excessCents)} excess. ${plan.coverSummary}`}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
      </div>

      <div aria-live="polite" className="mt-6 border-t border-line pt-5 empty:hidden">
        {price}
      </div>

      <div className="mt-5">
        {booking.canBook ? (
          <Button asChild size="lg" block>
            <Link to={booking.checkoutUrl} viewTransition>
              {booking.bookLabel}
            </Link>
          </Button>
        ) : (
          <Button
            size="lg"
            block
            loading={booking.pricing}
            disabled={booking.blocking.length > 0}
            onClick={() => {
              booking.attempt();
              if (!booking.hasDates) pickupDateRef.current?.focus();
            }}
          >
            {booking.bookLabel}
          </Button>
        )}
        <p className="mt-3 text-center text-xs text-muted">
          {vehicle.rules.instantBook
            ? "You won't be charged yet."
            : "You won't be charged yet. The host has 24 hours to accept your request."}
        </p>
      </div>
    </div>
  );
}
