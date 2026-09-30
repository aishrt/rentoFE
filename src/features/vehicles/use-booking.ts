import { useState } from 'react';
import { useSearchParams } from 'react-router';
import type { QuoteRequest, VehicleDetail } from '@/api/types';
import {
  fromDateTimeParam,
  movePickupDate,
  toDateTimeParam,
  validateSearch,
} from '@/features/search/search-validation';
import { useDebouncedValue } from '@/features/search/use-debounced-value';
import { useQuote } from './vehicle-api';

export interface TripDates {
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** The trip in the listing's URL, e.g. carried over from Search Results. */
function datesFromUrl(params: URLSearchParams): TripDates {
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  const dated = DATE_TIME.test(start) && DATE_TIME.test(end);
  const pickup = fromDateTimeParam(dated ? start : undefined);
  const dropoff = fromDateTimeParam(dated ? end : undefined);
  return {
    pickupDate: pickup.date,
    pickupTime: pickup.time || '10:00',
    returnDate: dropoff.date,
    returnTime: dropoff.time || '10:00',
  };
}

/** How long the choices must settle before the price is asked for again, in ms. */
const QUOTE_DEBOUNCE = 300;

/**
 * The trip being priced on the listing page: dates and times, where it starts and ends, and the protection
 * plan. The dates live in the URL too, so a link from search results opens with them, and a reload keeps
 * them. The quote comes from the API (plan §5: the frontend never calculates a price), asked for once the
 * choices settle.
 */
export function useBooking(vehicle: VehicleDetail) {
  const [params, setParams] = useSearchParams();
  const [dates, setDatesState] = useState(() => datesFromUrl(params));
  // Collecting from the host is the default; omitted from the checkout link (its URL contract).
  const hostPickup = vehicle.deliveryOptions.find((option) => option.type === 'PICKUP');
  const firstOption = hostPickup ?? vehicle.deliveryOptions[0];
  const mandatoryPlan = vehicle.protectionPlans.find((plan) => plan.mandatory);
  const [pickupOptionId, setPickupOptionId] = useState(firstOption?.id);
  const [returnOptionId, setReturnOptionId] = useState(firstOption?.id);
  const [planCode, setPlanCode] = useState(mandatoryPlan?.code);
  const [attempted, setAttempted] = useState(false);

  const hasDates = Boolean(dates.pickupDate && dates.returnDate);
  const errors = validateSearch(
    { place: { label: '' }, ...dates },
    { requirePlace: false, requireDates: attempted },
  );
  const valid = hasDates && Object.keys(errors).length === 0;
  const start = toDateTimeParam(dates.pickupDate, dates.pickupTime);
  const end = toDateTimeParam(dates.returnDate, dates.returnTime);

  const request: QuoteRequest | null = valid
    ? { start, end, pickupOptionId, returnOptionId, protectionPlanCode: planCode }
    : null;
  // Debounced as text, so the same choices always make the same request.
  const requestKey = request ? JSON.stringify(request) : '';
  const settledKey = useDebouncedValue(requestKey, QUOTE_DEBOUNCE);
  const quote = useQuote(vehicle.id, settledKey ? (JSON.parse(settledKey) as QuoteRequest) : null);
  /** The quote on screen is for the choices on screen (not the last one, kept while the next loads). */
  const current =
    Boolean(quote.data) && requestKey !== '' && settledKey === requestKey && !quote.isPlaceholderData;
  const problems = current ? (quote.data?.problems ?? []) : [];
  // A delivery address is asked for at checkout, so it doesn't stop the booking here.
  const blocking = problems.filter((problem) => problem.code !== 'ADDRESS_NEEDED');
  const addressNeeded = problems.some((problem) => problem.code === 'ADDRESS_NEEDED');
  const canBook = current && blocking.length === 0;

  const setDates = (patch: Partial<TripDates>) => {
    const next =
      patch.pickupDate !== undefined
        ? movePickupDate({ ...dates, ...patch }, patch.pickupDate)
        : { ...dates, ...patch };
    setDatesState(next);
    if (!next.pickupDate || !next.returnDate) return;
    const updated = new URLSearchParams(params);
    updated.set('start', toDateTimeParam(next.pickupDate, next.pickupTime));
    updated.set('end', toDateTimeParam(next.returnDate, next.returnTime));
    setParams(updated, { replace: true, preventScrollReset: true });
  };

  const setPickupOption = (id: string) => {
    // The return follows the pick-up until it's changed on its own.
    if (returnOptionId === pickupOptionId) setReturnOptionId(id);
    setPickupOptionId(id);
  };

  const checkout = new URLSearchParams({ start, end });
  if (pickupOptionId && pickupOptionId !== hostPickup?.id) checkout.set('pickup', pickupOptionId);
  if (returnOptionId && returnOptionId !== hostPickup?.id) checkout.set('return', returnOptionId);
  const plan = vehicle.protectionPlans.find((item) => item.code === planCode);
  if (plan && !plan.mandatory) checkout.set('plan', plan.code);

  return {
    dates,
    setDates,
    hasDates,
    errors,
    /** Errors show once both dates are chosen, or after Book is pressed without them. */
    showErrors: attempted || hasDates,
    attempt: () => setAttempted(true),
    pickupOptionId,
    setPickupOption,
    returnOptionId,
    setReturnOption: setReturnOptionId,
    planCode,
    setPlanCode,
    quote,
    /** Waiting for the quote for the choices on screen. */
    pricing: valid && !current && !quote.isError,
    current,
    blocking,
    addressNeeded,
    canBook,
    checkoutUrl: `/book/${vehicle.slug}?${checkout.toString()}`,
    bookLabel: vehicle.rules.instantBook ? 'Book' : 'Request to book',
  };
}

export type Booking = ReturnType<typeof useBooking>;
