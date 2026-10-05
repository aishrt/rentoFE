import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SearchResults } from '@/api/types';
import { carCard, mockRoutes, policies, searchResults } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { BrowsePage } from './browse-page';
import { SearchPage } from './search-page';

const DATED = 'where=Auckland&start=2026-10-12T10:00&end=2026-10-15T10:00';

const routes = [
  { path: '/search', element: <SearchPage /> },
  { path: '/cars', element: <BrowsePage /> },
  { path: '/become-a-host', element: <h1>Become a Host</h1> },
];

const twoCars = (query: URLSearchParams) =>
  searchResults({
    results: [
      carCard({
        estimate: query.get('start') ? { days: 3, totalCents: 33_870, includesAirportDelivery: false } : null,
      }),
      carCard({
        id: 'car-corolla',
        slug: '2021-toyota-corolla-auckland',
        make: 'Toyota',
        model: 'Corolla',
        year: 2021,
        dailyCents: 5_900,
        estimate: query.get('start') ? { days: 3, totalCents: 24_000, includesAirportDelivery: false } : null,
      }),
    ],
    dates: query.get('start')
      ? { start: '2026-10-11T21:00:00.000Z', end: '2026-10-14T21:00:00.000Z', days: 3 }
      : null,
  });

function mockSearch(respond: (query: URLSearchParams) => SearchResults, user: unknown = null) {
  return mockRoutes(({ method, path, query }) => {
    if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user } };
    if (path === '/policies') return { status: 200, body: policies };
    if (path === '/search/makes')
      return { status: 200, body: { makes: [{ make: 'Toyota', models: ['Corolla'] }] } };
    if (path === '/search') return { status: 200, body: respond(query) };
    if (method === 'PUT' && path === '/me/last-search') return { status: 204 };
    return undefined;
  });
}

