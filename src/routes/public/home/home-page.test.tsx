import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VehicleCard } from '@/api/types';
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

/** The homepage's requests: the session, featured cars and featured reviews. */
function mockHome({
  featured = { status: 200, body: { vehicles: [carCard()] } },
  reviews = { show: false, reviews: [] as (typeof REVIEW)[] },
}: { featured?: { status: number; body?: { vehicles: VehicleCard[] } }; reviews?: object } = {}) {
  return mockRoutes(({ method, path }) => {
    if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user: null } };
    if (path === '/vehicles/featured') return featured;
    if (path === '/reviews/featured') return { status: 200, body: reviews };
    return undefined;
  });
}

/** Waits for the featured cars' placeholder to give way to the section, or to nothing. */
const featuredSettled = (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('section[aria-hidden="true"]')).toBeNull());

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

    const section = await screen.findByRole('region', { name: 'Ready when you are' });
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
    const reviews = await screen.findByRole('region', { name: 'Trips people loved' });
    expect(reviews).toHaveTextContent('Spotless car and an easy pick-up at the airport.');
    expect(reviews).toHaveTextContent('Nikau');
  });
});
