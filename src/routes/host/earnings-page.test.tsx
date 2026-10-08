import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Earnings, EarningsRow, HostPayouts } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { EarningsPage } from './earnings-page';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const hostUser = { ...guestUser, roles: ['GUEST', 'HOST'], hostStatus: 'APPROVED' };

function row(overrides: Partial<EarningsRow> = {}): EarningsRow {
  return {
    ref: 'RV-7K2Q9M',
    vehicleTitle: '2021 Toyota Corolla',
    start: '2026-10-05T21:00:00.000Z',
    end: '2026-10-08T21:00:00.000Z',
    status: 'COMPLETED',
    rentalCents: 26700,
    rentalGstCents: 3483,
    deliveryCents: 0,
    deliveryGstCents: 0,
    extraChargesCents: 0,
    extraChargesGstCents: 0,
    keptFeeCents: 0,
    commissionCents: 5340,
    commissionGstCents: 697,
    hostFundedRefundsCents: 0,
    hostCancellationFeeCents: 0,
    netCents: 21360,
    ...overrides,
  };
}

function earnings(overrides: Partial<Earnings> = {}): Earnings {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, '0')}`,
    netCents: index === 11 ? 21360 : index === 10 ? 10000 : 0,
  }));
  return {
    summary: {
      todayCents: 0,
      weekCents: 21360,
      monthCents: 21360,
      previousMonthCents: 10000,
      lifetimeCents: 31360,
      upcomingPayoutsCents: 21360,
      platformFeesMonthCents: 5340,
      platformFeesLifetimeCents: 7840,
    },
    months,
    bookings: [],
    gstRegistered: false,
    ...overrides,
  };
}

function payouts(account: Partial<HostPayouts['account']> = {}): HostPayouts {
  return {
    account: { connected: false, payoutsEnabled: false, requirements: [], feesOwedCents: 0, ...account },
    payouts: [
      {
        id: 'p1',
        type: 'TRIP',
        status: 'HELD',
        holdReason: 'PAYOUT_SETUP',
        amountCents: 21360,
        grossCents: 26700,
        commissionCents: 5340,
        commissionGstCents: 697,
        deductions: [],
        scheduledFor: '2026-10-13T21:00:00.000Z',
        booking: { ref: 'RV-7K2Q9M', vehicleTitle: '2021 Toyota Corolla', start: '2026-10-12T21:00:00.000Z' },
      },
      {
        id: 'p2',
        type: 'TRIP',
        status: 'PAID',
        amountCents: 10000,
        deductions: [{ type: 'HOST_CANCELLATION_FEE', amountCents: 2500 }],
        scheduledFor: '2026-09-13T21:00:00.000Z',
        paidAt: '2026-09-13T21:05:00.000Z',
        expectedInBankBy: '2026-09-17T21:05:00.000Z',
        booking: { ref: 'RV-OLD234', vehicleTitle: '2021 Toyota Corolla', start: '2026-09-12T21:00:00.000Z' },
      },
      {
        id: 'p3',
        type: 'EXTRA_CHARGE',
        status: 'FAILED',
        amountCents: 2800,
        deductions: [],
        scheduledFor: '2026-10-14T21:00:00.000Z',
        booking: { ref: 'RV-FAIL22', vehicleTitle: '2021 Toyota Corolla', start: '2026-10-12T21:00:00.000Z' },
      },
    ],
  };
}

function mockEarnings(account: Partial<HostPayouts['account']> = {}, figures: Partial<Earnings> = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: hostUser } };
      case 'GET /host/earnings':
        return { status: 200, body: earnings(figures) };
      case 'GET /host/payouts':
        return { status: 200, body: payouts(account) };
      case 'POST /host/connect/onboarding-link':
        return { status: 200, body: { url: 'https://connect.stripe.com/setup/e/acct_1/abc' } };
      default:
        return undefined;
    }
  });
}

describe('EarningsPage', () => {
  it('shows the figures, the chart and the payouts with their holds and bank dates', async () => {
    mockEarnings();
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const figures = within(await screen.findByRole('region', { name: 'Your earnings' }));
    expect(figures.getByText('This month')).toBeInTheDocument();
    expect(await figures.findByText('+114% on last month')).toBeInTheDocument();
    // Last month's figure itself, and the platform fees all time and this month.
    expect(figures.getByText('Last month')).toBeInTheDocument();
    expect(figures.getByText('$100')).toBeInTheDocument();
    expect(figures.getByText('November 2026')).toBeInTheDocument();
    expect(figures.getByText('Platform fees')).toBeInTheDocument();
    expect(figures.getByText('$78.40')).toBeInTheDocument();
    expect(figures.getByText('All time · $53.40 this month')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Earnings by month' })).toBeInTheDocument();
    expect(screen.getByText('Waiting for your payout setup')).toBeInTheDocument();
    // The commission and its GST on each payout, as on the payout email.
    expect(screen.getByText('Earned $267 · commission −$53.40 (incl. $6.97 GST)')).toBeInTheDocument();
    expect(screen.getByText(/usually in your bank by/)).toBeInTheDocument();
    expect(screen.getByText(/\$25 deducted/)).toBeInTheDocument();
    // Nothing owed, so no fees line.
    expect(screen.queryByText('Fees owed')).not.toBeInTheDocument();
    // A transfer Stripe refused is delayed, not upcoming.
    const failed = screen.getByText('Extra charge ·', { exact: false }).closest('li')!;
    expect(within(failed).getByText('Didn’t go through: our team is on it')).toBeInTheDocument();
    expect(within(failed).getByText('Delayed')).toBeInTheDocument();
    expect(within(failed).queryByText('Upcoming')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    expect(screen.getByRole('row', { name: /December 2026 \$213\.60/ })).toBeInTheDocument();
  });

  it('shows each trip’s breakdown a month at a time, this month first', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T00:00:00.000Z'));
    mockEarnings(
      {},
      {
        bookings: [
          row({ ref: 'RV-OCT234' }),
          row({
            ref: 'RV-AUG234',
            start: '2026-08-14T21:00:00.000Z',
            end: '2026-08-16T21:00:00.000Z',
            hostFundedRefundsCents: 5000,
            netCents: 16360,
          }),
        ],
      },
    );
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const trips = within(await screen.findByRole('region', { name: 'Trips by month' }));
    expect(trips.getByRole('row', { name: /RV-OCT234 \$267 −\$53\.40 – \$213\.60/ })).toBeInTheDocument();
    // Phones only (sm:hidden): the columns run past the card's edge.
    expect(trips.getByText('Scroll sideways for the full breakdown')).toHaveClass('sm:hidden');
    expect(trips.queryByText(/RV-AUG234/)).not.toBeInTheDocument();

    await userEvent.click(trips.getByRole('button', { name: /October 2026/ }));
    const months = within(screen.getByRole('listbox', { name: 'Months with trips' }));
    expect(months.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'October 2026',
      'August 2026',
    ]);
    await userEvent.click(months.getByRole('option', { name: 'August 2026' }));

    expect(trips.getByRole('row', { name: /RV-AUG234 \$267 −\$53\.40 −\$50 \$163\.60/ })).toBeInTheDocument();
    expect(trips.queryByText(/RV-OCT234/)).not.toBeInTheDocument();
  });

  it('shows Host cancellation fees still owed, to come off the next payout', async () => {
    mockEarnings({ feesOwedCents: 2500 });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const fees = await screen.findByText('Fees owed');
    expect(fees.parentElement).toHaveTextContent('Host cancellation fees, taken off your next payout');
    expect(fees.parentElement?.nextElementSibling).toHaveTextContent('−$25');
  });

  it('sends a Host without payout setup to Stripe', async () => {
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    const sent = mockEarnings();
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    await userEvent.click(await screen.findByRole('button', { name: 'Set up payouts' }));
    await vi.waitFor(() =>
      expect(assign).toHaveBeenCalledWith('https://connect.stripe.com/setup/e/acct_1/abc'),
    );
    expect(sent.some((request) => request.path === '/host/connect/onboarding-link')).toBe(true);
  });

  it('says payouts are set up once Stripe has everything', async () => {
    mockEarnings({ connected: true, payoutsEnabled: true, bankDays: 3 });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');
    expect(await screen.findByText('Payouts are set up')).toBeInTheDocument();
    expect(screen.getByText(/about 3 business days later/)).toBeInTheDocument();
  });
});
