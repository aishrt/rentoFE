import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PaymentHistoryItem, SavedCard } from '@/api/types';
import { paymentItem, savedCard } from '@/features/account/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { PaymentsPage } from './payments-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockPayments({
  cards = () => [savedCard()],
  payments = [paymentItem()],
}: { cards?: () => SavedCard[]; payments?: PaymentHistoryItem[] } = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /me/payment-methods':
        return { status: 200, body: { cards: cards() } };
      case 'GET /me/payments':
        return { status: 200, body: { payments } };
      case 'DELETE /me/payment-methods/pm_visa':
        return { status: 204 };
      default:
        return undefined;
    }
  });
}

const render = () =>
  renderWithRouter([{ path: '/account/payments', element: <PaymentsPage /> }], '/account/payments');

const section = (name: string) => screen.findByRole('region', { name });

describe('PaymentsPage', () => {
  it('lists saved cards with their expiry, wallet and any that have expired', async () => {
    mockPayments({
      cards: () => [
        savedCard(),
        savedCard({
          id: 'pm_old',
          brand: 'mastercard',
          last4: '4444',
          expMonth: 1,
          expYear: 2024,
          expired: true,
        }),
        savedCard({ id: 'pm_apple', brand: 'amex', last4: '0005', wallet: 'apple_pay' }),
      ],
    });
    render();

    const cards = within(await section('Saved cards'));
    expect(await cards.findByText('Visa ending 4242')).toBeInTheDocument();
    const visa = cards.getByText('Visa ending 4242').closest('li')!;
    expect(within(visa).getByText(/Expires 08\/31/)).toBeInTheDocument();
    const old = cards.getByText('Mastercard ending 4444').closest('li')!;
    expect(within(old).getByText('Expired')).toBeInTheDocument();
    const apple = cards.getByText('American Express ending 0005').closest('li')!;
    expect(within(apple).getByText('Apple Pay')).toBeInTheDocument();
  });

  it('asks before removing a card, then takes it off the list', async () => {
    let cards = [savedCard()];
    const sent = mockPayments({ cards: () => cards });
    render();

    const list = within(await section('Saved cards'));
    await userEvent.click(await list.findByRole('button', { name: 'Remove Visa ending 4242' }));
    const dialog = await screen.findByRole('dialog', { name: 'Remove this card?' });
    expect(within(dialog).getByText(/won’t be offered at checkout/)).toBeInTheDocument();
    cards = [];
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove card' }));

    expect(await list.findByText(/No saved cards yet/)).toBeInTheDocument();
    expect(
      sent.some((request) => request.method === 'DELETE' && request.path === '/me/payment-methods/pm_visa'),
    ).toBe(true);
  });

  it('shows each payment with its trip, refunds and receipt', async () => {
    mockPayments({
      payments: [
        paymentItem({
          status: 'PARTIALLY_REFUNDED',
          refundedCents: 10_000,
          refunds: [{ amountCents: 10_000, status: 'SUCCEEDED', at: '2026-10-04T01:00:00.000Z' }],
        }),
        paymentItem({
          id: 'pay2',
          bookingRef: 'RV-REQ234',
          status: 'AUTHORISED',
          method: undefined,
          hasReceipt: false,
        }),
      ],
    });
    render();

    const history = within(await section('Payment history'));
    const rows = await history.findAllByRole('listitem');
    expect(rows).toHaveLength(2);

    const paid = within(rows[0]!);
    expect(paid.getByText('2022 Toyota RAV4')).toBeInTheDocument();
    expect(paid.getByText('$338.70')).toBeInTheDocument();
    expect(paid.getByText('Partly refunded')).toBeInTheDocument();
    expect(paid.getByText(/Refunded \$100 on 04\/10\/2026/)).toBeInTheDocument();
    expect(paid.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute('href', '/trips/RV-7K2Q9M');
    expect(paid.getByRole('link', { name: 'Receipt' })).toHaveAttribute('href', '/trips/RV-7K2Q9M/receipt');

    const held = within(rows[1]!);
    expect(held.getByText('Authorised, not charged yet')).toBeInTheDocument();
    expect(held.queryByRole('link', { name: 'Receipt' })).not.toBeInTheDocument();
  });

  it('says what will show before there are cards or payments', async () => {
    mockPayments({ cards: () => [], payments: [] });
    render();

    expect(await within(await section('Saved cards')).findByText(/No saved cards yet/)).toBeInTheDocument();
    expect(await within(await section('Payment history')).findByText(/No payments yet/)).toBeInTheDocument();
  });
});
