import type { HostVehicle, PublicPolicies, SessionUser } from '@/api/types';

/*
 * Sample API data for the Host pages' tests. Plain data only, so it type-checks with the app and can't
 * drift from the API's shapes.
 */

export const hostUser: SessionUser = {
  id: 'u3',
  email: 'aroha@example.co.nz',
  firstName: 'Aroha',
  lastName: 'Host',
  roles: ['GUEST', 'HOST'],
  emailVerified: true,
  phone: '+64211234567',
  phoneVerified: true,
  mfaEnabled: false,
  hostStatus: 'APPLIED',
  pendingAgreements: [],
};

export const samplePolicies: PublicPolicies = {
  fees: { guestServiceFeePct: 10, hostCommissionPct: 20, gstRatePct: 15 },
  cancellation: {
    tiers: [
      {
        code: 'FLEXIBLE',
        name: 'Flexible',
        summary: 'Full refund up to 24 hours before pickup, then 50%.',
        refunds: [],
      },
      {
        code: 'MODERATE',
        name: 'Moderate',
        summary: 'Full refund up to 5 days before pickup, 50% up to 24 hours before, then no refund.',
        refunds: [],
      },
      {
        code: 'STRICT',
        name: 'Strict',
        summary: 'Full refund up to 14 days before pickup, 50% up to 7 days before, then no refund.',
        refunds: [],
      },
    ],
    hostSelectableTiers: ['FLEXIBLE', 'MODERATE', 'STRICT'],
    defaultTier: 'MODERATE',
    hostCancellationFeeCents: 0,
  },
  protectionPlans: [],
  eligibility: {
    minAge: 21,
    minYearsLicensed: 1,
    acceptedLicenceClasses: ['NZ_FULL'],
    overseasNeedsEnglishProof: true,
  },
  vehicles: {
    requiredDocuments: ['REGO', 'WOF', 'INSURANCE'],
    requiredPhotoAngles: ['FRONT', 'REAR', 'DRIVER', 'PASSENGER', 'INTERIOR', 'DASH', 'BOOT', 'TYRES'],
    vinOrChassisRequired: true,
    minPhotoWidthPx: 1200,
    minPhotoHeightPx: 800,
    seats: { min: 2, max: 12 },
    doors: { min: 2, max: 5 },
    dailyPriceCents: { min: 2000, max: 200000 },
    maxDiscountPct: 50,
  },
  search: { maxTripDays: 90, radiusKm: { min: 5, default: 25, max: 300 } },
  hostEstimator: { bookedDaysPerMonth: 10, dailyCentsByBodyType: { HATCHBACK: 6000 } },
  reviews: { windowDays: 14 },
  trips: { lateReturnGraceMinutes: 30 },
};

/** A fresh draft, as POST /host/vehicles answers, with any fields replaced. */
export function sampleVehicle(overrides: Partial<HostVehicle> = {}): HostVehicle {
  return {
    id: 'v1',
    slug: 'draft-v1',
    title: 'Untitled car',
    status: 'DRAFT',
    onboardingStep: 1,
    features: [],
    petFriendly: false,
    childSeat: false,
    ownerIsHost: true,
    unlimitedKm: false,
    fuelPolicy: 'SAME_LEVEL',
    rules: {
      minDays: 1,
      maxDays: 30,
      minNoticeHours: 12,
      bufferHours: 2,
      instantBook: false,
      cancellationTier: 'MODERATE',
    },
    photos: [],
    documents: [],
    deliveryOptions: [],
    recurringRules: [],
    rating: { avg: 0, count: 0 },
    tripCount: 0,
    checklist: { complete: false, missing: [], flags: [] },
    createdAt: '2026-09-30T00:00:00.000Z',
    updatedAt: '2026-09-30T00:00:00.000Z',
    ...overrides,
  };
}
