import { describe, expect, it } from 'vitest';
import { busyDays, earliestPickupDay, fullyBookedDays } from './availability';

// 12 Oct 10:00 to 15 Oct 12:00 NZ time (NZDT, UTC+13).
const trip = { start: '2030-10-11T21:00:00.000Z', end: '2030-10-14T23:00:00.000Z' };

describe('availability days', () => {
  it('rules out only the days a busy time covers from start to end', () => {
    expect([...fullyBookedDays([trip])]).toEqual(['2030-10-13', '2030-10-14']);
    expect([...busyDays([trip])]).toEqual(['2030-10-12', '2030-10-13', '2030-10-14', '2030-10-15']);
  });

  it('leaves a same-day block open', () => {
    expect(
      fullyBookedDays([{ start: '2030-10-11T21:00:00.000Z', end: '2030-10-12T05:00:00.000Z' }]).size,
    ).toBe(0);
  });

  it('starts trips after the Host’s minimum notice, counted in NZ days', () => {
    // 8 pm on 7 Oct 2030 in NZ (NZDT, UTC+13).
    const now = new Date('2030-10-07T07:00:00.000Z');
    expect(earliestPickupDay(0, now)).toBe('2030-10-07');
    expect(earliestPickupDay(2, now)).toBe('2030-10-07');
    // Midnight is already the next day.
    expect(earliestPickupDay(4, now)).toBe('2030-10-08');
    expect(earliestPickupDay(48, now)).toBe('2030-10-09');
  });
});
