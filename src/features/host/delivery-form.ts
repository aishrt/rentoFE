import type { FieldPath } from 'react-hook-form';
import { z } from 'zod';
import type { DeliveryOptionInput, HostVehicle } from '@/api/types';
import {
  addressPartsOf,
  emptyPlace,
  hasCoordinates,
  placeFromAddress,
  type PlaceChoice,
} from './place-choice';
import { NZ_REGIONS, type NzRegion } from './vehicle-labels';

/*
 * Step 6, pickup and delivery (plan §9, Days 8–11): where guests collect the car, and the ways it can come
 * to them. Addresses use the structured NZ format with coordinates (plan §3, Key rules); the suburb or town
 * comes from our places, so the car can be found in search from there.
 */

const placeSchema = z.object({
  label: z.string(),
  id: z.string().optional(),
  type: z.enum(['CITY', 'SUBURB', 'AIRPORT', 'DESTINATION', 'ADDRESS']).optional(),
  name: z.string().optional(),
  secondary: z.string().optional(),
  code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const addressSchema = z.object({
  unit: z.string().trim().max(20, 'Keep it under 20 characters'),
  streetNumber: z.string().trim().max(20, 'Keep it under 20 characters'),
  street: z.string().trim().max(120, 'Keep it under 120 characters'),
  place: placeSchema,
  region: z.string(),
  postcode: z.string().trim(),
});

const money = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (/^\$?\d+(\.\d{1,2})?$/.test(value) && Number(value.replace('$', '')) <= 500),
    'Enter a fee up to $500, or leave it empty for free',
  );
const instructions = z.string().trim().max(1000, 'Keep it under 1,000 characters');

export const deliverySchema = z
  .object({
    pickup: z.object({ id: z.string().optional(), address: addressSchema, instructions }),
    airports: z.array(
      z.object({ id: z.string().optional(), airport: placeSchema, fee: money, instructions }),
    ),
    delivery: z.object({
      enabled: z.boolean(),
      id: z.string().optional(),
      radiusKm: z.string().trim(),
      fee: money,
      instructions,
    }),
    custom: z.array(
      z.object({
        id: z.string().optional(),
        label: z.string().trim(),
        address: addressSchema,
        fee: money,
        instructions,
      }),
    ),
  })
  .superRefine((values, context) => {
    const issue = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message });
    const checkAddress = (address: AddressValues, path: (string | number)[]) => {
      if (address.street.length < 2) issue([...path, 'street'], 'Enter the street');
      if (!hasCoordinates(address.place))
        issue([...path, 'place'], 'Choose the suburb or town from the list');
      if (!address.region) issue([...path, 'region'], 'Choose a region');
      if (!/^\d{4}$/.test(address.postcode)) issue([...path, 'postcode'], 'NZ postcodes have 4 digits');
    };

    const others = values.airports.length > 0 || values.delivery.enabled || values.custom.length > 0;
    if (isBlankAddress(values.pickup.address)) {
      if (others)
        issue(
          ['pickup', 'address', 'street'],
          'Add the pickup address first: delivery options start from it',
        );
    } else {
      checkAddress(values.pickup.address, ['pickup', 'address']);
    }
    values.airports.forEach((airport, index) => {
      if (!airport.airport.code) issue(['airports', index, 'airport'], 'Choose an airport from the list');
    });
    if (values.delivery.enabled) {
      const radius = Number(values.delivery.radiusKm);
      if (!/^\d+$/.test(values.delivery.radiusKm) || radius < 1 || radius > 100) {
        issue(['delivery', 'radiusKm'], 'Enter 1–100 km');
      }
    }
    values.custom.forEach((point, index) => {
      if (point.label.length < 2) issue(['custom', index, 'label'], 'Name this point, e.g. "Ferry terminal"');
      checkAddress(point.address, ['custom', index, 'address']);
    });
  });

export type DeliveryValues = z.infer<typeof deliverySchema>;
export type AddressValues = z.infer<typeof addressSchema>;

export const emptyAddress: AddressValues = {
  unit: '',
  streetNumber: '',
  street: '',
  place: emptyPlace,
  region: '',
  postcode: '',
};

export const isBlankAddress = (address: AddressValues) =>
  !address.unit && !address.streetNumber && !address.street && !address.place.label && !address.postcode;

const dollars = (cents: number) => (cents ? String(Number((cents / 100).toFixed(2))) : '');
const cents = (value: string) => (value ? Math.round(Number(value.replace('$', '')) * 100) : 0);

function addressValues(address: HostVehicle['deliveryOptions'][number]['address']): AddressValues {
  if (!address) return emptyAddress;
  return {
    unit: address.unit ?? '',
    streetNumber: address.streetNumber ?? '',
    street: address.street,
    place: placeFromAddress(address),
    region: address.region,
    postcode: address.postcode,
  };
}