const searches = (sent: ReturnType<typeof mockSearch>) =>
  sent.filter((request) => request.path === '/search');

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('Search Results', () => {
  it('shows skeleton cards, then the cars with their estimated totals', async () => {
    const sent = mockSearch(twoCars);
    renderWithRouter(routes, `/search?${DATED}`);

    expect(screen.getByRole('status', { name: 'Loading cars' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: '2 cars available' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Cars near Auckland' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('$339 total');

    const query = searches(sent)[0]!.query;
    expect(query.get('where')).toBe('Auckland');
    expect(query.get('start')).toBe('2026-10-12T10:00');
    expect(query.get('end')).toBe('2026-10-15T10:00');
    expect(query.get('pageSize')).toBe('24');
  });

  it('keeps the filters in the URL: reads them, and writes each change back', async () => {
    const sent = mockSearch(twoCars);
    const user = userEvent.setup();
    const { router } = renderWithRouter(routes, `/search?${DATED}&types=SUV`);

    await screen.findByRole('heading', { name: '2 cars available' });
    expect(screen.getByRole('button', { name: 'SUV', pressed: true })).toBeInTheDocument();
    expect(searches(sent)[0]!.query.getAll('types')).toEqual(['SUV']);
    // The phone's summary bar counts the filters in use.
    expect(screen.getByRole('button', { name: 'Filters (1)' })).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Instant Book' }));
    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('instantBook')).toBe('true'),
    );
    await waitFor(() => expect(searches(sent).at(-1)!.query.get('instantBook')).toBe('true'));
    expect(screen.getByRole('switch', { name: 'Instant Book' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Ute' }));
    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('types')).toBe('SUV,UTE'),
    );

    await user.click(within(screen.getByRole('complementary')).getByRole('button', { name: 'Clear all' }));
    await waitFor(() => {
      const params = new URLSearchParams(router.state.location.search);
      expect(params.has('types')).toBe(false);
      expect(params.has('instantBook')).toBe(false);
      expect(params.get('where')).toBe('Auckland');
    });
  });

  it('changes the sort in the URL', async () => {
    mockSearch(twoCars);
    const user = userEvent.setup();
    const { router } = renderWithRouter(routes, `/search?${DATED}`);

    await screen.findByRole('heading', { name: '2 cars available' });
    await user.click(screen.getByRole('button', { name: /^Sort by/ }));
    await user.click(screen.getByRole('option', { name: 'Price: low to high' }));
    await waitFor(() =>
      expect(new URLSearchParams(router.state.location.search).get('sort')).toBe('price_asc'),
    );
  });

  it('suggests removing filters when nothing matches them', async () => {
    mockSearch(() => searchResults({ results: [], total: 0 }));
    const user = userEvent.setup();
    const { router } = renderWithRouter(routes, `/search?${DATED}&types=VAN&petFriendly=true`);

    expect(await screen.findByRole('heading', { name: 'No cars match those filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search within 50 km' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Van' }));
    await waitFor(() => expect(new URLSearchParams(router.state.location.search).has('types')).toBe(false));
    expect(new URLSearchParams(router.state.location.search).get('petFriendly')).toBe('true');
  });

  it('invites hosts where there are no cars yet', async () => {
    mockSearch(() =>
      searchResults({
        results: [],
        total: 0,
        place: { label: 'Dunedin', type: 'CITY', lat: -45.87, lng: 170.5 },
      }),
    );
    renderWithRouter(routes, '/search?where=Dunedin&start=2026-10-12T10:00&end=2026-10-15T10:00');

    expect(await screen.findByRole('heading', { name: 'No cars here yet' })).toBeInTheDocument();
    expect(screen.getByText(/No one near Dunedin has listed a car yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Become a Host' })).toHaveAttribute('href', '/become-a-host');
  });

  it('says when every car there is booked for the dates', async () => {
    mockSearch((query) => (query.get('start') ? searchResults({ results: [], total: 0 }) : searchResults()));
    renderWithRouter(routes, `/search?${DATED}`);

    expect(
      await screen.findByRole('heading', { name: 'Every car here is booked for those dates' }),
    ).toBeInTheDocument();
  });

  it('says when a typed place matched nothing, and shows cars from all over NZ', async () => {
    mockSearch(() => searchResults({ place: null, placeNotFound: true }));
    renderWithRouter(routes, '/search?where=Zzyzx&start=2026-10-12T10:00&end=2026-10-15T10:00');

    expect(await screen.findByText(/We couldn't find “Zzyzx”/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Cars across New Zealand' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('shows the API’s reason when the dates are refused', async () => {
    mockRoutes(({ method, path }) => {
      if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user: null } };
      if (path === '/policies') return { status: 200, body: policies };
      if (path === '/search')
        return {
          status: 400,
          body: {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Some details need fixing.',
              fields: { start: 'Pick-up needs to be in the future' },
            },
          },
        };
      return undefined;
    });
    renderWithRouter(routes, '/search?where=Auckland&start=2020-10-12T10:00&end=2020-10-15T10:00');

    expect(await screen.findByRole('alert')).toHaveTextContent('Pick-up needs to be in the future');
  });

  it('opens the filters in a sheet on phones, with the number of cars they leave', async () => {
    mockSearch(twoCars);
    const user = userEvent.setup();
    renderWithRouter(routes, `/search?${DATED}`);

    await screen.findByRole('heading', { name: '2 cars available' });
    expect(screen.getByRole('button', { name: /Auckland · 12–15 Oct/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('button', { name: 'Show 2 cars' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument());
  });

  it('remembers a signed-in guest’s search, for Saved cars', async () => {
    const sent = mockSearch(twoCars, guestUser);
    renderWithRouter(routes, `/search?${DATED}`);

    await screen.findByRole('heading', { name: '2 cars available' });
    await waitFor(() => expect(sent.some((request) => request.path === '/me/last-search')).toBe(true));
    expect(sent.find((request) => request.path === '/me/last-search')?.body).toEqual({
      place: 'Auckland',
      lat: -36.8485,
      lng: 174.7633,
      start: '2026-10-12T10:00',
      end: '2026-10-15T10:00',
    });
  });
});

describe('Browse Cars', () => {
  it('lists every car with its daily price, and no dates', async () => {
    const sent = mockSearch((query) => ({ ...twoCars(query), place: null }));
    renderWithRouter(routes, '/cars?start=2026-10-12T10:00&end=2026-10-15T10:00');

    expect(await screen.findByRole('heading', { name: '2 cars' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Browse cars' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')[0]).toHaveTextContent('$89/day');
    expect(screen.queryByText(/total$/)).not.toBeInTheDocument();
    expect(searches(sent)[0]!.query.has('start')).toBe(false);
  });
});
