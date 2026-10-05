import { describe, expect, it } from 'vitest';
import type { CalendarBlock } from '@/api/types';
import {
  addDays,
  apiWeekday,
  formatDayRange,
  formatInstantRange,
  monthGrid,
  nzWallClock,
  segmentsOn,
  weekOf,
} from './calendar-time';

const block = (start: string, end: string): CalendarBlock => ({
  id: `${start}`,
  start,
  end,
  reason: 'HOST_BLOCK',
});

describe('calendar time', () => {
  it('reads instants as NZ days and minutes, across daylight saving', () => {
    // 27 September 2026: NZ daylight time starts at 2 am (UTC+12 becomes UTC+13).
    expect(nzWallClock(new Date('2026-09-26T13:00:00Z'))).toEqual({ day: '2026-09-27', minutes: 60 });
    expect(nzWallClock(new Date('2026-09-26T15:00:00Z'))).toEqual({ day: '2026-09-27', minutes: 4 * 60 });
    expect(addDays('2026-09-26', 2)).toBe('2026-09-28');
  });

  it('lays out a month from the Monday before the 1st, six weeks long', () => {
    const grid = monthGrid('2026-10');
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-09-28');
    expect(weekOf('2026-10-15')).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
    expect(apiWeekday('2026-10-18')).toBe(0);
  });

  it('clips a block to each NZ day it touches, and stops at midnight', () => {
    // Midnight 12 October to midnight 15 October, NZ daylight time.
    const trip = block('2026-10-11T11:00:00.000Z', '2026-10-14T11:00:00.000Z');
    expect(segmentsOn([trip], '2026-10-11')).toEqual([]);
    expect(segmentsOn([trip], '2026-10-12')[0]).toMatchObject({
      start: 0,
      end: 1440,
      continuesBefore: false,
      continuesAfter: true,
    });
    expect(segmentsOn([trip], '2026-10-14')[0]).toMatchObject({
      start: 0,
      end: 1440,
      continuesBefore: true,
      continuesAfter: false,
    });
    expect(segmentsOn([trip], '2026-10-15')).toEqual([]);

    const morning = block('2026-10-12T19:00:00.000Z', '2026-10-13T05:00:00.000Z');
    expect(segmentsOn([morning], '2026-10-13')[0]).toMatchObject({ start: 8 * 60, end: 18 * 60 });
  });

  it('writes ranges the way people say them, in NZ time', () => {
    expect(formatDayRange('2026-10-12', '2026-10-15')).toBe('12–15 Oct');
    expect(formatDayRange('2026-10-30', '2026-11-02')).toBe('30 Oct – 2 Nov');
    expect(formatInstantRange('2026-10-12T19:00:00.000Z', '2026-10-13T05:00:00.000Z')).toBe(
      'Tue 13 Oct, 8:00 am – 6:00 pm',
    );
    expect(formatInstantRange('2026-10-11T11:00:00.000Z', '2026-10-14T11:00:00.000Z')).toBe('12–14 Oct');
  });
});
