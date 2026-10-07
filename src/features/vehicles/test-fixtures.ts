import { vi } from 'vitest';
import type { Quote, SearchResults, VehicleCard, VehicleDetail } from '@/api/types';

/*
 * Test data for the search and listing tests, shaped like the API's responses (src/api/schema.d.ts).
 * Only imported by tests.
 */

export function carCard(overrides: Partial<VehicleCard> = {}): VehicleCard {
  return {
    id: 'car-cx5',
    slug: '2020-mazda-cx-5-auckland',
    title: '2020 Mazda CX-5',
    make: 'Mazda',
    model: 'CX-5',
    year: 2020,
    variant: 'GSX',
    photo: { url: 'https://images.test/cx5-front.webp', alt: '2020 Mazda CX-5: front' },
    suburb: 'Mount Eden',
    city: 'Auckland',
    distanceKm: 4.2,
    rating: { avg: 4.86, count: 12 },
    tripCount: 38,
    dailyCents: 8_900,
    estimate: null,
    instantBook: true,
    delivery: true,
    airportDelivery: false,
    bodyType: 'SUV',
    fuelType: 'HYBRID',
    transmission: 'AUTOMATIC',
    seats: 5,
    unlimitedKm: false,
    petFriendly: false,
    childSeat: true,
    features: ['Apple CarPlay', 'Roof rails'],
    ...overrides,
  };
}

export function searchResults(overrides: Partial<SearchResults> = {}): SearchResults {
  const results = overrides.results ?? [carCard()];
  return {
    results,
    total: results.length,
    page: 1,
    pageSize: 24,
    place: { label: 'Auckland', type: 'CITY', lat: -36.8485, lng: 174.7633 },
    radiusKm: 25,
    dates: null,
    placeNotFound: false,
    ...overrides,
  };
}

export function vehicleDetail(overrides: Partial<VehicleDetail> = {}): VehicleDetail {
  return {
    id: 'car-rav4',
    slug: '2022-toyota-rav4-queenstown',
    title: '2022 Toyota RAV4',
    make: 'Toyota',
    model: 'RAV4',
    year: 2022,
    variant: 'GXL Hybrid AWD',
    bodyType: 'SUV',
    fuelType: 'HYBRID',
    transmission: 'AUTOMATIC',
    seats: 5,
    doors: 5,
    features: ['AWD', 'Ski rack'],
    powertrain: { engineCc: 2487, cylinders: 4, description: '2.5L petrol hybrid, AWD' },
    fuelPolicy: 'SAME_LEVEL',
    kmAllowancePerDay: 250,
    unlimitedKm: false,
    extraKmCents: 40,
    petFriendly: false,
    childSeat: false,
    pricing: { dailyCents: 11_500, weeklyDiscountPct: 10, monthlyDiscountPct: 20 },
    rules: { minDays: 1, maxDays: 30, minNoticeHours: 4, bufferHours: 2, instantBook: true },
    cancellationTier: {
      code: 'MODERATE',
      name: 'Moderate',
      summary: 'Full refund up to 5 days before pickup, 50% up to 24 hours before, then no refund.',
      refunds: [
        { minHoursBefore: 120, refundPct: 100 },
        { minHoursBefore: 24, refundPct: 50 },
        { minHoursBefore: 0, refundPct: 0 },
      ],
    },
    photos: [
      { id: 'p1', type: 'FRONT', url: 'https://images.test/rav4-front.webp', alt: '2022 Toyota RAV4: front' },
      { id: 'p2', type: 'REAR', url: 'https://images.test/rav4-rear.webp', alt: '2022 Toyota RAV4: rear' },
      {
        id: 'p3',
        type: 'INTERIOR',
        url: 'https://images.test/rav4-interior.webp',
        alt: '2022 Toyota RAV4: interior',
      },
    ],
    compliance: {
      rego: { status: 'CURRENT', expiresMonth: '2026-12' },
      inspection: { kind: 'WOF', status: 'CURRENT', expiresMonth: '2027-03' },
      ruc: { required: false, recorded: false },
    },
    location: {
      suburb: 'Frankton',
      city: 'Queenstown',
      region: 'Otago',
      approx: { lat: -45.0168, lng: 168.7307, radiusM: 1000 },
      mapUrl: null,
    },
    deliveryOptions: [
      {
        id: 'opt-pickup',
        type: 'PICKUP',
        label: 'Pickup in Frankton',
        feeCents: 0,
        area: 'Frankton, Queenstown',
      },
      {
        id: 'opt-airport',
        type: 'AIRPORT',
        label: 'Queenstown Airport',
        feeCents: 2_000,
        airportCode: 'ZQN',
      },
    ],
    protectionPlans: [
      {
        code: 'BASIC',
        name: 'Basic',
        dailyPriceCents: 1_500,
        excessCents: 300_000,
        coverSummary: 'Damage and theft cover with a $3,000 excess.',
        mandatory: true,
      },
      {
        code: 'PREMIUM',
        name: 'Premium',
        dailyPriceCents: 4_500,
        excessCents: 50_000,
        coverSummary: 'Damage and theft cover with a $500 excess.',
        mandatory: false,
      },
    ],
    rating: { avg: 5, count: 2 },
    tripCount: 2,
    host: {
      id: 'host-liam',
      firstName: 'Liam',
      rating: { avg: 4.75, count: 4 },
      tripCount: 4,
      responseRate: 100,
      verified: true,
      joinedYear: 2026,
      bio: 'Alpine-ready cars with ski racks and snow chains in winter.',
    },
    ...overrides,
  };
}

