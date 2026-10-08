import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Earnings, HostPayouts } from '@/api/types';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { EarningsPage } from './earnings-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const hostUser = { ...guestUser, roles: ['GUEST', 'HOST'], hostStatus: 'APPROVED' };

function earnings(): Earnings {
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
    ],
  };
}

function mockEarnings(account: Partial<HostPayouts['account']> = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: hostUser } };
      case 'GET /host/earnings':
        return { status: 200, body: earnings() };
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
    expect(screen.getByRole('heading', { name: 'Earnings by month' })).toBeInTheDocument();
    expect(screen.getByText('Waiting for your payout setup')).toBeInTheDocument();
    expect(screen.getByText(/usually in your bank by/)).toBeInTheDocument();
    expect(screen.getByText(/\$25 deducted/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    expect(screen.getByRole('row', { name: /December 2026 \$213\.60/ })).toBeInTheDocument();
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
