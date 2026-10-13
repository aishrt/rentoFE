import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Booking } from '@/api/types';
import { renderWithProviders } from '@/test/utils';
import { PartyDetails } from './booking-parts';

const host: Booking['host'] = {
  id: 'u1',
  firstName: 'Hana',
  verified: true,
  rating: { avg: 4.8, count: 3 },
  tripCount: 3,
};

describe('PartyDetails', () => {
  it('shows the other party’s photo (plan §6.2), or their initial until they add one', () => {
    const photo = 'https://media.example.com/members/u1/photo/0b6a3c1e-400.webp';
    const { unmount } = renderWithProviders(
      <PartyDetails party={{ ...host, avatarUrl: photo }} role="host" phoneNote="" />,
    );
    expect(document.querySelector('img')).toHaveAttribute('src', photo);
    expect(screen.queryByText('H')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<PartyDetails party={host} role="host" phoneNote="" />);
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
