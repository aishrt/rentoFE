import { describe, expect, it } from 'vitest';
import { addressFromPlace, placeFromAddress, type PlaceChoice } from './place-choice';

const QUEEN_STREET: PlaceChoice = {
  label: '2B/12 Queen Street, Auckland Central, Auckland 1010',
  id: 'google:ChIJqueen',
  type: 'ADDRESS',
  lat: -36.8466,
  lng: 174.7663,
  address: {
    unit: '2B',
    streetNumber: '12',
    street: 'Queen Street',
    suburb: 'Auckland Central',
    city: 'Auckland',
    region: 'Auckland',
    postcode: '1010',
  },
};

describe('addressFromPlace', () => {
  it('fills every part of a street address from Google', () => {
    expect(addressFromPlace(QUEEN_STREET)).toEqual({
      unit: '2B',
      streetNumber: '12',
      street: 'Queen Street',
      suburb: 'Auckland Central',
      city: 'Auckland',
      region: 'Auckland',
      postcode: '1010',
    });
  });

  it('fills the area of a Google suburb, with its postcode, and leaves the street as typed', () => {
    expect(
      addressFromPlace({
        label: 'Ponsonby, Auckland 1011',
        id: 'google:ChIJponsonby',
        type: 'ADDRESS',
        suburb: 'Ponsonby',
        city: 'Auckland',
        region: 'Auckland',
        postcode: '1011',
        lat: -36.856,
        lng: 174.744,
      }),
    ).toEqual({ suburb: 'Ponsonby', city: 'Auckland', region: 'Auckland', postcode: '1011' });
  });

  it('fills the area of one of our suburbs or towns', () => {
    expect(
      addressFromPlace({
        label: 'Ponsonby, Auckland',
        id: 'place:ponsonby',
        type: 'SUBURB',
        name: 'Ponsonby',
        secondary: 'Auckland, Auckland',
        lat: -36.856,
        lng: 174.744,
      }),
    ).toEqual({ suburb: 'Ponsonby', city: 'Auckland', region: 'Auckland' });
    expect(
      addressFromPlace({
        label: 'Taupō',
        id: 'place:taupo',
        type: 'CITY',
        name: 'Taupō',
        secondary: 'Waikato',
        lat: -38.6857,
        lng: 176.0702,
      }),
    ).toEqual({ suburb: '', city: 'Taupō', region: 'Waikato' });
  });

  it('fills nothing until the place has its coordinates', () => {
    expect(addressFromPlace({ label: '12 Queen' })).toEqual({});
    expect(addressFromPlace({ ...QUEEN_STREET, lat: undefined, lng: undefined })).toEqual({});
  });
});

describe('placeFromAddress', () => {
  it('shows a saved address in full, with its coordinates', () => {
    const place = placeFromAddress({ ...QUEEN_STREET.address!, lat: -36.8466, lng: 174.7663 });
    expect(place).toMatchObject({
      label: '2B/12 Queen Street, Auckland Central, Auckland 1010',
      type: 'ADDRESS',
      lat: -36.8466,
      lng: 174.7663,
    });
    expect(addressFromPlace(place)).toEqual(addressFromPlace(QUEEN_STREET));
  });
});
