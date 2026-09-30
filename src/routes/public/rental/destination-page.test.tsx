import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { carCard, mockRoutes, searchResults } from '@/features/vehicles/test-fixtures';
import { renderWithRouter } from '@/test/utils';
import { DestinationPage } from './destination-page';

const QUEENSTOWN = {
  slug: 'queenstown',
  city: 'Queenstown',
  maoriName: 'Tāhuna',
  region: 'Otago',
  tagline: 'Alpine roads, lakes and the ski fields, all within an hour or two.',
  lat: -45.0312,
  lng: 168.6626,
  airports: ['ZQN'],
  intro: 'Queenstown sits on the shore of Lake Wakatipu, beneath the Remarkables.',
};

function mockDestination(cars = [carCard()]) {
  return mockRoutes(({ method, path }) => {
    if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user: null } };
    if (path === '/destinations/queenstown') return { status: 200, body: { destination: QUEENSTOWN } };
    if (path === '/destinations/atlantis')
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: "We couldn't find that destination." } },
      };
    if (path === '/search') return { status: 200, body: searchResults({ results: cars }) };
    return undefined;
  });
}

const renderPage = (slug: string) =>
  renderWithRouter([{ path: '/rental/:city', element: <DestinationPage /> }], `/rental/${slug}`);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('DestinationPage', () => {
  it('introduces the city, prefills the search and shows the cars nearby', async () => {
    const sent = mockDestination();
    renderPage('queenstown');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Car rental in Queenstown' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Tāhuna')).toBeInTheDocument();
    expect(screen.getByText(/beneath the Remarkables/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Where are you going?' })).toHaveValue('Queenstown');
    expect(await screen.findByRole('link', { name: 'Mazda CX-5 2020' })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe('Car rental in Queenstown · Rento Vroom'));

    const search = sent.find((request) => request.path === '/search')!.query;
    expect(search.get('lat')).toBe('-45.0312');
    expect(search.get('lng')).toBe('168.6626');
  });

  it('still loads with no cars, and invites hosts', async () => {
    mockDestination([]);
    renderPage('queenstown');

    expect(await screen.findByRole('heading', { name: 'No cars here yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Become a Host' })).toHaveAttribute('href', '/become-a-host');
  });

  it('shows the not-found page for a city we don’t know', async () => {
    mockDestination();
    renderPage('atlantis');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Looks like you took a wrong turn' }),
    ).toBeInTheDocument();
  });
});
