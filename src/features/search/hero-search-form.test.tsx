import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { HeroSearchForm } from './hero-search-form';

const SUGGESTIONS = [
  {
    id: 'place:wlg-city',
    type: 'CITY',
    name: 'Wellington',
    label: 'Wellington',
    lat: -41.2866,
    lng: 174.7756,
  },
  {
    id: 'place:wlg',
    type: 'AIRPORT',
    name: 'Wellington Airport',
    label: 'Wellington Airport (WLG)',
    secondary: 'Wellington',
    code: 'WLG',
    lat: -41.3272,
    lng: 174.8053,
  },
];

function mockPlaces() {
  return mockRoutes(({ path }) =>
    path === '/places/suggest' ? { status: 200, body: { suggestions: SUGGESTIONS } } : undefined,
  );
}

afterEach(() => vi.unstubAllGlobals());

const whereField = () => screen.findByRole('combobox', { name: 'Where are you going?' });

describe('HeroSearchForm', () => {
  it('asks where to before searching, and puts the cursor there', async () => {
    mockPlaces();
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearchForm />);

    await user.click(screen.getByRole('button', { name: 'Search Cars' }));
    expect(await screen.findByText("Tell us where you're headed")).toBeInTheDocument();
    expect(await whereField()).toHaveFocus();
    expect(await whereField()).toHaveAttribute('aria-invalid', 'true');
    expect(router.state.location.pathname).toBe('/');
  });

  it('opens a calendar for the dates and a list for the times', async () => {
    mockPlaces();
    const user = userEvent.setup();
    renderWithProviders(<HeroSearchForm />);

    await user.click(await screen.findByRole('button', { name: /^Pick-up date/ }));
    expect(screen.getByRole('dialog', { name: 'Choose a pick-up date' })).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: /^Return time/ }));
    expect(screen.getByRole('listbox', { name: 'Return times' })).toBeInTheDocument();
  });

  it('searches with the chosen place, its coordinates and the times', async () => {
    const sent = mockPlaces();
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearchForm />);

    await user.type(await whereField(), 'wellington');
    await user.click(await screen.findByRole('option', { name: /Wellington Airport \(WLG\)/ }));
    await user.click(screen.getByRole('button', { name: /^Pick-up time/ }));
    await user.click(screen.getByRole('option', { name: '9:30 am' }));
    await user.click(screen.getByRole('button', { name: 'Search Cars' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('where')).toBe('Wellington Airport (WLG)');
    expect(params.get('placeId')).toBe('place:wlg');
    expect(params.get('lat')).toBe('-41.3272');
    expect(params.get('lng')).toBe('174.8053');
    expect(params.get('airport')).toBe('WLG');
    expect(params.get('start')).toMatch(/T09:30$/);
    expect(params.get('end')).toMatch(/T10:00$/);
    // The suggestions were fetched once typing paused, with a session token.
    expect(sent.every((request) => request.query.get('sessionToken'))).toBe(true);
  });

  it('searches for typed text as it is, when no suggestion is chosen', async () => {
    mockPlaces();
    const user = userEvent.setup();
    const { router } = renderWithProviders(<HeroSearchForm />);

    await user.type(await whereField(), 'Kaikōura');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Search Cars' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'));
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('where')).toBe('Kaikōura');
    expect(params.has('placeId')).toBe(false);
    expect(params.has('lat')).toBe(false);
  });

  it('starts from a given place, such as a destination page’s city', async () => {
    mockPlaces();
    renderWithProviders(<HeroSearchForm initial={{ place: { label: 'Rotorua', lat: -38.1, lng: 176.2 } }} />);
    expect(await whereField()).toHaveValue('Rotorua');
  });
});
