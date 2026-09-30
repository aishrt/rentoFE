import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Field } from '@/components/ui/field';
import { mockApi, renderWithProviders } from '@/test/utils';
import { LocationAutocomplete } from './location-autocomplete';
import type { PlaceValue } from './search-params';

const POPULAR = [
  { id: 'place:akl', type: 'CITY', name: 'Auckland', label: 'Auckland', lat: -36.85, lng: 174.76 },
  {
    id: 'place:akl-airport',
    type: 'AIRPORT',
    name: 'Auckland Airport',
    label: 'Auckland Airport (AKL)',
    secondary: 'Auckland',
    code: 'AKL',
    lat: -37.01,
    lng: 174.79,
  },
];

const QUEEN = [
  {
    id: 'place:zqn-city',
    type: 'CITY',
    name: 'Queenstown',
    label: 'Queenstown',
    secondary: 'Otago',
    lat: -45.03,
    lng: 168.66,
  },
  {
    id: 'place:zqn',
    type: 'AIRPORT',
    name: 'Queenstown Airport',
    label: 'Queenstown Airport (ZQN)',
    secondary: 'Otago',
    code: 'ZQN',
    lat: -45.02,
    lng: 168.74,
  },
];

/** Every value the field reported, newest last. */
const changes: PlaceValue[] = [];
const latest = () => changes.at(-1) ?? { label: '' };

function Where() {
  const [value, setValue] = useState<PlaceValue>({ label: '' });
  return (
    <Field label="Where are you going?">
      <LocationAutocomplete
        value={value}
        onValueChange={(next) => {
          changes.push(next);
          setValue(next);
        }}
      />
    </Field>
  );
}

/** Answers `/places/suggest` by the `q` it was sent, and records every request. */
function mockPlaces() {
  const queries: { q: string; sessionToken: string | null }[] = [];
  const fetchMock = mockApi({});
  fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname.endsWith('/places/suggest')) {
      const q = url.searchParams.get('q') ?? '';
      queries.push({ q, sessionToken: url.searchParams.get('sessionToken') });
      const suggestions = q ? (q.startsWith('queen') ? QUEEN : []) : POPULAR;
      return new Response(JSON.stringify({ suggestions }), { status: 200 });
    }
    if (url.pathname.includes('/places/')) {
      return new Response(
        JSON.stringify({
          place: {
            id: 'google:1',
            type: 'ADDRESS',
            name: '1 Queen St',
            label: '1 Queen Street',
            lat: -36.8,
            lng: 174.7,
          },
        }),
        { status: 200 },
      );
    }
    throw new Error(`Unexpected request: ${url.pathname}`);
  });
  return queries;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LocationAutocomplete', () => {
  it('shows popular places on a click, and suggestions for what is typed', async () => {
    const queries = mockPlaces();
    const user = userEvent.setup();
    renderWithProviders(<Where />);
    const input = screen.getByRole('combobox', { name: 'Where are you going?' });

    await user.click(input);
    expect(await screen.findByRole('option', { name: /Auckland Airport \(AKL\)/ })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Popular places' })).toBeInTheDocument();

    await user.type(input, 'queen');
    expect(await screen.findByRole('option', { name: /Queenstown Airport \(ZQN\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Auckland/ })).not.toBeInTheDocument();
    // Typing is debounced: no request for each letter.
    expect(queries.map((query) => query.q)).not.toContain('que');
    // One session token for the whole search.
    expect(new Set(queries.map((query) => query.sessionToken)).size).toBe(1);
  });

  it('opens as soon as you type, and chooses with the arrow keys and Enter', async () => {
    mockPlaces();
    const user = userEvent.setup();
    renderWithProviders(<Where />);
    const input = screen.getByRole('combobox', { name: 'Where are you going?' });

    await user.type(input, 'queen');
    await screen.findByRole('option', { name: /Queenstown Airport/ });
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByText(/2 places suggested/)).toBeInTheDocument();

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(input).toHaveValue('Queenstown Airport (ZQN)');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(latest()).toEqual({
      label: 'Queenstown Airport (ZQN)',
      id: 'place:zqn',
      type: 'AIRPORT',
      code: 'ZQN',
      lat: -45.02,
      lng: 168.74,
    });
  });

  it('keeps any text when nothing matches, and says so', async () => {
    mockPlaces();
    const user = userEvent.setup();
    renderWithProviders(<Where />);
    const input = screen.getByRole('combobox', { name: 'Where are you going?' });

    await user.type(input, 'Zzyzx');
    expect(await screen.findByText(/No places match “Zzyzx”/)).toBeInTheDocument();
    expect(latest()).toEqual({ label: 'Zzyzx' });
  });

  it('clears the place and puts the cursor back in the field', async () => {
    mockPlaces();
    const user = userEvent.setup();
    renderWithProviders(<Where />);
    const input = screen.getByRole('combobox', { name: 'Where are you going?' });

    await user.type(input, 'queen');
    await user.click(screen.getByRole('button', { name: 'Clear location' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await waitFor(() => expect(latest()).toEqual({ label: '' }));
  });
});