export function quote(overrides: Partial<Quote> = {}): Quote {
  const vehicle = vehicleDetail();
  return {
    available: true,
    problems: [],
    start: '2026-11-30T21:00:00.000Z',
    end: '2026-12-08T21:00:00.000Z',
    days: 8,
    lineItems: [
      { code: 'RENTAL', label: '8 days × $115', amountCents: 92_000, gstCents: 12_000, mandatory: true },
      {
        code: 'WEEKLY_DISCOUNT',
        label: 'Weekly discount (10%)',
        amountCents: -9_200,
        gstCents: -1_200,
        mandatory: true,
      },
      { code: 'SERVICE_FEE', label: 'Service fee', amountCents: 8_280, gstCents: 1_080, mandatory: true },
      {
        code: 'PROTECTION',
        label: 'Basic protection (8 × $15)',
        amountCents: 12_000,
        gstCents: 1_565,
        mandatory: true,
      },
      {
        code: 'RETURN_DELIVERY',
        label: 'Airport return: Queenstown Airport',
        amountCents: 2_000,
        gstCents: 261,
        mandatory: false,
      },
    ],
    price: {
      subtotalCents: 82_800,
      deliveryCents: 2_000,
      serviceFeeCents: 8_280,
      protectionCents: 12_000,
      gstCents: 13_706,
      totalCents: 105_080,
      mandatoryCents: 103_080,
      optionalCents: 2_000,
    },
    protectionPlan: vehicle.protectionPlans[0] as Quote['protectionPlan'],
    pickup: vehicle.deliveryOptions[0]!,
    dropoff: vehicle.deliveryOptions[1]!,
    instantBook: true,
    cancellationTier: vehicle.cancellationTier,
    ...overrides,
  };
}

export const policies = {
  fees: { guestServiceFeePct: 10, hostCommissionPct: 20, gstRatePct: 15 },
  cancellation: { tiers: [], hostSelectableTiers: [], defaultTier: 'MODERATE', hostCancellationFeeCents: 0 },
  protectionPlans: [],
  eligibility: {
    minAge: 21,
    minYearsLicensed: 1,
    acceptedLicenceClasses: ['NZ_FULL'],
    overseasNeedsEnglishProof: true,
  },
  vehicles: {
    requiredDocuments: [],
    requiredPhotoAngles: [],
    vinOrChassisRequired: true,
    minPhotoWidthPx: 1200,
    minPhotoHeightPx: 800,
    seats: { min: 2, max: 12 },
    doors: { min: 2, max: 5 },
    dailyPriceCents: { min: 2_000, max: 200_000 },
    maxDiscountPct: 50,
  },
  search: { maxTripDays: 90, radiusKm: { min: 5, default: 25, max: 300 } },
  hostEstimator: { bookedDaysPerMonth: 10, dailyCentsByBodyType: {} },
  reviews: { windowDays: 14 },
  trips: { lateReturnGraceMinutes: 30 },
};

export interface SentRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body?: unknown;
}

type Route = (request: SentRequest) => { status: number; body?: unknown } | undefined;

/**
 * Replaces fetch with a function that sees each request's method, path (after /api/v1), query and body,
 * so one handler can answer differently per query. Unanswered requests fail the test loudly.
 */
export function mockRoutes(route: Route) {
  const sent: SentRequest[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined;
    const url = new URL(request?.url ?? String(input));
    const method = request?.method ?? init?.method ?? 'GET';
    const text = request ? await request.text() : typeof init?.body === 'string' ? init.body : '';
    const entry: SentRequest = {
      method,
      path: url.pathname.replace(/^\/api\/v1/, ''),
      query: url.searchParams,
      body: text ? JSON.parse(text) : undefined,
    };
    sent.push(entry);
    const answer = route(entry);
    if (!answer) throw new Error(`Unexpected request: ${method} ${entry.path}?${url.searchParams}`);
    return new Response(answer.body === undefined ? null : JSON.stringify(answer.body), {
      status: answer.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return sent;
}
