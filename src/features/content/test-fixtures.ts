import type { Faq, LegalPage, PublicPolicies } from '@/api/types';

/* Test data for the public content pages: the launch defaults from the backend's default-settings.ts. */

export const policiesFixture: PublicPolicies = {
  fees: { guestServiceFeePct: 10, hostCommissionPct: 20, gstRatePct: 15 },
  cancellation: {
    tiers: [
      {
        code: 'FLEXIBLE',
        name: 'Flexible',
        summary: 'Full refund up to 24 hours before pickup, then 50%.',
        refunds: [
          { minHoursBefore: 24, refundPct: 100 },
          { minHoursBefore: 0, refundPct: 50 },
        ],
      },
      {
        code: 'MODERATE',
        name: 'Moderate',
        summary: 'Full refund up to 5 days before pickup, 50% up to 24 hours before, then no refund.',
        refunds: [
          { minHoursBefore: 120, refundPct: 100 },
          { minHoursBefore: 24, refundPct: 50 },
          { minHoursBefore: 0, refundPct: 0 },
        ],
      },
      {
        code: 'STRICT',
        name: 'Strict',
        summary: 'Full refund up to 14 days before pickup, 50% up to 7 days before, then no refund.',
        refunds: [
          { minHoursBefore: 336, refundPct: 100 },
          { minHoursBefore: 168, refundPct: 50 },
          { minHoursBefore: 0, refundPct: 0 },
        ],
      },
    ],
    hostSelectableTiers: ['FLEXIBLE', 'MODERATE', 'STRICT'],
    defaultTier: 'MODERATE',
    hostCancellationFeeCents: 0,
  },
  protectionPlans: [
    {
      code: 'BASIC',
      name: 'Basic',
      dailyPriceCents: 1500,
      excessCents: 300_000,
      coverSummary: 'Damage and theft cover with a $3,000 excess.',
      mandatory: true,
    },
    {
      code: 'STANDARD',
      name: 'Standard',
      dailyPriceCents: 2900,
      excessCents: 150_000,
      coverSummary: 'Damage and theft cover with a $1,500 excess.',
      mandatory: false,
    },
    {
      code: 'PREMIUM',
      name: 'Premium',
      dailyPriceCents: 4500,
      excessCents: 50_000,
      coverSummary: 'Damage and theft cover with a $500 excess.',
      mandatory: false,
    },
  ],
  roadsideAssistance: { phone: '' },
  eligibility: {
    minAge: 21,
    minYearsLicensed: 1,
    acceptedLicenceClasses: ['NZ_FULL', 'OVERSEAS'],
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
    dailyPriceCents: { min: 2000, max: 200_000 },
    maxDiscountPct: 50,
  },
  search: { maxTripDays: 90, radiusKm: { min: 5, default: 25, max: 300 } },
  hostEstimator: {
    bookedDaysPerMonth: 10,
    dailyCentsByBodyType: {
      HATCHBACK: 6000,
      SEDAN: 7000,
      WAGON: 7500,
      SUV: 9500,
      UTE: 10_000,
      VAN: 11_000,
      PEOPLE_MOVER: 11_000,
      COUPE: 12_000,
      CONVERTIBLE: 13_000,
    },
  },
  reviews: { windowDays: 14 },
  trips: { lateReturnGraceMinutes: 30 },
};

export const faqsFixture: Faq[] = [
  {
    id: 'f1',
    question: 'How is Rento Vroom different from a rental company?',
    answer: 'Every car belongs to a local host, not a rental fleet.',
    category: 'Getting started',
    audience: 'ALL',
  },
  {
    id: 'f2',
    question: 'Who can rent a car?',
    answer: 'You need a valid driver licence and to complete our verification checks.',
    category: 'Booking',
    audience: 'GUEST',
  },
  {
    id: 'f3',
    question: 'How do I list my car?',
    answer: 'Choose Become a Host, then add your car in six guided steps.',
    category: 'Hosting',
    audience: 'HOST',
  },
  {
    id: 'f4',
    question: 'Can I cancel a booking?',
    answer: 'Yes. Each listing shows its cancellation policy before you book.',
    category: 'Booking',
    audience: 'ALL',
  },
  {
    id: 'f5',
    question: 'When do hosts get paid?',
    answer: 'Your earnings for a trip are released after the trip starts.',
    category: 'Hosting',
    audience: 'HOST',
  },
];

export function legalPageFixture(overrides: Partial<LegalPage> = {}): LegalPage {
  return {
    key: 'legal.terms',
    version: '2026-09-28',
    title: 'Terms & Conditions',
    markdown: '# Terms & Conditions\n\n*This is placeholder text.*\n\n## Using Rento Vroom\n\nBe kind.',
    updatedAt: '2026-09-28T10:03:51.714Z',
    ...overrides,
  };
}
