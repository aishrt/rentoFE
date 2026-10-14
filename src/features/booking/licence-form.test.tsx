import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { nzWallClockParts } from '@/lib/dates';
import { renderWithProviders } from '@/test/utils';
import { LicenceForm } from './licence-form';
import { readiness } from './test-fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

async function fill(legend: string, date: string) {
  const [year, month, day] = date.split('-');
  const group = within(screen.getByRole('group', { name: legend }));
  await userEvent.type(group.getByLabelText('Day'), day!);
  await userEvent.type(group.getByLabelText('Month'), month!);
  await userEvent.type(group.getByLabelText('Year'), year!);
}

describe('LicenceForm', () => {
  it('chooses an overseas licence’s country from a list, sent as its code, and takes one expiring today', async () => {
    const sent = mockRoutes((request) =>
      request.method === 'PUT' && request.path === '/me/driver-licence'
        ? { status: 200, body: readiness() }
        : undefined,
    );
    const onSaved = vi.fn();
    renderWithProviders(<LicenceForm onSaved={onSaved} hasLicence={false} />);

    await userEvent.click(screen.getByRole('button', { name: /^Licence type/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Overseas licence' }));
    await userEvent.type(screen.getByLabelText('Licence number'), 'D1234567');
    await fill('First issued', '2012-02-04');
    // Still valid on its expiry day.
    await fill('Expires', nzWallClockParts(new Date()).date);
    await fill('Date of birth', '1990-04-21');

    await userEvent.click(screen.getByRole('button', { name: 'Save licence details' }));
    expect(await screen.findByText('Choose the country that issued your licence')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Issued in/ }));
    await userEvent.click(screen.getByRole('option', { name: 'United States' }));
    expect(screen.queryByRole('option', { name: 'New Zealand' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save licence details' }));

    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(sent[0]?.body).toMatchObject({ class: 'OVERSEAS', number: 'D1234567', country: 'US' });
  });
});
