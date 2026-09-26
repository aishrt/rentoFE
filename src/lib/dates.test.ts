import { describe, expect, it } from 'vitest';
import {
  addMonths,
  clampDateValue,
  formatDateValue,
  formatFullDate,
  formatTimeValue,
  parseDateValue,
  toDateInputValue,
} from './dates';

describe('dates', () => {
  it('parses only real days', () => {
    expect(parseDateValue('2030-03-15')?.getDate()).toBe(15);
    expect(parseDateValue('2030-02-30')).toBeNull();
    expect(parseDateValue('15/03/2030')).toBeNull();
    expect(parseDateValue('')).toBeNull();
  });

  it('adds months without spilling into the next one', () => {
    expect(toDateInputValue(addMonths(new Date(2030, 0, 31), 1))).toBe('2030-02-28');
    expect(toDateInputValue(addMonths(new Date(2030, 2, 15), -12))).toBe('2029-03-15');
  });

  it('keeps a day within its bounds', () => {
    expect(clampDateValue('2030-03-01', '2030-03-10')).toBe('2030-03-10');
    expect(clampDateValue('2030-04-01', undefined, '2030-03-31')).toBe('2030-03-31');
    expect(clampDateValue('2030-03-15', '2030-03-10', '2030-03-31')).toBe('2030-03-15');
  });

  it('formats days and times for people to read', () => {
    const now = new Date(2030, 0, 1);
    expect(formatDateValue('2030-03-15', now)).toBe('Fri, 15 Mar');
    expect(formatDateValue('2031-03-15', now)).toBe('Sat, 15 Mar 2031');
    expect(formatDateValue('', now)).toBe('');
    expect(formatFullDate('2030-03-15')).toBe('Friday, 15 March 2030');
    expect(formatTimeValue('00:30')).toBe('12:30 am');
    expect(formatTimeValue('12:00')).toBe('12:00 pm');
    expect(formatTimeValue('17:45')).toBe('5:45 pm');
  });
});
