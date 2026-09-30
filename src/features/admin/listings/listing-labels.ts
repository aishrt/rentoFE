import type { CalendarBlock, HostApplication, HostVehicle, ReviewQueueItem } from '@/api/types';

/*
 * Words for the codes the staff approval queues show (plan §9, Days 8–11). NZ English throughout
 * (plan §12.7). The public listing pages have their own, shorter labels in features/vehicles.
 */

export type VehicleStatus = HostVehicle['status'];
export type HostStatus = HostApplication['status'];
/** A listing's Host status, or null for an account that never applied. */
export type QueueHostStatus = ReviewQueueItem['host']['status'];
export type Photo = HostVehicle['photos'][number];
export type PhotoType = Photo['type'];
export type VehicleDocument = HostVehicle['documents'][number];
export type DocumentType = VehicleDocument['type'];
export type DeliveryOption = HostVehicle['deliveryOptions'][number];
export type BlockReason = CalendarBlock['reason'];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under review',
  CHANGES_REQUESTED: 'Changes requested',
  REJECTED: 'Rejected',
  ACTIVE: 'Live',
  INACTIVE: 'Live, switched off',
  SUSPENDED: 'Suspended',
};

export const HOST_STATUS_LABELS: Record<HostStatus, string> = {
  APPLIED: 'Applied',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  SUSPENDED: 'Suspended',
};

/** "Approved", or "No Host application" for an account that never applied. */
export const hostStatusLabel = (status: QueueHostStatus) =>
  status ? HOST_STATUS_LABELS[status] : 'No Host application';

export const BODY_TYPE_LABELS: Record<NonNullable<HostVehicle['bodyType']>, string> = {
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

export const FUEL_LABELS: Record<NonNullable<HostVehicle['fuelType']>, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  HYBRID: 'Hybrid',
  PHEV: 'Plug-in hybrid',
  EV: 'Electric',
};

export const TRANSMISSION_LABELS: Record<NonNullable<HostVehicle['transmission']>, string> = {
  AUTOMATIC: 'Automatic',
  MANUAL: 'Manual',
};

export const FUEL_POLICY_LABELS: Record<HostVehicle['fuelPolicy'], string> = {
  SAME_LEVEL: 'Return with the same fuel or charge',
  FULL: 'Return full',
};

/** The spec's photo angles (spec §6), in the order the Host takes them. */
export const PHOTO_ANGLES: readonly PhotoType[] = [
  'FRONT',
  'REAR',
  'DRIVER',
  'PASSENGER',
  'INTERIOR',
  'DASH',
  'BOOT',
  'TYRES',
  'DAMAGE',
];

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

export const PHOTO_STATUS_LABELS: Record<Photo['status'], string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/** The browser's automatic checks when the Host uploaded it, or a photo staff rejected (plan §9, Days 8–11). */
export const QUALITY_FLAG_LABELS: Record<Exclude<Photo['qualityFlag'], 'OK'>, string> = {
  LOW_RES: 'May be too small',
  DARK: 'May be too dark',
  BLURRY: 'May be blurry',
  ADMIN_FLAGGED: 'Flagged by staff',
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  REGO: 'Registration',
  WOF: 'Warrant of Fitness (WOF)',
  COF: 'Certificate of Fitness (CoF)',
  RUC: 'Road User Charges licence',
  INSURANCE: 'Insurance',
  OWNER_CONSENT: "Registered owner's consent",
  OTHER: 'Other document',
};

/** The same, as they read mid-sentence: "Verify the WOF". */
export const DOCUMENT_NAMES: Record<DocumentType, string> = {
  REGO: 'registration',
  WOF: 'WOF',
  COF: 'CoF',
  RUC: 'Road User Charges licence',
  INSURANCE: 'insurance',
  OWNER_CONSENT: "registered owner's consent",
  OTHER: 'other document',
};

export const DOCUMENT_STATUS_LABELS: Record<VehicleDocument['status'], string> = {
  PENDING: 'Waiting',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const DELIVERY_LABELS: Record<DeliveryOption['type'], string> = {
  PICKUP: 'Pick-up from the Host',
  DELIVERY: 'Delivery',
  AIRPORT: 'Airport delivery',
  CUSTOM: 'Custom location',
};

/** The six onboarding steps the checklist's missing items belong to (plan §9, Days 8–11). */
export const ONBOARDING_STEPS: Record<number, string> = {
  1: 'Vehicle details',
  2: 'Documents',
  3: 'Photos',
  4: 'Pricing',
  5: 'Availability',
  6: 'Pick-up and delivery',
};

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  BOOKED: 'Trip',
  HOLD: 'Held for a guest',
  HOST_BLOCK: 'Blocked by the Host',
  RECURRING: 'Recurring unavailability',
  BUFFER: 'Preparation time',
  ADMIN: 'Blocked by staff',
};

/** The blocks staff may remove (the API's rule): never a trip's dates, hold or preparation time. */
export const REMOVABLE_BLOCKS: readonly BlockReason[] = ['ADMIN', 'HOST_BLOCK', 'RECURRING'];

/** "FLEXIBLE" → "Flexible": the policy engine's tier codes read as words. */
export const tierLabel = (code: string) => code.charAt(0) + code.slice(1).toLowerCase().replaceAll('_', ' ');