export function deliveryDefaults(vehicle: HostVehicle): DeliveryValues {
  const options = vehicle.deliveryOptions;
  const pickup = options.find((option) => option.type === 'PICKUP');
  const delivery = options.find((option) => option.type === 'DELIVERY');
  return {
    pickup: {
      id: pickup?.id,
      address: addressValues(pickup?.address),
      instructions: pickup?.instructions ?? '',
    },
    airports: options
      .filter((option) => option.type === 'AIRPORT')
      .map((option) => ({
        id: option.id,
        airport: {
          label: option.airportCode ? `${option.label} (${option.airportCode})` : option.label,
          type: 'AIRPORT' as const,
          name: option.label,
          code: option.airportCode,
        },
        fee: dollars(option.feeCents),
        instructions: option.instructions ?? '',
      })),
    delivery: {
      enabled: Boolean(delivery),
      id: delivery?.id,
      radiusKm: delivery?.radiusKm === undefined ? '' : String(delivery.radiusKm),
      fee: dollars(delivery?.feeCents ?? 0),
      instructions: delivery?.instructions ?? '',
    },
    custom: options
      .filter((option) => option.type === 'CUSTOM')
      .map((option) => ({
        id: option.id,
        label: option.label,
        address: addressValues(option.address),
        fee: dollars(option.feeCents),
        instructions: option.instructions ?? '',
      })),
  };
}

function apiAddress(address: AddressValues): NonNullable<DeliveryOptionInput['address']> {
  const place = address.place as PlaceChoice & { lat: number; lng: number };
  const parts = addressPartsOf(place);
  return {
    ...(address.unit && { unit: address.unit }),
    ...(address.streetNumber && { streetNumber: address.streetNumber }),
    street: address.street,
    ...(parts.suburb && { suburb: parts.suburb }),
    city: parts.city ?? place.label,
    region: address.region as NzRegion,
    postcode: address.postcode,
    lat: place.lat,
    lng: place.lng,
  };
}

const withInstructions = (text: string) => (text ? { instructions: text } : {});

/** Where each option sent to the API sits in the form, so its field errors land in the right place. */
type OptionSource = 'pickup' | `airports.${number}` | 'delivery' | `custom.${number}`;

/**
 * The delivery options to save, in order, with where each came from. Existing options keep their `id`,
 * because bookings refer to them. Without a pickup address and anything else, there's nothing to save yet.
 */
export function deliveryPatch(values: DeliveryValues): {
  options?: DeliveryOptionInput[];
  sources: OptionSource[];
} {
  const others = values.airports.length > 0 || values.delivery.enabled || values.custom.length > 0;
  if (isBlankAddress(values.pickup.address) && !others) return { sources: [] };

  const options: DeliveryOptionInput[] = [];
  const sources: OptionSource[] = [];
  const add = (source: OptionSource, option: DeliveryOptionInput) => {
    options.push(option);
    sources.push(source);
  };

  add('pickup', {
    ...(values.pickup.id && { id: values.pickup.id }),
    type: 'PICKUP',
    address: apiAddress(values.pickup.address),
    feeCents: 0,
    ...withInstructions(values.pickup.instructions),
  });
  values.airports.forEach((airport, index) =>
    add(`airports.${index}`, {
      ...(airport.id && { id: airport.id }),
      type: 'AIRPORT',
      airportCode: airport.airport.code,
      feeCents: cents(airport.fee),
      ...withInstructions(airport.instructions),
    }),
  );
  if (values.delivery.enabled) {
    add('delivery', {
      ...(values.delivery.id && { id: values.delivery.id }),
      type: 'DELIVERY',
      radiusKm: Number(values.delivery.radiusKm),
      feeCents: cents(values.delivery.fee),
      ...withInstructions(values.delivery.instructions),
    });
  }
  values.custom.forEach((point, index) =>
    add(`custom.${index}`, {
      ...(point.id && { id: point.id }),
      type: 'CUSTOM',
      label: point.label,
      address: apiAddress(point.address),
      feeCents: cents(point.fee),
      ...withInstructions(point.instructions),
    }),
  );
  return { options, sources };
}

const ADDRESS_PARTS: Record<string, keyof AddressValues> = {
  unit: 'unit',
  streetNumber: 'streetNumber',
  street: 'street',
  suburb: 'place',
  city: 'place',
  lat: 'place',
  lng: 'place',
  region: 'region',
  postcode: 'postcode',
};

/** The form field for an API key like `deliveryOptions.2.address.postcode`. */
export function deliveryFieldFor(sources: OptionSource[]) {
  return (key: string): FieldPath<DeliveryValues> | undefined => {
    const [root, index, part, detail] = key.split('.');
    if (root !== 'deliveryOptions') return undefined;
    if (index === undefined) return 'pickup.address.street';
    const source = sources[Number(index)];
    if (!source) return undefined;
    if (part === 'address') {
      if (source === 'pickup') return `pickup.address.${ADDRESS_PARTS[detail ?? ''] ?? 'street'}`;
      if (source.startsWith('custom.'))
        return `${source as `custom.${number}`}.address.${ADDRESS_PARTS[detail ?? ''] ?? 'street'}`;
    }
    if (part === 'instructions') {
      return source === 'delivery'
        ? 'delivery.instructions'
        : (`${source}.instructions` as FieldPath<DeliveryValues>);
    }
    if (part === 'feeCents' && source !== 'pickup') return `${source}.fee` as FieldPath<DeliveryValues>;
    if (part === 'airportCode' && source.startsWith('airports.'))
      return `${source as `airports.${number}`}.airport`;
    if (part === 'radiusKm' && source === 'delivery') return 'delivery.radiusKm';
    if (part === 'label' && source.startsWith('custom.')) return `${source as `custom.${number}`}.label`;
    return undefined;
  };
}

export const regionOptions = NZ_REGIONS.map((region) => ({ value: region, label: region }));
