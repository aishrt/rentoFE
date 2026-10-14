import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBookingDetail } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { renderWithProviders } from '@/test/utils';
import { CancelChargeButton } from './cancel-charge';

afterEach(() => {
  vi.unstubAllGlobals();
});

const charge = {
  id: 'xc1',
  type: 'CLEANING',
  description: 'Sand through the back seats',
  amountCents: 6_000,
  status: 'FAILED',
} as AdminBookingDetail['extraCharges'][number];

const PATH = '/admin/bookings/RV-7K2Q9M/extra-charges/xc1/cancel';

async function cancelWith(reason: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Cancel charge' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Cancel this charge?' }));
  await userEvent.type(dialog.getByLabelText('Why are you cancelling it?'), reason);
  await userEvent.click(dialog.getByRole('button', { name: 'Cancel charge' }));
  return dialog;
}

describe('CancelChargeButton', () => {
  it('cancels the charge with the reason staff give', async () => {
    const sent = mockRoutes((request) =>
      request.method === 'POST' && request.path === PATH
        ? { status: 200, body: { booking: { ref: 'RV-7K2Q9M' }, extraCharges: [] } }
        : undefined,
    );
    renderWithProviders(<CancelChargeButton charge={charge} queryRef="RV-7K2Q9M" />);

    await cancelWith('Added to the wrong booking');
    await vi.waitFor(() =>
      expect(sent.find((request) => request.path === PATH)?.body).toEqual({
        reason: 'Added to the wrong booking',
      }),
    );
    await vi.waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Cancel this charge?' })).not.toBeInTheDocument(),
    );
  });

  it('says the refunds permission is needed when the API refuses it', async () => {
    mockRoutes((request) =>
      request.path === PATH
        ? { status: 403, body: { error: { code: 'FORBIDDEN', message: 'Forbidden' } } }
        : undefined,
    );
    renderWithProviders(<CancelChargeButton charge={charge} queryRef="RV-7K2Q9M" />);

    const dialog = await cancelWith('Written off after the retries');
    expect(await dialog.findByRole('alert')).toHaveTextContent('You need the refunds permission to do this.');
  });
});
