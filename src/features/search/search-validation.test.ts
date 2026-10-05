import { describe, expect, it } from 'vitest';
import { defaultSearchValues, movePickupDate, searchUrl, validateSearch } from './search-validation';

const place = (label: string) => ({ label });

describe('search form checks', () => {
  it('defaults to tomorrow at 10 am for three days', () => {
    const values = defaultSearchValues(new Date(2026, 8, 25, 15, 30));
    expect(values).toMatchObject({
      place: { label: '' },
      pickupDate: '2026-09-26',
      pickupTime: '10:00',
      returnDate: '2026-09-29',
      returnTime: '10:00',
    });
  });

  it('accepts the defaults once a destination is chosen', () => {
    expect(validateSearch({ ...defaultSearchValues(), place: place('Queenstown') })).toEqual({});
  });

  it('needs a destination on the homepage, but not on the results pages', () => {
    const values = { ...defaultSearchValues(), place: place(' ') };
    expect(validateSearch(values)).toEqual({ where: "Tell us where you're headed" });
    expect(validateSearch(values, { requirePlace: false })).toEqual({});
  });

  it('needs the return to be after pick-up', () => {
    const values = { ...defaultSearchValues(), place: place('Queenstown') };
    expect(validateSearch({ ...values, returnDate: values.pickupDate, returnTime: '09:00' })).toEqual({
      returnDate: 'Return needs to be after pick-up',
    });
  });

  it('refuses a pick-up in the past', () => {
    expect(
      validateSearch({
        place: place('Rotorua'),
        pickupDate: '2020-01-01',
        pickupTime: '10:00',
        returnDate: '2020-01-03',
        returnTime: '10:00',
      }),
    ).toEqual({ pickupDate: 'Pick-up needs to be in the future' });
  });

  it('asks for every date and time', () => {
    expect(
      validateSearch({
        place: place('Nelson'),
        pickupDate: '',
        pickupTime: '',
        returnDate: '',
        returnTime: '',
      }),
    ).toEqual({
      pickupDate: 'Choose a pick-up date',
      pickupTime: 'Choose a pick-up time',
      returnDate: 'Choose a return date',
      returnTime: 'Choose a return time',
    });
  });

  it('lets Browse Cars go without dates, but not with only one of them', () => {
    const noDates = {
      place: place(''),
      pickupDate: '',
      pickupTime: '10:00',
      returnDate: '',
      returnTime: '10:00',
    };
    expect(validateSearch(noDates, { requirePlace: false, requireDates: false })).toEqual({});
    expect(
      validateSearch({ ...noDates, pickupDate: '2030-01-01' }, { requirePlace: false, requireDates: false }),
    ).toEqual({ returnDate: 'Choose a return date' });
  });

  it('moves the return with a later pick-up, keeping the trip length', () => {
    const dates = { pickupDate: '2026-10-12', returnDate: '2026-10-15' };
    expect(movePickupDate(dates, '2026-10-20')).toEqual({
      pickupDate: '2026-10-20',
      returnDate: '2026-10-23',
    });
    expect(movePickupDate(dates, '2026-10-13')).toEqual({
      pickupDate: '2026-10-13',
      returnDate: '2026-10-15',
    });
  });
});

describe('search URLs', () => {
  const dates = {
    pickupDate: '2026-10-12',
    pickupTime: '10:00',
    returnDate: '2026-10-15',
    returnTime: '09:30',
  };

  it('builds the Search Results URL for a typed place', () => {
    expect(searchUrl({ place: place(' Queenstown Airport (ZQN) '), ...dates })).toBe(
      '/search?where=Queenstown+Airport+%28ZQN%29&start=2026-10-12T10%3A00&end=2026-10-15T09%3A30',
    );
  });

  it('adds the chosen suggestion and, for an airport, its code', () => {
    const url = new URL(
      searchUrl({
        place: {
          label: 'Queenstown Airport (ZQN)',
          id: 'place:zqn',
          type: 'AIRPORT',
          code: 'ZQN',
          lat: -45.02,
          lng: 168.74,
        },
        ...dates,
      }),
      'https://rentovroom.test',
    );
    expect(url.pathname).toBe('/search');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      where: 'Queenstown Airport (ZQN)',
      placeId: 'place:zqn',
      lat: '-45.02',
      lng: '168.74',
      airport: 'ZQN',
      start: '2026-10-12T10:00',
      end: '2026-10-15T09:30',
    });
  });

  it('goes to Browse Cars without dates, keeping the filters and sort', () => {
    const keep = new URLSearchParams(
      'where=Auckland&start=2026-01-01T10:00&end=2026-01-02T10:00&types=SUV&sort=rating',
    );
    expect(
      searchUrl(
        {
          place: place('Wellington'),
          pickupDate: '',
          pickupTime: '10:00',
          returnDate: '',
          returnTime: '10:00',
        },
        keep,
      ),
    ).toBe('/cars?where=Wellington&types=SUV&sort=rating');
  });
});
