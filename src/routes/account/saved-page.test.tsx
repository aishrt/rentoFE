import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedCars } from '@/api/types';
import { savedCar } from '@/features/account/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { SavedPage } from './saved-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockSaved(saved: () => SavedCars) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /me/saved-cars':
        return { status: 200, body: saved() };
      case 'GET /me/favourites':
        return { status: 200, body: { vehicleIds: saved().cars.map((car) => car.id) } };
      case 'DELETE /me/favourites/car-cx5':
        return { status: 204 };
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter(
    [
      { path: '/saved', element: <SavedPage /> },
      { path: '/login', element: <p>Log in page</p> },
    ],
    '/saved',
  );

describe('SavedPage', () => {
  it('prices each car for the last search, carries the dates to its listing, and says which can’t be booked', async () => {
    mockSaved(() => ({
      cars: [
        savedCar({
          availableForDates: true,
          estimate: { days: 3, totalCents: 33_870, includesAirportDelivery: false },
        }),
        savedCar({
          id: 'car-yaris',
          slug: '2019-toyota-yaris',
          title: '2019 Toyota Yaris',
          make: 'Toyota',
          model: 'Yaris',
          availableForDates: false,
        }),
        savedCar({
          id: 'car-old',
          slug: '2015-honda-jazz',
          title: '2015 Honda Jazz',
          make: 'Honda',
          model: 'Jazz',
          listed: false,
          availableForDates: false,
        }),
      ],
      search: {
        place: 'Auckland',
        start: '2026-10-12T21:00:00.000Z',
        end: '2026-10-15T21:00:00.000Z',
        days: 3,
      },
    }));
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Saved cars' })).toBeInTheDocument();
    expect(
      await screen.findByText(/Priced for Auckland, .* \(3 days\), from your last search/),
    ).toBeInTheDocument();

    const items = (await screen.findAllByRole('heading', { level: 2 })).map((heading) =>
      heading.closest('li'),
    );
    expect(items).toHaveLength(3);

    // 12 Oct 21:00 UTC is 13 Oct 10:00 am in NZ (daylight time).
    expect(within(items[0]!).getAllByRole('link')[0]).toHaveAttribute(
      'href',
      '/cars/2020-mazda-cx-5-auckland?start=2026-10-13T10%3A00&end=2026-10-16T10%3A00',
    );
    expect(within(items[1]!).getByText(/Not available for your dates/)).toBeInTheDocument();
    expect(within(items[2]!).getByText(/No longer listed/)).toBeInTheDocument();
    expect(within(items[2]!).getAllByRole('link')[0]).toHaveAttribute('href', '/cars/2015-honda-jazz');
  });

  it('suggests a search with dates when there are none to price for', async () => {
    mockSaved(() => ({ cars: [savedCar()], search: null }));
    render();

    expect(
      await screen.findByText(/Search with your dates and each car shows its total/),
    ).toBeInTheDocument();
  });

  it('drops a car from the list once its heart is turned off', async () => {
    let cars = [
      savedCar(),
      savedCar({
        id: 'car-yaris',
        slug: 'yaris',
        title: '2019 Toyota Yaris',
        make: 'Toyota',
        model: 'Yaris',
      }),
    ];
    const sent = mockSaved(() => ({ cars, search: null }));
    render();

    const unsave = await screen.findByRole('button', { name: /Remove .*CX-5.* from saved cars/ });
    cars = cars.slice(1);
    await userEvent.click(unsave);

    await vi.waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Mazda CX-5/ })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: /Toyota Yaris/ })).toBeInTheDocument();
    expect(sent.some((request) => request.method === 'DELETE')).toBe(true);
  });

  it('has a way to find cars when nothing is saved yet', async () => {
    mockSaved(() => ({ cars: [], search: null }));
    render();

    expect(await screen.findByRole('heading', { name: 'No saved cars yet' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse cars' })).toHaveAttribute('href', '/cars');
  });

  it('has the dashboard’s navigation, with Saved cars marked as the page', async () => {
    mockSaved(() => ({ cars: [], search: null }));
    render();

    const sidebar = await screen.findByRole('navigation', { name: 'Your dashboard' });
    expect(within(sidebar).getByRole('link', { name: 'Saved cars' })).toHaveAttribute('aria-current', 'page');
    const tabs = screen.getByRole('navigation', { name: 'Your dashboard, quick links' });
    expect(within(tabs).getByRole('link', { name: 'Saved' })).toHaveAttribute('aria-current', 'page');
    expect(within(tabs).getByRole('link', { name: 'Trips' })).not.toHaveAttribute('aria-current');
  });
});
