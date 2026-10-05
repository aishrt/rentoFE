import { describe, expect, it } from 'vitest';
import {
  activeFilters,
  readFilters,
  readSort,
  readTrip,
  toApiQuery,
  tripParams,
  withFilters,
  withoutFilters,
} from './search-params';

describe('search filters in the URL', () => {
  it('reads every filter under the API parameter names', () => {
    const params = new URLSearchParams(
      'minDailyCents=4000&maxDailyCents=15000&radiusKm=50&types=SUV,wagon&types=UTE&make=Toyota&model=RAV4' +
        '&minYear=2018&maxYear=2024&transmission=automatic&minSeats=5&fuel=EV,PHEV&electrified=true' +
        '&airportDelivery=true&delivery=true&instantBook=true&minRating=4.5&unlimitedKm=true&petFriendly=1&childSeat=true',
    );
    expect(readFilters(params)).toEqual({
      minDailyCents: 4000,
      maxDailyCents: 15000,
      radiusKm: 50,
      types: ['SUV', 'WAGON', 'UTE'],
      make: 'Toyota',
      model: 'RAV4',
      minYear: 2018,
      maxYear: 2024,
      transmission: 'AUTOMATIC',
      minSeats: 5,
      fuel: ['EV', 'PHEV'],
      electrified: true,
      airportDelivery: true,
      delivery: true,
      instantBook: true,
      minRating: 4.5,
      unlimitedKm: true,
      petFriendly: true,
      childSeat: true,
    });
  });

  it("ignores values it doesn't know instead of failing", () => {
    const filters = readFilters(
      new URLSearchParams('types=SPACESHIP,SUV&minSeats=lots&transmission=CVT&delivery=maybe'),
    );
    expect(filters.types).toEqual(['SUV']);
    expect(filters.minSeats).toBeUndefined();
    expect(filters.transmission).toBeUndefined();
    expect(filters.delivery).toBe(false);
    expect(readSort(new URLSearchParams('sort=cheapest'))).toBe('recommended');
  });

  it('writes a change back, removing filters that are off, and keeps the rest of the search', () => {
    const params = new URLSearchParams(
      'where=Auckland&start=2026-10-12T10:00&end=2026-10-15T10:00&instantBook=true',
    );
    const next = withFilters(params, { types: ['SUV', 'VAN'], instantBook: false, minRating: 4 });
    expect(next.get('types')).toBe('SUV,VAN');
    expect(next.has('instantBook')).toBe(false);
    expect(next.get('minRating')).toBe('4');
    expect(next.get('where')).toBe('Auckland');
    expect(withFilters(next, { types: [] }).has('types')).toBe(false);
  });

  it('clears every filter but keeps the place, dates and sort', () => {
    const params = new URLSearchParams(
      'where=Auckland&start=2026-10-12T10:00&end=2026-10-15T10:00&sort=rating&types=SUV&petFriendly=true',
    );
    expect(withoutFilters(params).toString()).toBe(
      'where=Auckland&start=2026-10-12T10%3A00&end=2026-10-15T10%3A00&sort=rating',
    );
  });

  it('labels the filters in use, each with the change that removes it', () => {
    const chips = activeFilters(
      readFilters(
        new URLSearchParams(
          'maxDailyCents=15000&types=SUV&make=Toyota&model=RAV4&minYear=2018&instantBook=true',
        ),
      ),
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Up to $150 a day',
      'SUV',
      'Toyota RAV4',
      '2018 or newer',
      'Instant Book',
    ]);
    expect(chips[2]?.clear).toEqual({ make: undefined, model: undefined });
  });
});

describe('the trip in the URL', () => {
  it('reads the place and dates, and leaves out broken ones', () => {
    expect(
      readTrip(
        new URLSearchParams(
          'where=Queenstown Airport (ZQN)&placeId=place:zqn&lat=-45.02&lng=168.74&airport=zqn&start=2026-10-12T10:00&end=2026-10-15T10:00',
        ),
      ),
    ).toEqual({
      place: {
        label: 'Queenstown Airport (ZQN)',
        id: 'place:zqn',
        lat: -45.02,
        lng: 168.74,
        code: 'ZQN',
        type: 'AIRPORT',
      },
      start: '2026-10-12T10:00',
      end: '2026-10-15T10:00',
    });
    const broken = readTrip(
      new URLSearchParams('where=Nelson&lat=500&lng=abc&start=tomorrow&end=2026-10-15T10:00'),
    );
    expect(broken).toEqual({
      place: {
        label: 'Nelson',
        id: undefined,
        lat: undefined,
        lng: undefined,
        code: undefined,
        type: undefined,
      },
      start: undefined,
      end: undefined,
    });
  });

  it('writes it back in the same shape', () => {
    const trip = readTrip(
      new URLSearchParams(
        'where=Auckland&placeId=place:akl&lat=-36.85&lng=174.76&start=2026-10-12T10:00&end=2026-10-15T10:00',
      ),
    );
    expect(tripParams(trip).toString()).toBe(
      'where=Auckland&placeId=place%3Aakl&lat=-36.85&lng=174.76&start=2026-10-12T10%3A00&end=2026-10-15T10%3A00',
    );
  });

  it('asks the API only for what is set', () => {
    const params = new URLSearchParams(
      'where=Auckland&types=SUV&childSeat=true&start=2026-10-12T10:00&end=2026-10-15T10:00',
    );
    expect(toApiQuery(readTrip(params), readFilters(params), 'price_asc')).toEqual({
      sort: 'price_asc',
      where: 'Auckland',
      start: '2026-10-12T10:00',
      end: '2026-10-15T10:00',
      types: ['SUV'],
      childSeat: true,
    });
  });
});
