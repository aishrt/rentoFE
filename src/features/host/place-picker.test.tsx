import { screen } from '@testing-library/react';
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

function Suburb() {
  const [value, setValue] = useState<PlaceChoice>(emptyPlace);
  return (
    <Field label="Suburb or town">
      <PlacePicker value={value} onValueChange={setValue} types={['SUBURB', 'CITY']} listLabel="Places" />
    </Field>
  );
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
});
