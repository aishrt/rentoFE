import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { guestUser, renderWithProviders } from '@/test/utils';
import { carCard, mockRoutes } from './test-fixtures';
import { VehicleCard } from './vehicle-card';

function signedOut() {
  return mockRoutes(({ method, path }) =>
    method === 'POST' && path === '/auth/session' ? { status: 200, body: { user: null } } : undefined,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('VehicleCard', () => {
  it('shows the facts every card has, in the same place', async () => {
    signedOut();
    renderWithProviders(<VehicleCard vehicle={carCard()} />);
    const card = screen.getByRole('article');

    expect(within(card).getByRole('link', { name: 'Mazda CX-5 2020' })).toHaveAttribute(
      'href',
      '/cars/2020-mazda-cx-5-auckland',
    );
    expect(card).toHaveTextContent('Rated 4.9 out of 5');
    expect(card).toHaveTextContent('(38 trips)');
    expect(card).toHaveTextContent('Mount Eden · 4.2 km away');
    expect(card).toHaveTextContent('Auto · 5 seats · Hybrid');
    expect(card).toHaveTextContent('Apple CarPlay · Roof rails');
    expect(screen.getByRole('img', { name: '2020 Mazda CX-5: front' })).toHaveStyle({
      viewTransitionName: 'vehicle-photo-car-cx5',
    });
  });

  it('shows the daily price without dates, and the estimated total with them', () => {
    signedOut();
    const { unmount } = renderWithProviders(<VehicleCard vehicle={carCard()} />);
    expect(screen.getByRole('article')).toHaveTextContent('$89/day');
    expect(screen.queryByText(/total/)).not.toBeInTheDocument();
    unmount();

    renderWithProviders(
      <VehicleCard
        vehicle={carCard({ estimate: { days: 3, totalCents: 33_870, includesAirportDelivery: false } })}
        listingSearch="?start=2026-10-12T10:00&end=2026-10-15T10:00"
      />,
    );
    const card = screen.getByRole('article');
    expect(card).toHaveTextContent('$89/day');
    expect(card).toHaveTextContent('$339 total');
    expect(
      screen.getByTitle(/Estimated total for 3 days, including every mandatory charge/),
    ).toBeInTheDocument();
    // The listing opens with the same dates.
    expect(within(card).getByRole('link', { name: 'Mazda CX-5 2020' })).toHaveAttribute(
      'href',
      '/cars/2020-mazda-cx-5-auckland?start=2026-10-12T10:00&end=2026-10-15T10:00',
    );
  });

  it('says New instead of stars before the first review, with any trips', () => {
    signedOut();
    renderWithProviders(<VehicleCard vehicle={carCard({ rating: { avg: 0, count: 0 }, tripCount: 1 })} />);
    const card = screen.getByRole('article');
    expect(within(card).getByText('New')).toBeInTheDocument();
    expect(card).toHaveTextContent('1 trip');
    expect(card).not.toHaveTextContent(/Rated/);
  });

  it('shows a badge for Instant Book, delivery and airport delivery only when offered', () => {
    signedOut();
    renderWithProviders(
      <VehicleCard vehicle={carCard({ instantBook: true, delivery: false, airportDelivery: true })} />,
    );
    const badges = within(screen.getByRole('list', { name: 'Booking options' }));
    expect(badges.getByText('Instant Book')).toBeInTheDocument();
    expect(badges.getByText('Airport')).toBeInTheDocument();
    expect(badges.queryByText('Delivery')).not.toBeInTheDocument();
  });

  it('sends a visitor who is not signed in to log in, and back here after', async () => {
    signedOut();
    const user = userEvent.setup();
    const { router } = renderWithProviders(<VehicleCard vehicle={carCard()} />, '/search?where=Auckland');

    await user.click(await screen.findByRole('button', { name: 'Save Mazda CX-5' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(new URLSearchParams(router.state.location.search).get('next')).toBe('/search?where=Auckland');
  });

  it('saves the car for a signed-in guest straight away', async () => {
    let saved: string[] = [];
    const sent = mockRoutes(({ method, path }) => {
      if (method === 'POST' && path === '/auth/session') return { status: 200, body: { user: guestUser } };
      if (method === 'GET' && path === '/me/favourites') return { status: 200, body: { vehicleIds: saved } };
      if (method === 'PUT' && path === '/me/favourites/car-cx5') {
        saved = ['car-cx5'];
        return { status: 204 };
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderWithProviders(<VehicleCard vehicle={carCard()} />);

    const heart = await screen.findByRole('button', { name: 'Save Mazda CX-5' });
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false'));
    await user.click(heart);

    expect(await screen.findByRole('button', { name: 'Remove Mazda CX-5 from saved cars' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await waitFor(() => expect(sent.some((request) => request.method === 'PUT')).toBe(true));
  });
});
