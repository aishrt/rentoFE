import { describe, expect, it } from 'vitest';
import { busyDays, fullyBookedDays } from './availability';

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
});
