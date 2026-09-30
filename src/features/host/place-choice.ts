import type { PlaceSuggestion } from '@/api/types';
import { NZ_REGIONS, type NzRegion } from './vehicle-labels';

/** A place chosen from our suggestions, or text typed without choosing (no coordinates yet). */
export interface PlaceChoice {
  label: string;
  id?: string;
  type?: PlaceSuggestion['type'];
  name?: string;
  /** "Auckland, Auckland" for a suburb (city, region); the region for a city or airport. */
  secondary?: string;
  /** Airports: the IATA code. */
  code?: string;
  /** The town or city and region, from the suggestion; without them, `secondary` is read instead. */
  city?: string;
  region?: NzRegion;
  lat?: number;
  lng?: number;
}

export const emptyPlace: PlaceChoice = { label: '' };

export const hasCoordinates = (place: PlaceChoice): place is PlaceChoice & { lat: number; lng: number } =>
  typeof place.lat === 'number' && typeof place.lng === 'number';

const asRegion = (text?: string): NzRegion | undefined =>
  NZ_REGIONS.find((region) => region.toLowerCase() === text?.trim().toLowerCase());

/**
 * The suburb, town or city and region of a chosen place, for a structured NZ address (plan §3). A suburb's
 * secondary line is "city, region"; a city's is its region, or nothing when the city names its region
 * (Auckland, Wellington).
 */
export function addressPartsOf(place: PlaceChoice): { suburb?: string; city?: string; region?: NzRegion } {
  const parts = place.secondary?.split(',').map((part) => part.trim()) ?? [];
  if (place.type === 'SUBURB') {
    return {
      suburb: place.name ?? place.label,
      city: place.city ?? parts[0],
      region: place.region ?? asRegion(parts.at(-1)),
    };
  }
  const name = place.name ?? place.label;
  return { city: place.city ?? name, region: place.region ?? asRegion(parts.at(-1)) ?? asRegion(name) };
}

/** The picker's text for a saved address: "Ponsonby, Auckland", or the city alone. */
export function placeFromAddress(address: {
  suburb?: string;
  city: string;
  region: NzRegion;
  lat: number;
  lng: number;
}): PlaceChoice {
  return address.suburb
    ? {
        label: `${address.suburb}, ${address.city}`,
        type: 'SUBURB',
        name: address.suburb,
        secondary: `${address.city}, ${address.region}`,
        city: address.city,
        region: address.region,
        lat: address.lat,
        lng: address.lng,
      }
    : {
        label: address.city,
        type: 'CITY',
        name: address.city,
        secondary: address.region,
        city: address.city,
        region: address.region,
        lat: address.lat,
        lng: address.lng,
      };
}
