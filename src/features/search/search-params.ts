import type { SearchParams } from '@/api/types';
import {
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  type BodyType,
  type FuelType,
  type Transmission,
} from '@/features/vehicles/vehicle-format';
import { formatNzdFromCents } from '@/lib/format';
import type { TripParams } from './place';

/*
 * Search Results and Browse Cars keep everything in the URL (plan §9, Days 7–9), so a search can be shared,
 * bookmarked and reloaded: the place and dates (place.ts), every filter of spec §5 and the sort, each under
 * the API's own parameter name (`GET /search`). Unknown or malformed values are ignored rather than failing,
 * as the API does (plan §3).
 *
 *   /search?where=Auckland&placeId=place:…&lat=-36.85&lng=174.76&start=2026-10-12T10:00&end=…&types=SUV,WAGON
 */

export { filterParams, tripParams, type PlaceType, type PlaceValue, type TripParams } from './place';

export const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'distance', label: 'Distance' },
  { value: 'newest', label: 'Newest listings' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export interface SearchFilters {
  minDailyCents?: number;
  maxDailyCents?: number;
  radiusKm?: number;
  types: BodyType[];
  make?: string;
  model?: string;
  minYear?: number;
  maxYear?: number;
  transmission?: Transmission;
  minSeats?: number;
  fuel: FuelType[];
  /** Hybrid, plug-in hybrid or electric. */
  electrified: boolean;
  airportDelivery: boolean;
  /** Delivers to an address. */
  delivery: boolean;
  instantBook: boolean;
  /** 1–5; leaves out cars without reviews yet. */
  minRating?: number;
  unlimitedKm: boolean;
  petFriendly: boolean;
  childSeat: boolean;
}

export const BODY_TYPES = Object.keys(BODY_TYPE_LABELS) as BodyType[];
export const FUEL_TYPES = Object.keys(FUEL_LABELS) as FuelType[];
const TRANSMISSIONS = Object.keys(TRANSMISSION_LABELS) as Transmission[];

/** The price filter's range, in cents: $20 to "$300 and up". */
export const PRICE_RANGE = { min: 2_000, max: 30_000, step: 500 } as const;

const FILTER_KEYS = [
  'minDailyCents',
  'maxDailyCents',
  'radiusKm',
  'types',
  'make',
  'model',
  'minYear',
  'maxYear',
  'transmission',
  'minSeats',
  'fuel',
  'electrified',
  'airportDelivery',
  'delivery',
  'instantBook',
  'minRating',
  'unlimitedKm',
  'petFriendly',
  'childSeat',
] as const satisfies readonly (keyof SearchFilters)[];

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function readNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw === null || raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** A list given as repeated parameters or separated with commas, keeping only known values. */
function readList<Value extends string>(params: URLSearchParams, key: string, allowed: readonly Value[]) {
  const values = params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is Value => allowed.includes(value as Value));
  return [...new Set(values)];
}

const readFlag = (params: URLSearchParams, key: string) => ['true', '1'].includes(params.get(key) ?? '');

const readText = (params: URLSearchParams, key: string) => params.get(key)?.trim() || undefined;

export function readTrip(params: URLSearchParams): TripParams {
  const lat = readNumber(params, 'lat');
  const lng = readNumber(params, 'lng');
  const hasPoint = lat !== undefined && lng !== undefined && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const code = readText(params, 'airport')?.toUpperCase();
  const start = params.get('start') ?? '';
  const end = params.get('end') ?? '';
  const dated = DATE_TIME.test(start) && DATE_TIME.test(end);
  return {
    place: {
      label: readText(params, 'where') ?? '',
      id: readText(params, 'placeId'),
      lat: hasPoint ? lat : undefined,
      lng: hasPoint ? lng : undefined,
      code,
      type: code ? 'AIRPORT' : undefined,
    },
    start: dated ? start : undefined,
    end: dated ? end : undefined,
  };
}

export function readFilters(params: URLSearchParams): SearchFilters {
  const transmission = params.get('transmission')?.toUpperCase();
  return {
    minDailyCents: readNumber(params, 'minDailyCents'),
    maxDailyCents: readNumber(params, 'maxDailyCents'),
    radiusKm: readNumber(params, 'radiusKm'),
    types: readList(params, 'types', BODY_TYPES),
    make: readText(params, 'make'),
    model: readText(params, 'model'),
    minYear: readNumber(params, 'minYear'),
    maxYear: readNumber(params, 'maxYear'),
    transmission: TRANSMISSIONS.find((option) => option === transmission),
    minSeats: readNumber(params, 'minSeats'),
    fuel: readList(params, 'fuel', FUEL_TYPES),
    electrified: readFlag(params, 'electrified'),
    airportDelivery: readFlag(params, 'airportDelivery'),
    delivery: readFlag(params, 'delivery'),
    instantBook: readFlag(params, 'instantBook'),
    minRating: readNumber(params, 'minRating'),
    unlimitedKm: readFlag(params, 'unlimitedKm'),
    petFriendly: readFlag(params, 'petFriendly'),
    childSeat: readFlag(params, 'childSeat'),
  };
}

export function readSort(params: URLSearchParams): SortOption {
  const sort = params.get('sort');
  return SORT_OPTIONS.find((option) => option.value === sort)?.value ?? 'recommended';
}

