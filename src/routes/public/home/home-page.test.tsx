import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DestinationSummary, VehicleCard } from '@/api/types';
import { carCard, mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { HomePage } from './home-page';

const REVIEW = {
  id: 'r1',
  author: { firstName: 'Nikau' },
  overall: 5,
  body: 'Spotless car and an easy pick-up at the airport.',
  vehicleTitle: '2020 Mazda CX-5',
  city: 'Auckland',
  createdAt: '2026-09-23T10:00:00.000Z',
};

const tile = (
  slug: string,
  city: string,
  overrides: Partial<DestinationSummary> = {},
): DestinationSummary => ({
  slug,
  city,
  region: 'Northland',
  tagline: `Drive ${city}.`,
  lat: -35.28,
  lng: 174.09,
  airports: [],
  featured: true,
  ...overrides,
});

/**
 * The homepage's requests: the session, featured cars and reviews, the headline and the destination tiles.
 * Without a headline or tiles, those requests fail and the homepage shows its original ones.
 */
function mockHome({
  featured = { status: 200, body: { vehicles: [carCard()] } },
  reviews = { show: false, reviews: [] as (typeof REVIEW)[] },
  hero,
  destinations,
}: {
  featured?: { status: number; body?: { vehicles: VehicleCard[] } };
  reviews?: object;
  hero?: { headline: string; subheading: string };
  destinations?: DestinationSummary[];
} = {}) {
  return mockRoutes(({ method, path }) => {
    if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user: null } };
    if (path === '/vehicles/featured') return featured;
    if (path === '/reviews/featured') return { status: 200, body: reviews };
    if (path === '/cms/home.hero') return hero ? { status: 200, body: { hero } } : { status: 503 };
    if (path === '/destinations') {
      return destinations ? { status: 200, body: { destinations } } : { status: 503 };
    }
    return undefined;
  });
}

/**
 * The featured cars and reviews are lazy sections: their code loads first, which on a busy machine or a CI
 * runner can take longer than Testing Library's one second.
 */
const LAZY = { timeout: 5_000 };

/** Waits for the featured cars' placeholder to give way to the section, or to nothing. */
const featuredSettled = (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('section[aria-hidden="true"]')).toBeNull(), LAZY);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('HomePage', () => {
  it('leads with the headline, the search and the way in to hosting', async () => {
    mockHome();
    renderWithProviders(<HomePage />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Rent a car from local owners across New Zealand.',
    );
    expect(await screen.findByRole('combobox', { name: 'Where are you going?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search Cars' })).toBeInTheDocument();
    expect(screen.getByText(/Earn money by sharing it/)).toBeInTheDocument();
    const hero = screen.getByRole('region', { name: 'Rent a car from local owners across New Zealand.' });
    expect(within(hero).getByRole('link', { name: 'Become a Host' })).toHaveAttribute(
      'href',
      '/become-a-host',
    );
  });

  it('shows the featured cars, with a link to browse them all', async () => {
    mockHome({
      featured: {
        status: 200,
        body: {
          vehicles: [
            carCard(),
            carCard({
              id: 'car-leaf',
              slug: '2021-nissan-leaf-wellington',
              title: '2021 Nissan Leaf',
              make: 'Nissan',
              model: 'Leaf',
              year: 2021,
            }),
          ],
        },
      },
    });
    renderWithProviders(<HomePage />);

    const section = await screen.findByRole('region', { name: 'Ready when you are' }, LAZY);
    expect(within(section).getAllByRole('article')).toHaveLength(2);
    expect(within(section).getByRole('link', { name: 'Nissan Leaf 2021' })).toHaveAttribute(
      'href',
      '/cars/2021-nissan-leaf-wellington',
    );
    expect(within(section).getByRole('link', { name: /Browse all cars/ })).toHaveAttribute('href', '/cars');
  });

  it('leaves out the featured cars when there are none, or they can’t load, and keeps the rest', async () => {
    for (const featured of [
      { status: 200, body: { vehicles: [] } },
      { status: 500, body: undefined },
    ]) {
      mockHome({ featured });
      const { container, unmount } = renderWithProviders(<HomePage />);

      await featuredSettled(container);
      expect(screen.queryByRole('region', { name: 'Ready when you are' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search Cars' })).toBeInTheDocument();
      unmount();
    }
  });

  it('shows customer reviews only once there are enough to show', async () => {
    mockHome({ reviews: { show: false, reviews: [REVIEW] } });
    const hidden = renderWithProviders(<HomePage />);
    await featuredSettled(hidden.container);
    expect(screen.queryByRole('region', { name: 'Trips people loved' })).not.toBeInTheDocument();
    hidden.unmount();

    mockHome({ reviews: { show: true, reviews: [REVIEW] } });
    renderWithProviders(<HomePage />);
    const reviews = await screen.findByRole('region', { name: 'Trips people loved' }, LAZY);
    expect(reviews).toHaveTextContent('Spotless car and an easy pick-up at the airport.');
    expect(reviews).toHaveTextContent('Nikau');
  });

  it('shows the headline admins chose, and the original until it loads', async () => {
    mockHome({
      hero: { headline: 'Drive Aotearoa with a local’s car.', subheading: 'Booked in minutes, all in NZD.' },
    });
    renderWithProviders(<HomePage />);

    // The spec's proposition shows straight away, so the page never waits on the headline.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Rent a car from local owners across New Zealand.',
    );
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Drive Aotearoa with a local’s car.',
      ),
    );
    expect(screen.getByText('Booked in minutes, all in NZD.')).toBeInTheDocument();
  });

  it('shows the featured, published destination pages as tiles, and the launch cities until they load', async () => {
    mockHome({
      destinations: [
        tile('queenstown', 'Queenstown', { region: 'Otago' }),
        tile('bay-of-islands', 'Bay of Islands', { maoriName: 'Pēwhairangi' }),
        tile('rotorua', 'Rotorua', { featured: false }),
      ],
    });
    renderWithProviders(<HomePage />);

    const section = screen.getByRole('region', { name: 'Where will you drive next?' });
    expect(within(section).getByRole('link', { name: 'Car rental in Auckland' })).toBeInTheDocument();
    await waitFor(() =>
      expect(within(section).getByRole('link', { name: 'Car rental in Bay of Islands' })).toHaveAttribute(
        'href',
        '/rental/bay-of-islands',
      ),
    );
    expect(
      within(section)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/rental/queenstown', '/rental/bay-of-islands']);
    expect(within(section).getByText('Pēwhairangi')).toBeInTheDocument();
  });

  it('keeps the launch cities when the destinations can’t load, and leaves the section out when none are featured', async () => {
    mockHome();
    const failed = renderWithProviders(<HomePage />);
    await featuredSettled(failed.container);
    const section = screen.getByRole('region', { name: 'Where will you drive next?' });
    expect(within(section).getAllByRole('link')).toHaveLength(5);
    failed.unmount();

    mockHome({ destinations: [tile('rotorua', 'Rotorua', { featured: false })] });
    renderWithProviders(<HomePage />);
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Where will you drive next?' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Search Cars' })).toBeInTheDocument();
  });
});
