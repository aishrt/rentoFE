import type { Booking, BookingSummary, CheckoutReadiness, PaymentSession } from '@/api/types';
import { quote, vehicleDetail } from '@/features/vehicles/test-fixtures';

/*
 * Test data for the booking tests, shaped like the API's responses (src/api/schema.d.ts). Only imported by
 * tests.
 */

const HOUR = 3_600_000;

/** A booking as its Guest sees it: an Instant Book trip in the RAV4 that's holding its dates. */
export function booking(overrides: Partial<Booking> = {}): Booking {
  const car = vehicleDetail();
  const priced = quote();
  return {
    id: 'bk1',
    ref: 'RV-7K2Q9M',
    status: 'PAYMENT_PENDING',
    role: 'GUEST',
    instantBook: true,
    vehicle: { id: car.id, slug: car.slug, title: car.title, photoUrl: car.photos[0]!.url },
    start: priced.start,
    end: priced.end,
    days: priced.days,
    pickup: { ...car.deliveryOptions[0]! },
    dropoff: { ...car.deliveryOptions[1]! },
    protectionPlan: {
      code: 'BASIC',
      name: 'Basic',
      excessCents: 300_000,
      coverSummary: 'Damage and theft cover with a $3,000 excess.',
      mandatory: true,
      priceCents: 12_000,
    },
    cancellationTier: car.cancellationTier,
    lineItems: priced.lineItems,
    price: priced.price,
    holdExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    guest: {
      firstName: 'Kiri',
      verified: true,
      rating: { avg: 0, count: 0 },
      tripCount: 1,
    },
    host: {
      firstName: 'Liam',
      verified: true,
      rating: { avg: 4.75, count: 4 },
      tripCount: 4,
      responseRate: 100,
    },
    payment: null,
    cancellation: null,
    actions: { pay: true, cancel: false, withdraw: false, accept: false, decline: false },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/** The same booking once it's confirmed: the exact address, the plate and the Host's mobile appear. */
export function confirmedBooking(overrides: Partial<Booking> = {}): Booking {
  const base = booking();
  return booking({
    status: 'CONFIRMED',
    holdExpiresAt: undefined,
    vehicle: { ...base.vehicle, regoPlate: 'RAV422' },
    pickup: {
      ...base.pickup,
      address: '12 Hawthorne Drive, Frankton, Queenstown 9300',
      instructions: 'Keys in the lockbox.',
    },
    host: { ...base.host, phone: '+64211234567' },
    payment: { status: 'SUCCEEDED' },
    actions: { pay: false, cancel: true, withdraw: false, accept: false, decline: false },
    ...overrides,
  });
}

export function summary(overrides: Partial<BookingSummary> = {}): BookingSummary {
  return {
    id: 'bk1',
    ref: 'RV-7K2Q9M',
    status: 'CONFIRMED',
    instantBook: true,
    vehicle: {
      slug: '2022-toyota-rav4-queenstown',
      title: '2022 Toyota RAV4',
      photoUrl: 'https://images.test/rav4-front.webp',
    },
    start: new Date(Date.now() + 10 * 24 * HOUR).toISOString(),
    end: new Date(Date.now() + 13 * 24 * HOUR).toISOString(),
    otherParty: { firstName: 'Liam' },
    amountCents: 50_650,
    ...overrides,
  };
}

export function readiness(overrides: Partial<CheckoutReadiness> = {}): CheckoutReadiness {
  return {
    emailVerified: true,
    phoneVerified: true,
    phone: '+64211234567',
    licence: {
      class: 'NZ_FULL',
      country: 'New Zealand',
      numberEnding: '456',
      expiry: '2031-05-01',
      status: 'APPROVED',
    },
    hasDateOfBirth: true,
    identityStatus: 'NONE',
    identityProcessing: false,
    problems: [],
    ...overrides,
  };
}

export function paymentSession(overrides: Partial<PaymentSession> = {}): PaymentSession {
  return {
    clientSecret: 'pi_123_secret_abc',
    customerSessionClientSecret: 'cuss_secret_abc',
    amountCents: 105_080,
    currency: 'nzd',
    captureMethod: 'automatic',
    verificationInReview: false,
    holdExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    ...overrides,
  };
}
