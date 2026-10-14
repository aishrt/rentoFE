import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { vehicleDetail } from './test-fixtures';
import { SpecsSection } from './vehicle-facts';

/** A spec tile's value, by its label. */
const spec = (label: string) => screen.queryByText(label, { selector: 'dt' })?.nextElementSibling;

describe('SpecsSection', () => {
  it('shows a plug-in hybrid’s engine and its battery', () => {
    renderWithProviders(
      <SpecsSection
        vehicle={vehicleDetail({
          fuelType: 'PHEV',
          powertrain: { engineCc: 1998, cylinders: 4, evRangeKm: 84, batteryKwh: 13.8 },
        })}
      />,
    );
    expect(spec('Engine')).toHaveTextContent('2.0 litre, 4 cylinders');
    expect(spec('Battery')).toHaveTextContent('13.8 kWh · 84 km electric range');
  });

  it('keeps the host’s description for a plug-in hybrid, beside the battery', () => {
    renderWithProviders(
      <SpecsSection
        vehicle={vehicleDetail({
          fuelType: 'PHEV',
          powertrain: { description: '2.4L petrol plug-in hybrid, AWD', batteryKwh: 20 },
        })}
      />,
    );
    expect(spec('Engine')).toHaveTextContent('2.4L petrol plug-in hybrid, AWD');
    expect(spec('Battery')).toHaveTextContent(/^20 kWh$/);
  });

  it('shows a plug-in hybrid with only its battery recorded once', () => {
    renderWithProviders(
      <SpecsSection
        vehicle={vehicleDetail({ fuelType: 'PHEV', powertrain: { evRangeKm: 60, batteryKwh: 12 } })}
      />,
    );
    expect(spec('Engine')).toBeUndefined();
    expect(spec('Battery')).toHaveTextContent('12 kWh · 60 km electric range');
  });

  it('shows an electric car’s range and battery as its powertrain', () => {
    renderWithProviders(
      <SpecsSection
        vehicle={vehicleDetail({ fuelType: 'EV', powertrain: { evRangeKm: 460, batteryKwh: 64.8 } })}
      />,
    );
    expect(spec('Powertrain')).toHaveTextContent('460 km range · 64.8 kWh battery');
    expect(spec('Battery')).toBeUndefined();
  });

  it('shows the host’s damage notes as plain text, with their line breaks', () => {
    const base = vehicleDetail();
    renderWithProviders(
      <SpecsSection
        vehicle={vehicleDetail({
          damageNotes: 'Scratch on the rear bumper.\n<b>Chip</b> in the windscreen.',
          photos: [
            ...base.photos,
            {
              id: 'p4',
              type: 'DAMAGE',
              url: 'https://images.test/rav4-damage.webp',
              alt: '2022 Toyota RAV4: existing damage',
            },
          ],
        })}
      />,
    );
    const damage = within(screen.getByRole('region', { name: 'Known marks and damage' }));
    expect(damage.getByText('Noted by the host, with photos in the gallery above.')).toBeInTheDocument();
    expect(damage.getByText(/Scratch on the rear bumper/).textContent).toBe(
      'Scratch on the rear bumper.\n<b>Chip</b> in the windscreen.',
    );
    expect(damage.queryByText('Chip', { selector: 'b' })).not.toBeInTheDocument();
  });

  it('leaves out the gallery pointer without damage photos, and the section without notes', () => {
    const { unmount } = renderWithProviders(
      <SpecsSection vehicle={vehicleDetail({ damageNotes: 'Small dent on the driver’s door.' })} />,
    );
    expect(
      within(screen.getByRole('region', { name: 'Known marks and damage' })).getByText('Noted by the host.'),
    ).toBeInTheDocument();
    unmount();

    renderWithProviders(<SpecsSection vehicle={vehicleDetail()} />);
    expect(screen.getByRole('region', { name: 'The car' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Known marks and damage' })).not.toBeInTheDocument();
  });
});
