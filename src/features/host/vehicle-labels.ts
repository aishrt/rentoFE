import type { AddressWithPoint, CalendarBlock, HostVehicle } from '@/api/types';

/*
 * Words for the codes the Host sees while listing a car (plan §9, Days 8–11), in NZ English
 * (plan §12.7). The staff queues have their own, more technical labels in features/admin.
 */

export type VehicleStatus = HostVehicle['status'];
export type BodyType = NonNullable<HostVehicle['bodyType']>;
export type FuelType = NonNullable<HostVehicle['fuelType']>;
export type Transmission = NonNullable<HostVehicle['transmission']>;
export type FuelPolicy = HostVehicle['fuelPolicy'];
export type VehiclePhoto = HostVehicle['photos'][number];
export type PhotoType = VehiclePhoto['type'];
export type QualityFlag = VehiclePhoto['qualityFlag'];
export type VehicleDocument = HostVehicle['documents'][number];
export type DocumentType = VehicleDocument['type'];
export type DeliveryOption = HostVehicle['deliveryOptions'][number];
export type BlockReason = CalendarBlock['reason'];
export type NzRegion = AddressWithPoint['region'];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'Under review',
  CHANGES_REQUESTED: 'Changes requested',
  REJECTED: 'Not approved',
  ACTIVE: 'Live',
  INACTIVE: 'Hidden',
  SUSPENDED: 'Suspended',
};

/** Approved listings, which guests can find (or could, while hidden). */
export const isLive = (status: VehicleStatus) => status === 'ACTIVE' || status === 'INACTIVE';

/** Listings the Host is still preparing and can submit. */
export const isSubmittable = (status: VehicleStatus) => status === 'DRAFT' || status === 'CHANGES_REQUESTED';

/** Listings the Host can no longer change (the API refuses edits). */
export const isLocked = (status: VehicleStatus) => status === 'REJECTED' || status === 'SUSPENDED';

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

/** Diesel, electric and plug-in hybrid cars pay Road User Charges instead of fuel tax (plan §3). */
export const needsRuc = (fuelType?: string) =>
  fuelType === 'DIESEL' || fuelType === 'EV' || fuelType === 'PHEV';

/** Electric and plug-in hybrid cars have a battery and a range. */
export const hasBattery = (fuelType?: string) => fuelType === 'EV' || fuelType === 'PHEV';

/** The angles in the order a Host walks round the car. */
export const PHOTO_ANGLES: readonly PhotoType[] = [
  'FRONT',
  'DRIVER',
  'REAR',
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

/** What to capture for each angle, shown on its tile. NZ cars are right-hand drive. */
export const PHOTO_INSTRUCTIONS: Record<PhotoType, string> = {
  FRONT: 'Stand a few steps back, straight in front, so the whole car fits in.',
  REAR: 'From straight behind, a few steps back, with the whole car in view.',
  DRIVER: 'The right-hand side, front wheel to back wheel. Step back until it all fits.',
  PASSENGER: 'The left-hand side, the whole length of the car.',
  INTERIOR: 'Through the open back door: the seats, steering wheel and dashboard.',
  DASH: 'With the car on, so the odometer and fuel or battery level are clear.',
  BOOT: 'Boot open, showing how much space there is.',
  TYRES: 'Close up on a front tyre, so the tread is easy to see.',
  DAMAGE: 'A close-up of each dent, scratch or chip you noted, in good light.',
};

export const PHOTO_STATUS_LABELS: Record<VehiclePhoto['status'], string> = {
  PENDING: 'Waiting for approval',
  APPROVED: 'Approved',
  REJECTED: 'Needs a retake',
};

/** Advice for a photo the browser's checks, or our team, flagged (plan §9, Days 8–11). */
export const QUALITY_ADVICE: Record<Exclude<QualityFlag, 'OK'>, { title: string; advice: string }> = {
  LOW_RES: {
    title: 'This photo may be too small',
    advice: "Retake it with your phone's main camera, not a screenshot or a zoomed-in crop.",
  },
  DARK: {
    title: 'This photo looks dark',
    advice: 'Retake it in daylight or a well-lit spot, with nothing blocking the light.',
  },
  BLURRY: {
    title: 'This photo looks blurry',
    advice: 'Hold your phone steady and tap the car to focus before you take it.',
  },
  ADMIN_FLAGGED: {
    title: 'Our team flagged this photo',
    advice: 'Please retake it, following the tips on this tile.',
  },
};

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  REGO: 'Registration (rego)',
  WOF: 'Warrant of Fitness (WOF)',
  COF: 'Certificate of Fitness (CoF)',
  RUC: 'Road User Charges licence',
  INSURANCE: 'Insurance',
  OWNER_CONSENT: "Registered owner's written consent",
  OTHER: 'Other document',
};

export const DOCUMENT_HINTS: Record<DocumentType, string> = {
  REGO: 'Your current registration label or the NZTA registration certificate.',
  WOF: 'Your current WOF check sheet or label.',
  COF: 'Your current Certificate of Fitness.',
  RUC: 'Your current RUC licence, showing the distance it runs to.',
  INSURANCE: 'Your insurance certificate or policy schedule for this car.',
  OWNER_CONSENT: 'A signed letter from the registered owner saying you may rent the car out.',
  OTHER: 'Anything else our team should see, such as a service record.',
};

export const DOCUMENT_STATUS_LABELS: Record<VehicleDocument['status'], string> = {
  PENDING: 'Waiting for review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const FUEL_POLICY_LABELS: Record<FuelPolicy, string> = {
  SAME_LEVEL: 'Same level',
  FULL: 'Return full',
};

/** The six onboarding steps; the checklist's missing items say which one they belong to. */
export const ONBOARDING_STEPS = [
  { step: 1, title: 'Vehicle details', short: 'Details' },
  { step: 2, title: 'Documents', short: 'Documents' },
  { step: 3, title: 'Photos', short: 'Photos' },
  { step: 4, title: 'Pricing', short: 'Pricing' },
  { step: 5, title: 'Availability', short: 'Availability' },
  { step: 6, title: 'Pickup and delivery', short: 'Delivery' },
] as const;

export const STEP_COUNT = ONBOARDING_STEPS.length;

export const stepTitle = (step: number) => ONBOARDING_STEPS[step - 1]?.title ?? 'Your listing';

export const BLOCK_REASON_LABELS: Record<BlockReason, string> = {
  BOOKED: 'Booked',
  HOLD: 'Request pending',
  HOST_BLOCK: 'Blocked by you',
  RECURRING: 'Weekly availability',
  BUFFER: 'Preparation time',
  ADMIN: 'Blocked by Rento Vroom',
};

/** NZ regions, in the order the API lists them. */
export const NZ_REGIONS = [
  'Northland',
  'Auckland',
  'Waikato',
  'Bay of Plenty',
  'Gisborne',
  "Hawke's Bay",
  'Taranaki',
  'Manawatū-Whanganui',
  'Wellington',
  'Tasman',
  'Nelson',
  'Marlborough',
  'West Coast',
  'Canterbury',
  'Otago',
  'Southland',
] as const satisfies readonly NzRegion[];

/** "Untitled car" is the API's name for a draft without a make or model yet. */
export const vehicleDisplayTitle = (title: string) => (title === 'Untitled car' ? 'Your new listing' : title);
