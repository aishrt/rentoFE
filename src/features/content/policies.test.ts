import { describe, expect, it } from 'vitest';
import {
  eligibilityPoints,
  estimateMonthlyEarnings,
  estimatorBodyTypes,
  formatNotice,
  includedPlan,
  listOf,
  refundWindows,
} from './policies';
import { policiesFixture } from './test-fixtures';

describe('estimateMonthlyEarnings', () => {
  it('is the daily price times the booked days, less the host commission', () => {
    // $95 a day × 10 days = $950; 20% commission is $190; the host keeps $760.
    expect(estimateMonthlyEarnings(9500, 10, 20)).toEqual({
      dailyCents: 9500,
      days: 10,
      grossCents: 95_000,
      commissionCents: 19_000,
      monthlyCents: 76_000,
    });
  });

  it('rounds to the cent and keeps the parts adding up', () => {
    const estimate = estimateMonthlyEarnings(6333, 7, 17.5);
    expect(estimate.grossCents).toBe(44_331);
    expect(estimate.monthlyCents).toBe(Math.round(44_331 * 0.825));
    expect(estimate.monthlyCents + estimate.commissionCents).toBe(estimate.grossCents);
  });

  it('keeps the booked days to whole days within a month', () => {
    expect(estimateMonthlyEarnings(6000, 45, 20).days).toBe(30);
    expect(estimateMonthlyEarnings(6000, -2, 20).monthlyCents).toBe(0);
    expect(estimateMonthlyEarnings(6000, 2.6, 20).days).toBe(3);
  });

  it('keeps everything when there is no commission', () => {
    expect(estimateMonthlyEarnings(7000, 12, 0).monthlyCents).toBe(84_000);
  });
});

describe('estimatorBodyTypes', () => {
  it('lists the body types with a typical price, in the API’s order', () => {
    expect(
      estimatorBodyTypes({ bookedDaysPerMonth: 10, dailyCentsByBodyType: { SUV: 9500, UTE: 10_000 } }),
    ).toEqual(['SUV', 'UTE']);
  });
});

describe('refundWindows', () => {
  it('describes each rule as a window before pickup, earliest first', () => {
    const moderate = policiesFixture.cancellation.tiers[1]!;
    expect(refundWindows(moderate)).toEqual([
      { when: '5 days or more before pickup', refund: 'Full refund', refundPct: 100 },
      { when: 'Between 24 hours and 5 days before pickup', refund: '50% refund', refundPct: 50 },
      { when: 'Less than 24 hours before pickup', refund: 'No refund', refundPct: 0 },
    ]);
  });

  it('sorts rules that arrive out of order', () => {
    const windows = refundWindows({
      refunds: [
        { minHoursBefore: 0, refundPct: 50 },
        { minHoursBefore: 24, refundPct: 100 },
      ],
    });
    expect(windows.map((window) => window.when)).toEqual([
      '24 hours or more before pickup',
      'Less than 24 hours before pickup',
    ]);
  });

  it('covers a single rule for any time', () => {
    expect(refundWindows({ refunds: [{ minHoursBefore: 0, refundPct: 100 }] })).toEqual([
      { when: 'Any time before pickup', refund: 'Full refund', refundPct: 100 },
    ]);
  });
});

describe('formatNotice', () => {
  it('uses days for whole days from two days up, and hours otherwise', () => {
    expect(formatNotice(336)).toBe('14 days');
    expect(formatNotice(48)).toBe('2 days');
    expect(formatNotice(24)).toBe('24 hours');
    expect(formatNotice(36)).toBe('36 hours');
    expect(formatNotice(1)).toBe('1 hour');
  });
});

describe('eligibilityPoints', () => {
  it('reads the rules in force as sentences', () => {
    expect(eligibilityPoints(policiesFixture.eligibility)).toEqual([
      'Be 21 or older',
      'Have held your licence for at least a year',
      'Hold a full New Zealand licence or an overseas licence',
      'If your overseas licence isn’t in English, bring an International Driving Permit or an approved translation',
    ]);
  });

  it('leaves out what doesn’t apply', () => {
    expect(
      eligibilityPoints({
        minAge: 25,
        minYearsLicensed: 0,
        acceptedLicenceClasses: ['NZ_FULL'],
        overseasNeedsEnglishProof: true,
      }),
    ).toEqual(['Be 25 or older', 'Hold a full New Zealand licence']);
  });
});

describe('listOf and includedPlan', () => {
  it('joins words the NZ English way', () => {
    expect(listOf(['a'])).toBe('a');
    expect(listOf(['a', 'b', 'c'])).toBe('a, b and c');
    expect(listOf(['a', 'b'], 'or')).toBe('a or b');
  });

  it('finds the plan every booking includes', () => {
    expect(includedPlan(policiesFixture.protectionPlans)?.code).toBe('BASIC');
    expect(includedPlan([])).toBeUndefined();
  });
});
