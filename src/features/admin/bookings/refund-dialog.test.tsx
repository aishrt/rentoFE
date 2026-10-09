import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AdminRefundRequest } from '@/api/types';
import { renderWithProviders } from '@/test/utils';
import { RefundDialog } from './refund-dialog';

function renderDialog(tripPayoutSent: boolean) {
  const onConfirm = vi.fn(async (_refund: AdminRefundRequest) => {});
  renderWithProviders(
    <RefundDialog
      open
      onOpenChange={() => {}}
      refundableCents={33_870}
      tripPayoutSent={tripPayoutSent}
      guestName="Kiri"
      onConfirm={onConfirm}
    />,
  );
  return { onConfirm, dialog: within(screen.getByRole('dialog', { name: 'Refund the Guest' })) };
}

async function fill(dialog: ReturnType<typeof within>, funder: RegExp) {
  await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '50');
  await userEvent.click(dialog.getByRole('radio', { name: funder }));
  await userEvent.type(dialog.getByLabelText('Reason'), 'Car was not cleaned');
}

describe('RefundDialog', () => {
  it('asks how the Host pays back a refund they fund once the trip’s payout has gone', async () => {
    const { onConfirm, dialog } = renderDialog(true);
    // Not asked for a goodwill refund.
    await userEvent.click(dialog.getByRole('radio', { name: /Goodwill from Rento Vroom/ }));
    expect(dialog.queryByRole('group', { name: 'How the Host pays it back' })).not.toBeInTheDocument();

    await fill(dialog, /Comes off the Host’s payout/);
    const recovery = within(dialog.getByRole('group', { name: 'How the Host pays it back' }));
    expect(recovery.getByRole('radio', { name: /From their next payout/ })).toBeChecked();
    await userEvent.click(recovery.getByRole('radio', { name: /Reverse the Stripe transfer/ }));
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));

    await vi.waitFor(() =>
      expect(onConfirm.mock.calls[0]?.[0]).toEqual({
        amountCents: 5000,
        reason: 'Car was not cleaned',
        fundedBy: 'HOST',
        recoverFrom: 'REVERSE_TRANSFER',
      }),
    );
  });

  it('takes a Host-funded refund off the trip’s own payout while it’s still to be sent', async () => {
    const { onConfirm, dialog } = renderDialog(false);
    await fill(dialog, /Comes off the Host’s payout/);
    expect(dialog.queryByRole('group', { name: 'How the Host pays it back' })).not.toBeInTheDocument();
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));

    await vi.waitFor(() =>
      expect(onConfirm.mock.calls[0]?.[0]).toEqual({
        amountCents: 5000,
        reason: 'Car was not cleaned',
        fundedBy: 'HOST',
      }),
    );
  });
});
