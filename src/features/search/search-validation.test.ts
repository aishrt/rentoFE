import { describe, expect, it } from 'vitest';
import { defaultSearchValues, searchUrl, validateSearch } from './search-validation';

describe('homepage search', () => {
  it('defaults to tomorrow at 10 am for three days', () => {
    const values = defaultSearchValues(new Date(2026, 8, 25, 15, 30));
    expect(values).toMatchObject({
      pickupDate: '2026-09-26',
      pickupTime: '10:00',
      returnDate: '2026-09-29',
      returnTime: '10:00',
    });
  });

  it('accepts the defaults once a destination is chosen', () => {
    expect(validateSearch({ ...defaultSearchValues(), where: 'Queenstown' })).toEqual({});
  });

  it('needs a destination', () => {
    expect(validateSearch({ ...defaultSearchValues(), where: ' ' })).toEqual({
      where: "Tell us where you're headed",
    });
  });

  it('needs the return to be after pick-up', () => {
    const values = { ...defaultSearchValues(), where: 'Queenstown' };
    expect(validateSearch({ ...values, returnDate: values.pickupDate, returnTime: '09:00' })).toEqual({
      returnDate: 'Return needs to be after pick-up',
    });
  });

  it('refuses a pick-up in the past', () => {
    expect(
      validateSearch({
        where: 'Rotorua',
        pickupDate: '2020-01-01',
        pickupTime: '10:00',
        returnDate: '2020-01-03',
        returnTime: '10:00',
      }),
    ).toEqual({ pickupDate: 'Pick-up needs to be in the future' });
  });

  it('asks for every date and time', () => {
    expect(
      validateSearch({ where: 'Nelson', pickupDate: '', pickupTime: '', returnDate: '', returnTime: '' }),
    ).toEqual({
      pickupDate: 'Choose a pick-up date',
      pickupTime: 'Choose a pick-up time',
      returnDate: 'Choose a return date',
      returnTime: 'Choose a return time',
    });
  });

  it('builds the Search Results URL', () => {
    expect(
      searchUrl({
        where: ' Queenstown Airport (ZQN) ',
        pickupDate: '2026-10-12',
        pickupTime: '10:00',
        returnDate: '2026-10-15',
        returnTime: '09:30',
      }),
    ).toBe('/search?where=Queenstown+Airport+%28ZQN%29&start=2026-10-12T10%3A00&end=2026-10-15T09%3A30');
  });
});
