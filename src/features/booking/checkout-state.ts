import type { DeliveryAddress, QuoteRequest, VehicleDetail } from '@/api/types';
import { addressPartsOf, hasCoordinates, type PlaceChoice } from '@/features/host/place-choice';

/*
 * What the Guest has chosen at checkout, kept so that nothing is lost when they sign in midway (plan §6.1):
 * the dates, pick-up and return options and protection plan live in the URL (the listing's Book link sets
 * them, and a reload or a trip to the log-in page keeps them), and the delivery address and how far they
 * got live in session storage, which stays on this device and ends with the tab.
 */

/** The URL's choices: `start` and `end` as "2026-10-12T10:00" in NZ time, option ids and a plan code. */
export interface CheckoutChoices {
  start: string;
  end: string;
  pickup?: string;
  return?: string;
  plan?: string;
}

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function readChoices(params: URLSearchParams): CheckoutChoices {
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  return {
    start: DATE_TIME.test(start) ? start : '',
    end: DATE_TIME.test(end) ? end : '',
    pickup: params.get('pickup') || undefined,
    return: params.get('return') || undefined,
    plan: params.get('plan') || undefined,
  };
}

/**
 * The URL for a set of choices, with the listing's contract: an option that is the Host's own location
 * and the plan every trip includes are left out.
 */
export function writeChoices(choices: CheckoutChoices, vehicle: VehicleDetail): URLSearchParams {
  const params = new URLSearchParams();
  if (choices.start) params.set('start', choices.start);
  if (choices.end) params.set('end', choices.end);
  const hostPickup = hostPickupOption(vehicle);
  if (choices.pickup && choices.pickup !== hostPickup?.id) params.set('pickup', choices.pickup);
  if (choices.return && choices.return !== hostPickup?.id) params.set('return', choices.return);
  const plan = vehicle.protectionPlans.find((item) => item.code === choices.plan);
  if (plan && !plan.mandatory) params.set('plan', plan.code);
  return params;
}

export const hostPickupOption = (vehicle: VehicleDetail) =>
  vehicle.deliveryOptions.find((option) => option.type === 'PICKUP');

export interface ResolvedChoices {
  start: string;
  end: string;
  pickupOptionId?: string;
  returnOptionId?: string;
  planCode?: string;
}

/**
 * The choices with the defaults filled in: collecting from (and returning to) the Host's location, and the
 * plan every trip includes. Both options are always sent, because the API's own default for a missing
 * return is "the same as pick-up", while the listing's link leaves it out to mean the Host's location.
 */
export function resolveChoices(choices: CheckoutChoices, vehicle: VehicleDetail): ResolvedChoices {
  const known = (id?: string) =>
    id && vehicle.deliveryOptions.some((option) => option.id === id) ? id : undefined;
  const fallback = hostPickupOption(vehicle)?.id ?? vehicle.deliveryOptions[0]?.id;
  const plans = vehicle.protectionPlans;
  const plan = plans.find((item) => item.code === choices.plan) ?? plans.find((item) => item.mandatory);
  return {
    start: choices.start,
    end: choices.end,
    pickupOptionId: known(choices.pickup) ?? fallback,
    returnOptionId: known(choices.return) ?? fallback,
    planCode: plan?.code,
  };
}

/** Whether the pick-up or the return is a delivery to the Guest's address. */
export function needsDeliveryAddress(resolved: ResolvedChoices, vehicle: VehicleDetail): boolean {
  return vehicle.deliveryOptions.some(
    (option) =>
      option.type === 'DELIVERY' &&
      (option.id === resolved.pickupOptionId || option.id === resolved.returnOptionId),
  );
}

// ── The delivery address ─────────────────────────────────────────────────────────────────────────────

/** The address as typed: the street by hand, the suburb or town chosen from our places for its coordinates. */
export interface AddressDraft {
  unit: string;
  streetNumber: string;
  street: string;
  place: PlaceChoice;
  postcode: string;
}

