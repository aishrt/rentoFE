import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { BookedTermsDetails, PartyDetails } from './booking-parts';
import { booking } from './test-fixtures';

describe('PartyDetails', () => {
  it('links to the other party’s profile and reviews, as when a host answers a request', () => {
    const { guest } = booking();
    renderWithProviders(
      <PartyDetails
        party={{ ...guest, id: 'guest-kiri' }}
        role="guest"
        phoneNote="Mobile shows once confirmed."
      />,
    );
    expect(screen.getByText('Kiri')).toBeInTheDocument();
    expect(screen.getByText('1 trip completed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Kiri’s profile and reviews' })).toHaveAttribute(
      'href',
      '/members/guest-kiri',
    );
  });

  it('has no profile link for an account that’s gone', () => {
    const { host } = booking();
    renderWithProviders(
      <PartyDetails party={{ ...host, firstName: 'Former member' }} role="host" phoneNote="—" />,
    );
    expect(screen.queryByRole('link', { name: /profile and reviews/ })).not.toBeInTheDocument();
  });
});

describe('BookedTermsDetails', () => {
  it('shows daily allowance, total allowance and extra kilometre price for limited km', () => {
    renderWithProviders(
      <BookedTermsDetails
        terms={{
          fuelPolicy: 'SAME_LEVEL',
          unlimitedKm: false,
          kmAllowancePerDay: 200,
          allowanceKm: 600,
          extraKmCents: 35,
          electric: false,
        }}
      />,
    );
    expect(screen.getByText('200 km/day (600 km total)')).toBeInTheDocument();
    expect(screen.getByText('$0.35/km')).toBeInTheDocument();
    expect(screen.getByText('Return at same fuel level')).toBeInTheDocument();
  });

  it('shows unlimited kilometres and electric battery policy', () => {
    renderWithProviders(
      <BookedTermsDetails
        terms={{
          fuelPolicy: 'FULL',
          unlimitedKm: true,
          extraKmCents: 0,
          electric: true,
        }}
      />,
    );
    expect(screen.getByText('Unlimited kilometres')).toBeInTheDocument();
    expect(screen.queryByText(/Extra kilometre charge/)).not.toBeInTheDocument();
    expect(screen.getByText('Return fully charged')).toBeInTheDocument();
  });
});
