import type { PlaceSuggestion } from '@/api/types';

/*
 * The place and dates of a search as they sit in its URL. Kept apart from the filters (search-params.ts)
 * because the homepage's search form needs only this: the filters, their labels and the car vocabulary stay
 * out of the homepage's first load (plan §12.5).
 */

export type PlaceType = PlaceSuggestion['type'];

/** A place as the search form holds it: the text in the field and, once a suggestion is chosen, where it is. */
export interface PlaceValue {
  label: string;
  /** The suggestion's id: `place:<id>`, or `google:<id>` for a street address. */
  id?: string;
  type?: PlaceType;
  lat?: number;
  lng?: number;
  /** Airports: the IATA code, so the search also finds cars that deliver there (plan §3). */
  code?: string;
}

export interface TripParams {
  place: PlaceValue;
  /** "2026-10-12T10:00" in NZ time. */
  start?: string;
  end?: string;
}

export const TRIP_KEYS = ['where', 'placeId', 'lat', 'lng', 'airport', 'start', 'end'] as const;

/** The trip's parameters: the place as typed or chosen, then the dates. */
export function tripParams(trip: TripParams): URLSearchParams {
  const params = new URLSearchParams();
  const { place } = trip;
  if (place.label.trim()) params.set('where', place.label.trim());
  if (place.id) params.set('placeId', place.id);
  if (place.lat !== undefined && place.lng !== undefined) {
    params.set('lat', String(place.lat));
    params.set('lng', String(place.lng));
  }
  if (place.type === 'AIRPORT' && place.code) params.set('airport', place.code);
  if (trip.start && trip.end) {
    params.set('start', trip.start);
    params.set('end', trip.end);
  }
  return params;
}

/** Only the filters and sort, e.g. to keep them when the place or dates change. */
export function filterParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params);
  TRIP_KEYS.forEach((key) => next.delete(key));
  return next;
}
