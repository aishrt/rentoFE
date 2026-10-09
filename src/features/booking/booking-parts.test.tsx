import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { PartyDetails } from './booking-parts';
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
