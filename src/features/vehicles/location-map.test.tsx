import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LocationMap } from './location-map';
import { vehicleDetail } from './test-fixtures';

const MAP_URL = 'http://api.test/api/v1/vehicles/car-rav4/area-map?v=-45.0168%2C168.7307';

const withMap = (mapUrl: string | null) => {
  const vehicle = vehicleDetail();
  return vehicleDetail({ location: { ...vehicle.location, mapUrl } });
};

describe('LocationMap', () => {
  it('shows the map the API serves, with no Google key in the website', () => {
    render(<LocationMap vehicle={withMap(MAP_URL)} />);

    const map = screen.getByRole('img', { name: 'Map of the area around Frankton, Queenstown' });
    expect(map).toHaveAttribute('src', MAP_URL);
    expect(screen.getByText(/Approximate area: Frankton, Queenstown/)).toBeInTheDocument();
  });

  it('shows the sketch when Google isn’t set up', () => {
    const { container } = render(<LocationMap vehicle={withMap(null)} />);

    expect(screen.queryByRole('img', { name: /Map of the area/ })).not.toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('falls back to the sketch when the map fails to load', () => {
    const { container } = render(<LocationMap vehicle={withMap(MAP_URL)} />);

    fireEvent.error(screen.getByRole('img', { name: /Map of the area/ }));

    expect(screen.queryByRole('img', { name: /Map of the area/ })).not.toBeInTheDocument();
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
    expect(screen.getByText(/Approximate area: Frankton, Queenstown/)).toBeInTheDocument();
  });
});
