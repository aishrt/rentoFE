import { describe, expect, it } from 'vitest';
import {
  addDaysToValue,
  addMonthsToValue,
  formatAddress,
  formatBlockRange,
  formatDateNz,
  formatDayValue,
  formatNzd,
  todayNz,
  waitingFor,
} from './listing-format';

describe('listing formatters', () => {
  it('writes dates as New Zealanders do, in NZ time', () => {
    // 10:30 am on 28 September in New Zealand, still the 27th in UTC.
    expect(formatDateNz('2026-09-27T21:30:00.000Z')).toBe('28/09/2026');
    expect(formatDayValue('2027-03-31')).toBe('31/03/2027');
    expect(todayNz(new Date('2026-09-30T12:30:00.000Z'))).toBe('2026-10-01');
  });

  it('moves day values across month ends', () => {
    expect(addDaysToValue('2026-10-31', 1)).toBe('2026-11-01');
    expect(addMonthsToValue('2026-12-31', 2)).toBe('2027-02-28');
  });

  it('says how long something has waited, by NZ calendar days', () => {
    const now = new Date('2026-09-30T01:00:00.000Z');
    expect(waitingFor('2026-09-29T22:00:00.000Z', now)).toBe('today');
    expect(waitingFor('2026-09-28T22:00:00.000Z', now)).toBe('yesterday');
    expect(waitingFor('2026-09-25T22:00:00.000Z', now)).toBe('4 days ago');
  });

  it('shows whole-day blocks by their days, and others with times', () => {
    // Midnight to midnight in NZ: the end is exclusive, so the last day is the 14th.
    expect(formatBlockRange({ start: '2026-10-11T11:00:00.000Z', end: '2026-10-14T11:00:00.000Z' })).toBe(
      'Mon, 12 Oct – Wed, 14 Oct',
    );
    expect(formatBlockRange({ start: '2026-10-11T11:00:00.000Z', end: '2026-10-12T11:00:00.000Z' })).toBe(
      'Mon, 12 Oct, all day',
    );
    expect(formatBlockRange({ start: '2026-10-11T21:00:00.000Z', end: '2026-10-12T03:00:00.000Z' })).toBe(
      'Mon, 12 Oct, 10:00 am – Mon, 12 Oct, 4:00 pm',
    );
  });

  it('writes prices with cents only when there are some, and full addresses on one line', () => {
    expect(formatNzd(8900)).toBe('$89');
    expect(formatNzd(35)).toBe('$0.35');
    expect(
      formatAddress({
        unit: '2',
        streetNumber: '14',
        street: 'Queen Street',
        suburb: 'Grey Lynn',
        city: 'Queenstown',
        region: 'Otago',
        postcode: '9300',
        lat: -45,
        lng: 168.6,
      }),
    ).toBe('Unit 2, 14 Queen Street, Grey Lynn, Queenstown 9300, Otago');
  });
});
