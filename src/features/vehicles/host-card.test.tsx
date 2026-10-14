import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { HostCard } from './host-card';
import { vehicleDetail } from './test-fixtures';

describe('HostCard', () => {
  it('shows the host’s trust signals and links to their profile and reviews', () => {
    renderWithProviders(<HostCard host={vehicleDetail().host} />);
    expect(screen.getByText('Hosting on Rento Vroom since 2026')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Liam’s profile and reviews' })).toHaveAttribute(
      'href',
      '/members/host-liam',
    );
  });
});
