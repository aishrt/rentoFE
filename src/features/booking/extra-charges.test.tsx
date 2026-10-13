import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { ExtraCharges } from './extra-charges';
import { confirmedBooking } from './test-fixtures';

describe('ExtraCharges', () => {
  it('shows a charge refunded in full as refunded, and one refunded in part as paid with what came back', () => {
    renderWithProviders(
      <ExtraCharges
        viewer="GUEST"
        booking={confirmedBooking({
          status: 'COMPLETED',
          extraCharges: [
            {
              id: 'xc1',
              type: 'CLEANING',
              description: 'Sand through the back seats',
              amountCents: 6_000,
              status: 'REFUNDED',
              refundedCents: 6_000,
              addedAt: '2026-10-09T01:00:00.000Z',
            },
            {
              id: 'xc2',
              type: 'EXTRA_KM',
              description: '50 km over the 750 km included, at $0.35 a km',
              amountCents: 1_750,
              status: 'PAID',
              refundedCents: 500,
              addedAt: '2026-10-10T01:00:00.000Z',
            },
          ],
        })}
      />,
    );
    const [refunded, partly] = within(screen.getByRole('region', { name: 'Extra charges' })).getAllByRole(
      'listitem',
    );
    expect(within(refunded!).getByText('Refunded')).toBeInTheDocument();
    expect(within(refunded!).getByText(/refunded in full to the card it was paid with/)).toBeInTheDocument();
    expect(within(partly!).getByText('Paid')).toBeInTheDocument();
    expect(partly).toHaveTextContent(/\$5(\.00)? of it was refunded to the card it was paid with/);
  });
});
