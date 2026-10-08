import type { ConditionReport, Handover } from '@/api/types';

export const ANGLES = [
  'FRONT',
  'REAR',
  'DRIVER_SIDE',
  'PASSENGER_SIDE',
  'WHEELS',
  'WINDSCREEN',
  'INTERIOR',
  'DASHBOARD',
] as const;

/** Kiri's trip in Hana's car, confirmed and ready for check-in. */
export function handover(overrides: Partial<Handover> = {}): Handover {
  return {
    ref: 'RV-7K2Q9M',
    role: 'GUEST',
    bookingStatus: 'CONFIRMED',
    energy: 'FUEL',
    fuelPolicy: 'SAME_LEVEL',
    requiredAngles: [...ANGLES],
    checkInOpensAt: '2026-10-11T19:00:00.000Z',
    checkIn: null,
    checkOut: null,
    emailVerificationNeeded: false,
    fuelShortfall: false,
    actions: {
      checkIn: true,
      checkOut: false,
      confirmCheckIn: false,
      confirmCheckOut: false,
      flagDamage: false,
    },
    ...overrides,
  };
}

export function report(overrides: Partial<ConditionReport> = {}): ConditionReport {
  return {
    stage: 'CHECK_IN',
    odometer: 45210,
    fuelOrBatteryPct: 80,
    submittedBy: 'HOST',
    submittedAt: '2026-10-11T21:05:00.000Z',
    photos: ANGLES.map((angle) => ({
      angle,
      url: `https://api.test/files/private/${angle}.jpg`,
      takenBy: 'HOST',
      takenAt: '2026-10-11T21:00:00.000Z',
      uploadedAt: '2026-10-11T21:01:00.000Z',
    })),
    damagePins: [{ id: 'p1', x: 50, y: 6, note: 'Scuff', newDamage: false, flaggedBy: 'HOST' }],
    confirmedByHostAt: '2026-10-11T21:05:00.000Z',
    completedBySupport: false,
    ...overrides,
  };
}