/** A copy of the URL's parameters with the given filters changed. Unset, false and empty filters are removed. */
export function withFilters(params: URLSearchParams, patch: Partial<SearchFilters>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(patch)) {
    next.delete(key);
    if (value === undefined || value === false || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) next.set(key, value.join(','));
    } else {
      next.set(key, String(value));
    }
  }
  return next;
}

/** A copy of the URL's parameters without any filters; the place, dates and sort stay. */
export function withoutFilters(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  FILTER_KEYS.forEach((key) => next.delete(key));
  return next;
}

export interface ActiveFilter {
  id: string;
  label: string;
  /** The change that removes it. */
  clear: Partial<SearchFilters>;
}

const dollars = (cents: number) => formatNzdFromCents(cents);

/** The filters in use, as short labels a visitor can remove one at a time, e.g. in an empty state. */
export function activeFilters(filters: SearchFilters): ActiveFilter[] {
  const chips: ActiveFilter[] = [];
  const { minDailyCents: min, maxDailyCents: max } = filters;
  if (min !== undefined || max !== undefined) {
    const label =
      min !== undefined && max !== undefined
        ? `${dollars(min)}–${dollars(max)} a day`
        : min !== undefined
          ? `From ${dollars(min)} a day`
          : `Up to ${dollars(max!)} a day`;
    chips.push({ id: 'price', label, clear: { minDailyCents: undefined, maxDailyCents: undefined } });
  }
  if (filters.radiusKm !== undefined)
    chips.push({ id: 'radius', label: `Within ${filters.radiusKm} km`, clear: { radiusKm: undefined } });
  if (filters.types.length > 0)
    chips.push({
      id: 'types',
      label: filters.types.map((type) => BODY_TYPE_LABELS[type]).join(', '),
      clear: { types: [] },
    });
  if (filters.make)
    chips.push({
      id: 'make',
      label: [filters.make, filters.model].filter(Boolean).join(' '),
      clear: { make: undefined, model: undefined },
    });
  if (filters.minYear !== undefined || filters.maxYear !== undefined) {
    const { minYear, maxYear } = filters;
    const label =
      minYear !== undefined && maxYear !== undefined
        ? `${minYear}–${maxYear}`
        : minYear !== undefined
          ? `${minYear} or newer`
          : `${maxYear} or older`;
    chips.push({ id: 'year', label, clear: { minYear: undefined, maxYear: undefined } });
  }
  if (filters.transmission)
    chips.push({
      id: 'transmission',
      label: TRANSMISSION_LABELS[filters.transmission],
      clear: { transmission: undefined },
    });
  if (filters.minSeats !== undefined)
    chips.push({ id: 'seats', label: `${filters.minSeats}+ seats`, clear: { minSeats: undefined } });
  if (filters.fuel.length > 0)
    chips.push({
      id: 'fuel',
      label: filters.fuel.map((fuel) => FUEL_LABELS[fuel]).join(', '),
      clear: { fuel: [] },
    });
  if (filters.electrified)
    chips.push({ id: 'electrified', label: 'Hybrid or electric', clear: { electrified: false } });
  if (filters.instantBook)
    chips.push({ id: 'instantBook', label: 'Instant Book', clear: { instantBook: false } });
  if (filters.delivery) chips.push({ id: 'delivery', label: 'Delivery', clear: { delivery: false } });
  if (filters.airportDelivery)
    chips.push({ id: 'airportDelivery', label: 'Airport delivery', clear: { airportDelivery: false } });
  if (filters.minRating !== undefined)
    chips.push({ id: 'rating', label: `${filters.minRating}+ stars`, clear: { minRating: undefined } });
  if (filters.unlimitedKm)
    chips.push({ id: 'unlimitedKm', label: 'Unlimited kilometres', clear: { unlimitedKm: false } });
  if (filters.petFriendly)
    chips.push({ id: 'petFriendly', label: 'Pet friendly', clear: { petFriendly: false } });
  if (filters.childSeat) chips.push({ id: 'childSeat', label: 'Child seat', clear: { childSeat: false } });
  return chips;
}

/** The query for `GET /search`: the trip, every filter and the sort. */
export function toApiQuery(trip: TripParams, filters: SearchFilters, sort: SortOption): SearchParams {
  const { place } = trip;
  const query: SearchParams = {
    sort,
    where: place.label || undefined,
    placeId: place.id,
    lat: place.lat,
    lng: place.lng,
    airport: place.type === 'AIRPORT' ? place.code : undefined,
    start: trip.start,
    end: trip.end,
    minDailyCents: filters.minDailyCents,
    maxDailyCents: filters.maxDailyCents,
    radiusKm: filters.radiusKm,
    types: filters.types.length > 0 ? filters.types : undefined,
    make: filters.make,
    model: filters.make ? filters.model : undefined,
    minYear: filters.minYear,
    maxYear: filters.maxYear,
    transmission: filters.transmission,
    minSeats: filters.minSeats,
    fuel: filters.fuel.length > 0 ? filters.fuel : undefined,
    minRating: filters.minRating,
  };
  for (const key of [
    'electrified',
    'airportDelivery',
    'delivery',
    'instantBook',
    'unlimitedKm',
    'petFriendly',
    'childSeat',
  ] as const) {
    if (filters[key]) query[key] = true;
  }
  // Leave out what isn't set, so equal searches share one cache entry.
  return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined)) as SearchParams;
}
