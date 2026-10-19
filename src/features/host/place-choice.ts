import type { NzAddressInput, PlaceSuggestion } from '@/api/types';
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
  /** Google places: the suburb and postcode, when Google knows them. */
  suburb?: string;
  postcode?: string;
  /** A street address from Google, in the structured NZ format (plan §3). */
  address?: NzAddressInput;
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
 * (Auckland, Wellington). A place from Google carries its parts.
 */
export function addressPartsOf(place: PlaceChoice): { suburb?: string; city?: string; region?: NzRegion } {
  if (place.type === 'ADDRESS') {
    return {
      suburb: place.address?.suburb ?? place.suburb,
      city: place.address?.city ?? place.city,
      region: place.address?.region ?? place.region,
    };
  }
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

/** The address fields a chosen place fills in, by name. */
export interface AddressFill {
  unit?: string;
  streetNumber?: string;
  street?: string;
  suburb?: string;
  city?: string;
  region?: NzRegion;
  postcode?: string;
}

/**
 * What a chosen place fills in (plan §3): a street address from Google fills every part, and a suburb or
 * town fills its area and keeps the street typed so far. Nothing until the place has its coordinates.
 */
export function addressFromPlace(place: PlaceChoice): AddressFill {
  if (!hasCoordinates(place)) return {};
  if (place.address) {
    const { unit, streetNumber, street, suburb, city, region, postcode } = place.address;
    return {
      unit: unit ?? '',
      streetNumber: streetNumber ?? '',
      street,
      suburb: suburb ?? '',
      city,
      region,
      postcode,
    };
  }
  const area = addressPartsOf(place);
  return {
    suburb: area.suburb ?? '',
    city: area.city ?? '',
    ...(area.region && { region: area.region }),
    ...(place.postcode && { postcode: place.postcode }),
  };
}

/** The address field's text for a saved address: "2B/12 Ponsonby Road, Ponsonby, Auckland 1011". */
export function placeFromAddress(address: NzAddressInput & { lat: number; lng: number }): PlaceChoice {
  const street = `${address.unit ? `${address.unit}/` : ''}${address.streetNumber ?? ''} ${address.street}`;
  return {
    label: [street.trim(), address.suburb, `${address.city} ${address.postcode}`].filter(Boolean).join(', '),
    type: 'ADDRESS',
    name: street.trim(),
    city: address.city,
    region: address.region,
    ...(address.suburb && { suburb: address.suburb }),
    postcode: address.postcode,
    address,
    lat: address.lat,
    lng: address.lng,
  };
}
