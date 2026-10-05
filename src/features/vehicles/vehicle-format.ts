import type { DeliveryOptionSummary, VehicleCard, VehicleDetail } from '@/api/types';
import { formatNumber, formatNzdFromCents } from '@/lib/format';

/*
 * Words for the codes the API uses, and small formatters shared by cards, the listing page and search.
 * NZ English throughout (plan §12.7).
 */

export type BodyType = VehicleCard['bodyType'];
export type FuelType = VehicleCard['fuelType'];
export type Transmission = VehicleCard['transmission'];
export type PhotoType = VehicleDetail['photos'][number]['type'];

export const BODY_TYPE_LABELS: Record<BodyType, string> = {
  HATCHBACK: 'Hatchback',
  SEDAN: 'Sedan',
  WAGON: 'Wagon',
  SUV: 'SUV',
  UTE: 'Ute',
  VAN: 'Van',
  PEOPLE_MOVER: 'People mover',
  COUPE: 'Coupe',
  CONVERTIBLE: 'Convertible',
};

export const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  HYBRID: 'Hybrid',
  PHEV: 'Plug-in hybrid',
  EV: 'Electric',
};

export const TRANSMISSION_LABELS: Record<Transmission, string> = {
  AUTOMATIC: 'Automatic',
  MANUAL: 'Manual',
};

/** The spec's photo angles (spec §6), as the gallery labels them. */
export const PHOTO_LABELS: Record<PhotoType, string> = {
  FRONT: 'Front',
  REAR: 'Rear',
  DRIVER: 'Driver side',
  PASSENGER: 'Passenger side',
  INTERIOR: 'Interior',
  DASH: 'Dashboard and odometer',
  BOOT: 'Boot',
  TYRES: 'Tyres',
  DAMAGE: 'Existing damage',
};

/** "Toyota RAV4": the car's name without the year, which cards show beside it. */
export const vehicleName = (vehicle: Pick<VehicleCard, 'make' | 'model'>) =>
  `${vehicle.make} ${vehicle.model}`;

/** "4.8": ratings to one decimal place. */
export const formatRating = (avg: number) => (Math.round(avg * 10) / 10).toFixed(1);

/** "1 trip", "38 trips". */
export const formatTrips = (count: number) => `${formatNumber(count)} ${count === 1 ? 'trip' : 'trips'}`;

/** "4.2 km away", or whole kilometres once it's 10 or more. */
export function formatDistance(km: number): string {
  const rounded = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${formatNumber(rounded)} km away`;
}

/** "Auto · 5 seats · Hybrid": the facts every card shows in the same place (plan §12.6). */
export function specLine(vehicle: Pick<VehicleCard, 'transmission' | 'seats' | 'fuelType'>): string {
  const transmission = vehicle.transmission === 'AUTOMATIC' ? 'Auto' : 'Manual';
  return `${transmission} · ${vehicle.seats} seats · ${FUEL_LABELS[vehicle.fuelType]}`;
}

/** Where the car is: its suburb and city, or whichever is known. */
export function placeLine(vehicle: { suburb?: string; city?: string }): string {
  return [vehicle.suburb, vehicle.city].filter(Boolean).join(', ');
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "December 2026" for the API's "2026-12" expiry months. */
export function formatExpiryMonth(value: string | undefined): string | undefined {
  const match = value && /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : undefined;
}

/** "5 days", "24 hours": how long before pick-up a cancellation refund rule starts. */
export function formatNotice(hours: number): string {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

const nzdWithCents = new Intl.NumberFormat('en-NZ', {
  style: 'currency',
  currency: 'NZD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$0.40", "$3,000": whole dollars when there are no cents, as for per-kilometre rates and excesses. */
export function formatNzdPrecise(cents: number): string {
  if (cents % 100 === 0) return nzdWithCents.format(cents / 100).replace(/\.00$/, '');
  return nzdWithCents.format(cents / 100);
}

/** The view-transition name that lets a card's photo morph into the listing's gallery (plan §12.4). */
export const vehiclePhotoTransitionName = (vehicleId: string) => `vehicle-photo-${vehicleId}`;

/** "5 days or more before pick-up: full refund", and so on down to the last rule of a cancellation tier. */
export function refundRules(tier: VehicleDetail['cancellationTier']): { when: string; refund: string }[] {
  const rules = [...tier.refunds].sort((a, b) => b.minHoursBefore - a.minHoursBefore);
  return rules.map((rule, index) => {
    const previous = rules[index - 1]?.minHoursBefore ?? 0;
    const when =
      index === 0
        ? rule.minHoursBefore === 0
          ? 'Any time before pick-up'
          : `${formatNotice(rule.minHoursBefore)} or more before pick-up`
        : rule.minHoursBefore === 0
          ? `Less than ${formatNotice(previous)} before`
          : `${formatNotice(rule.minHoursBefore)} to ${formatNotice(previous)} before`;
    const refund =
      rule.refundPct >= 100 ? 'Full refund' : rule.refundPct <= 0 ? 'No refund' : `${rule.refundPct}% refund`;
    return { when, refund };
  });
}

/** "Frankton, Queenstown", "To an address within 20 km of the car", "Airport code ZQN". */
export function optionDetail(option: DeliveryOptionSummary): string | undefined {
  if (option.type === 'DELIVERY')
    return option.radiusKm ? `To an address within ${option.radiusKm} km of the car` : undefined;
  if (option.type === 'AIRPORT') return option.airportCode ? `Airport code ${option.airportCode}` : undefined;
  return option.area;
}

/** "Free" or "$20". */
export const optionFee = (option: DeliveryOptionSummary) =>
  option.feeCents === 0 ? 'Free' : formatNzdFromCents(option.feeCents);