export const emptyAddress: AddressDraft = {
  unit: '',
  streetNumber: '',
  street: '',
  place: { label: '' },
  postcode: '',
};

export type AddressErrors = Partial<Record<'streetNumber' | 'street' | 'place' | 'postcode', string>>;

/** The address the API takes, or the errors that stop it. */
export function toDeliveryAddress(draft: AddressDraft): { address?: DeliveryAddress; errors: AddressErrors } {
  const errors: AddressErrors = {};
  if (!draft.streetNumber.trim()) errors.streetNumber = 'Enter the street number';
  if (draft.street.trim().length < 2) errors.street = 'Enter the street name';
  if (!/^\d{4}$/.test(draft.postcode.trim())) errors.postcode = 'Enter the 4-digit postcode';
  const parts = addressPartsOf(draft.place);
  if (!hasCoordinates(draft.place) || !parts.city || !parts.region) {
    errors.place = draft.place.label.trim()
      ? 'Choose your suburb or town from the list'
      : 'Enter your suburb or town, then choose it from the list';
  }
  if (Object.keys(errors).length > 0 || !hasCoordinates(draft.place) || !parts.city || !parts.region) {
    return { errors };
  }
  return {
    errors,
    address: {
      ...(draft.unit.trim() && { unit: draft.unit.trim() }),
      streetNumber: draft.streetNumber.trim(),
      street: draft.street.trim(),
      ...(parts.suburb && { suburb: parts.suburb }),
      city: parts.city,
      region: parts.region,
      postcode: draft.postcode.trim(),
      lat: draft.place.lat,
      lng: draft.place.lng,
    },
  };
}

/** "12 Queen Street, Ponsonby, Auckland 1011". */
export function addressLine(address: DeliveryAddress): string {
  const street = `${address.unit ? `${address.unit}/` : ''}${address.streetNumber ?? ''} ${address.street}`;
  return [street.trim(), address.suburb, `${address.city} ${address.postcode}`].filter(Boolean).join(', ');
}

/** The quote and booking request for the choices, or null until the dates are complete. */
export function tripRequest(
  resolved: ResolvedChoices,
  deliveryAddress?: DeliveryAddress,
): QuoteRequest | null {
  if (!resolved.start || !resolved.end) return null;
  return {
    start: resolved.start,
    end: resolved.end,
    ...(resolved.pickupOptionId && { pickupOptionId: resolved.pickupOptionId }),
    ...(resolved.returnOptionId && { returnOptionId: resolved.returnOptionId }),
    ...(resolved.planCode && { protectionPlanCode: resolved.planCode }),
    ...(deliveryAddress && { deliveryAddress }),
  };
}

// ── Session storage ──────────────────────────────────────────────────────────────────────────────────

export interface SavedProgress {
  address: AddressDraft;
  /** The section reached, and for which trip (the request as JSON), so a reload returns there. */
  step: number;
  tripKey: string;
  /** The booking holding the dates for that trip, so a reload carries on paying for it. */
  holdRef: string | null;
}

const storageKey = (slug: string) => `rv:checkout:${slug}`;

export function loadProgress(slug: string): SavedProgress | null {
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedProgress>;
    return {
      address: { ...emptyAddress, ...saved.address, place: saved.address?.place ?? { label: '' } },
      step: typeof saved.step === 'number' ? saved.step : 0,
      tripKey: typeof saved.tripKey === 'string' ? saved.tripKey : '',
      holdRef: typeof saved.holdRef === 'string' ? saved.holdRef : null,
    };
  } catch {
    // Storage can be blocked (private browsing, site data turned off); the checkout still works.
    return null;
  }
}

export function saveProgress(slug: string, progress: SavedProgress) {
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(progress));
  } catch {
    // Not remembered, but the choices in the URL still are.
  }
}

export function clearProgress(slug: string) {
  try {
    sessionStorage.removeItem(storageKey(slug));
  } catch {
    // Nothing to clear.
  }
}
