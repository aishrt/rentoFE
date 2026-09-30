import type { CancellationTier, PublicPolicies } from '@/api/types';
import { formatNzdFromCents } from '@/lib/format';

/*
 * Plain-English readings of the policies in force (GET /policies), for the Cancellation Policy, Insurance,
 * Become a host and How it works pages. The numbers always come from the API, so the pages match what the
 * system charges (plan §9, Days 12–14); only the wording lives here.
 */

type Vehicles = PublicPolicies['vehicles'];
export type RequiredDocument = Vehicles['requiredDocuments'][number];
export type PhotoAngle = Vehicles['requiredPhotoAngles'][number];
export type LicenceClass = PublicPolicies['eligibility']['acceptedLicenceClasses'][number];
export type BodyType = keyof PublicPolicies['hostEstimator']['dailyCentsByBodyType'];
export type ProtectionPlan = PublicPolicies['protectionPlans'][number];

export const documentLabels: Record<RequiredDocument, string> = {
  REGO: 'Vehicle registration (rego)',
  WOF: 'Warrant of Fitness (WOF)',
  COF: 'Certificate of Fitness (CoF)',
  RUC: 'Road user charges (RUC) licence',
  INSURANCE: 'Your insurance details',
  OWNER_CONSENT: "The owner's written consent, if the car isn't registered to you",
  OTHER: 'Any other documents we ask for',
};

export const photoAngleLabels: Record<PhotoAngle, string> = {
  FRONT: 'Front',
  REAR: 'Rear',
  DRIVER: 'Driver’s side',
  PASSENGER: 'Passenger side',
  INTERIOR: 'Interior',
  DASH: 'Dashboard',
  BOOT: 'Boot',
  TYRES: 'Tyres',
  DAMAGE: 'Any existing damage',
};

export const licenceClassLabels: Record<LicenceClass, string> = {
  NZ_FULL: 'a full New Zealand licence',
  NZ_RESTRICTED: 'a restricted New Zealand licence',
  NZ_LEARNER: 'a New Zealand learner licence',
  OVERSEAS: 'an overseas licence',
};

export const bodyTypeLabels: Record<BodyType, string> = {
  HATCHBACK: 'Hatchback',
  SEDAN: 'Sedan',
  WAGON: 'Station wagon',
  SUV: 'SUV',
  UTE: 'Ute',
  VAN: 'Van',
  PEOPLE_MOVER: 'People mover',
  COUPE: 'Coupe',
  CONVERTIBLE: 'Convertible',
};

/** "a, b and c", or "a, b or c" for alternatives. */
export function listOf(items: readonly string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items.at(-1)}`;
}

// ── Eligibility ──────────────────────────────────────────────────────────────────────────────────────

/** The driver rules in force as plain sentences. */
export function eligibilityPoints(eligibility: PublicPolicies['eligibility']): string[] {
  const years = eligibility.minYearsLicensed;
  const classes = eligibility.acceptedLicenceClasses.map((type) => licenceClassLabels[type]);
  const points = [
    `Be ${eligibility.minAge} or older`,
    years > 0 ? `Have held your licence for at least ${years === 1 ? 'a year' : `${years} years`}` : null,
    classes.length > 0 ? `Hold ${listOf(classes, 'or')}` : null,
    eligibility.overseasNeedsEnglishProof && eligibility.acceptedLicenceClasses.includes('OVERSEAS')
      ? 'If your overseas licence isn’t in English, bring an International Driving Permit or an approved translation'
      : null,
  ];
  return points.filter((point): point is string => point !== null);
}

// ── Cancellation ─────────────────────────────────────────────────────────────────────────────────────

/** 24 → "24 hours", 120 → "5 days", 36 → "36 hours". */
export function formatNotice(hours: number): string {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

export function refundLabel(refundPct: number): string {
  if (refundPct >= 100) return 'Full refund';
  if (refundPct <= 0) return 'No refund';
  return `${refundPct}% refund`;
}

export interface RefundWindow {
  /** When the guest cancels, e.g. "5 days or more before pickup". */
  when: string;
  refund: string;
  refundPct: number;
}

/**
 * A tier's refund rules as windows before pickup, earliest first. The policy engine applies the first rule
 * whose `minHoursBefore` is met, checked from the earliest (backend platform-settings.schemas.ts).
 */
export function refundWindows(tier: Pick<CancellationTier, 'refunds'>): RefundWindow[] {
  const rules = [...tier.refunds].sort((a, b) => b.minHoursBefore - a.minHoursBefore);
  return rules.map((rule, index) => {
    const later = rules[index - 1];
    const notice = formatNotice(rule.minHoursBefore);
    let when: string;
    if (!later) {
      when = rule.minHoursBefore > 0 ? `${notice} or more before pickup` : 'Any time before pickup';
    } else if (rule.minHoursBefore > 0) {
      when = `Between ${notice} and ${formatNotice(later.minHoursBefore)} before pickup`;
    } else {
      when = `Less than ${formatNotice(later.minHoursBefore)} before pickup`;
    }
    return { when, refund: refundLabel(rule.refundPct), refundPct: rule.refundPct };
  });
}

// ── Host earnings estimator ──────────────────────────────────────────────────────────────────────────

export const MIN_BOOKED_DAYS = 1;
export const MAX_BOOKED_DAYS = 30;

export interface EarningsEstimate {
  dailyCents: number;
  days: number;
  /** The rental before commission. */
  grossCents: number;
  commissionCents: number;
  /** What the host keeps in a month: daily price × days × (1 − commission). */
  monthlyCents: number;
}

/**
 * A month's estimated earnings for the Become a host page: a typical daily price for the body type, times
 * the booked days, less the host commission. An estimate from the client's assumptions (plan §16 item 18),
 * never a promise.
 */
export function estimateMonthlyEarnings(
  dailyCents: number,
  days: number,
  commissionPct: number,
): EarningsEstimate {
  const bookedDays = Math.min(MAX_BOOKED_DAYS, Math.max(0, Math.round(days)));
  const grossCents = dailyCents * bookedDays;
  const monthlyCents = Math.round(grossCents * (1 - commissionPct / 100));
  return {
    dailyCents,
    days: bookedDays,
    grossCents,
    commissionCents: grossCents - monthlyCents,
    monthlyCents,
  };
}

/** The body types the estimator knows a typical price for, in the API's order. */
export function estimatorBodyTypes(estimator: PublicPolicies['hostEstimator']): BodyType[] {
  return (Object.keys(estimator.dailyCentsByBodyType) as BodyType[]).filter(
    (type) => typeof estimator.dailyCentsByBodyType[type] === 'number',
  );
}

// ── Protection ───────────────────────────────────────────────────────────────────────────────────────

/** "$15 a day". */
export const perDay = (cents: number) => `${formatNzdFromCents(cents)} a day`;

/** The plan every booking includes unless the guest picks another, if there is one. */
export function includedPlan(plans: readonly ProtectionPlan[]): ProtectionPlan | undefined {
  return plans.find((plan) => plan.mandatory);
}
