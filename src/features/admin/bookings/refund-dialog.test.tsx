import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { AdminRefundRequest } from '@/api/types';
import { renderWithProviders } from '@/test/utils';
import { RefundDialog } from './refund-dialog';

/** The fixtures' trip: $267 of rental, of which the Host's payout is $213.60 (80 %). */
const HOST_FUNDING = { maxCents: 26_700, baseCents: 26_700, payoutCents: 21_360, hostLeftCents: 21_360 };

function renderDialog(tripPayoutSent: boolean) {
  const onConfirm = vi.fn(async (_refund: AdminRefundRequest) => {});
  renderWithProviders(
    <RefundDialog
      open
      onOpenChange={() => {}}
      refundableCents={33_870}
      tripPayoutSent={tripPayoutSent}
      hostFunding={HOST_FUNDING}
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

  it('says what a Host-funded refund costs the Host, and keeps it to the rental they were paid for', async () => {
    const { onConfirm, dialog } = renderDialog(false);
    await fill(dialog, /Comes off the Host’s payout/);
    expect(
      dialog.getByText('The Host pays $40 of this (their share); Rento Vroom covers its commission.'),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Up to \$267 when the Host funds it/)).toBeInTheDocument();

    // The service fee and protection aren't the Host's to fund.
    await userEvent.clear(dialog.getByLabelText('Amount (NZD)'));
    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '300');
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await dialog.findByText(/The Host can fund up to \$267/)).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('refunds one of the booking’s extra charges, up to what’s left of it', async () => {
    const onConfirm = vi.fn(async (_refund: AdminRefundRequest) => {});
    renderWithProviders(
      <RefundDialog
        open
        onOpenChange={() => {}}
        refundableCents={33_870}
        tripPayoutSent={false}
        charges={[
          {
            paymentId: '6652a1b2c3d4e5f6a7b8c9d0',
            type: 'CLEANING',
            description: 'Sand through the back seats.',
            refundableCents: 8_000,
            hostFunding: { maxCents: 8_000, baseCents: 8_000, payoutCents: 6_400, hostLeftCents: 6_400 },
            payoutSent: true,
          },
        ]}
        guestName="Kiri"
        onConfirm={onConfirm}
      />,
    );
    const dialog = within(screen.getByRole('dialog', { name: 'Refund the Guest' }));
    const target = within(dialog.getByRole('group', { name: 'What to refund' }));
    expect(target.getByRole('radio', { name: /The booking/ })).toBeChecked();
    await userEvent.click(target.getByRole('radio', { name: /Extra charge: Cleaning/ }));
    expect(dialog.getByText('Up to $80.')).toBeInTheDocument();

    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '90');
    await userEvent.click(dialog.getByRole('radio', { name: /Comes off the Host’s payout/ }));
    await userEvent.type(dialog.getByLabelText('Reason'), 'Charged by mistake');
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));
    expect(await dialog.findByText('You can refund up to $80')).toBeInTheDocument();

    // The Host's share of this charge was paid, so a Host-funded refund is taken back another way.
    const recovery = within(dialog.getByRole('group', { name: 'How the Host pays it back' }));
    expect(
      recovery.getByText('The Host’s share of this charge has already been sent to them.'),
    ).toBeInTheDocument();
    await userEvent.clear(dialog.getByLabelText('Amount (NZD)'));
    await userEvent.type(dialog.getByLabelText('Amount (NZD)'), '80');
    await userEvent.click(dialog.getByRole('button', { name: 'Refund' }));
    await vi.waitFor(() =>
      expect(onConfirm.mock.calls[0]?.[0]).toEqual({
        amountCents: 8000,
        reason: 'Charged by mistake',
        fundedBy: 'HOST',
        paymentId: '6652a1b2c3d4e5f6a7b8c9d0',
        recoverFrom: 'NEXT_PAYOUT',
      }),
    );
  });
});
