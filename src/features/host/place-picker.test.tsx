import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '@/components/ui/field';
import { mockApi, renderWithProviders } from '@/test/utils';
import { emptyPlace, type PlaceChoice } from './place-choice';
import { PlacePicker } from './place-picker';

const PONSONBY = {
  id: 'place:ponsonby',
  type: 'SUBURB',
  name: 'Ponsonby',
  label: 'Ponsonby',
  secondary: 'Auckland, Auckland',
  city: 'Auckland',
  region: 'Auckland',
  lat: -36.85,
  lng: 174.74,
};

const QUEEN_STREET = {
  id: 'google:ChIJqueen',
  type: 'ADDRESS',
  name: '12 Queen Street',
  label: '12 Queen Street, Auckland Central, Auckland',
  secondary: 'Auckland Central, Auckland',
};

const QUEEN_STREET_DETAILS = {
  ...QUEEN_STREET,
  label: '12 Queen Street, Auckland Central, Auckland 1010',
  suburb: 'Auckland Central',
  city: 'Auckland',
  region: 'Auckland',
  postcode: '1010',
  lat: -36.8466,
  lng: 174.7663,
  address: {
    streetNumber: '12',
    street: 'Queen Street',
    suburb: 'Auckland Central',
    city: 'Auckland',
    region: 'Auckland',
    postcode: '1010',
  },
};

function Suburb() {
  const [value, setValue] = useState<PlaceChoice>(emptyPlace);
  return (
    <Field label="Suburb or town">
      <PlacePicker value={value} onValueChange={setValue} types={['SUBURB', 'CITY']} listLabel="Places" />
    </Field>
  );
}

function Address({ onChange }: { onChange: (value: PlaceChoice) => void }) {
  const [value, setValue] = useState<PlaceChoice>(emptyPlace);
  return (
    <Field label="Address">
      <PlacePicker
        value={value}
        onValueChange={(next) => {
          setValue(next);
          onChange(next);
        }}
        types={['ADDRESS', 'SUBURB', 'CITY']}
        listLabel="Places"
      />
    </Field>
  );
}

/** Answers the suggestions and the chosen address's details, and records what each was sent. */
function mockPlaces(details: { status: number; body: unknown }) {
  const asked: { path: string; params: URLSearchParams }[] = [];
  const fetchMock = mockApi({});
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = decodeURIComponent(url.pathname).replace(/^\/api\/v1/, '');
    asked.push({ path, params: url.searchParams });
    const { status, body } =
      path === '/places/suggest' ? { status: 200, body: { suggestions: [QUEEN_STREET, PONSONBY] } } : details;
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  });
  return asked;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PlacePicker', () => {
  it("asks for our places only, never Google's street addresses, and chooses one", async () => {
    const asked: URLSearchParams[] = [];
    const fetchMock = mockApi({});
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      asked.push(url.searchParams);
      return new Response(JSON.stringify({ suggestions: [PONSONBY] }), { status: 200 });
    });
    const user = userEvent.setup();
    renderWithProviders(<Suburb />);
    const input = screen.getByRole('combobox', { name: 'Suburb or town' });

    await user.type(input, 'pons');
    await user.click(await screen.findByRole('option', { name: /Ponsonby/ }));

    expect(input).toHaveValue('Ponsonby, Auckland');
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.every((params) => params.get('oursOnly') === 'true')).toBe(true);
  });

  it("offers Google's addresses and looks the chosen one up in the same session", async () => {
    const asked = mockPlaces({ status: 200, body: { place: QUEEN_STREET_DETAILS } });
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Address onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Address' });

    await user.type(input, '12 queen');
    await user.click(await screen.findByRole('option', { name: /12 Queen Street/ }));

    await waitFor(() => expect(input).toHaveValue('12 Queen Street, Auckland Central, Auckland 1010'));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'google:ChIJqueen',
        lat: -36.8466,
        lng: 174.7663,
        address: QUEEN_STREET_DETAILS.address,
      }),
    );
    const suggests = asked.filter((request) => request.path === '/places/suggest');
    const lookup = asked.find((request) => request.path === '/places/google:ChIJqueen');
    expect(suggests.every((request) => request.params.get('oursOnly') === null)).toBe(true);
    expect(lookup?.params.get('sessionToken')).toBeTruthy();
    expect(new Set(suggests.map((request) => request.params.get('sessionToken')))).toEqual(
      new Set([lookup?.params.get('sessionToken')]),
    );
  });

  it("says so when the address can't be looked up, and keeps what was chosen", async () => {
    mockPlaces({
      status: 503,
      body: {
        error: {
          code: 'PLACES_UNAVAILABLE',
          message: "We couldn't look up that address just now. Please try again, or choose a town or suburb.",
        },
      },
    });
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<Address onChange={onChange} />);
    const input = screen.getByRole('combobox', { name: 'Address' });

    await user.type(input, '12 queen');
    await user.click(await screen.findByRole('option', { name: /12 Queen Street/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't look up that address/);
    expect(input).toHaveValue('12 Queen Street, Auckland Central, Auckland');
    expect(onChange).toHaveBeenLastCalledWith(expect.not.objectContaining({ lat: expect.anything() }));
  });
});
