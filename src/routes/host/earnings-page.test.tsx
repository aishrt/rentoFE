import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Earnings, EarningsRow, HostPayouts } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
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
    tripMonths: [],
    gstRegistered: false,
    ...overrides,
  };
}

function payouts(
  account: Partial<HostPayouts['account']> = {},
  extra: HostPayouts['payouts'] = [],
): HostPayouts {
  const list = payoutList(extra);
  return {
    paidCount: list.filter((payout) => payout.status === 'PAID').length,
    payouts: list,
    account: {
      connected: false,
      payoutsEnabled: false,
      requirements: [],
      feesOwedCents: 0,
      refundsOwedCents: 0,
      payoutsOwedCents: 0,
      ...account,
    },
  };
}

function payoutList(extra: HostPayouts['payouts']): HostPayouts['payouts'] {
  return [
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
      deductions: [
        { type: 'HOST_CANCELLATION_FEE', amountCents: 2500 },
        { type: 'HOST_FUNDED_REFUND', amountCents: 5000, bookingRef: 'RV-REF234' },
      ],
      reversedCents: 1500,
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
    ...extra,
  ];
}

function mockEarnings(
  account: Partial<HostPayouts['account']> = {},
  figures: Partial<Earnings> = {},
  extra: HostPayouts['payouts'] = [],
) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: hostUser } };
      case 'GET /host/earnings':
        return { status: 200, body: earnings(figures) };
      case 'GET /host/payouts':
        return { status: 200, body: payouts(account, extra) };
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
    // Each deduction on its own line, as on the payout email, and what was taken back for refunds.
    const deductions = within(screen.getByRole('list', { name: 'Deductions' }));
    expect(deductions.getAllByRole('listitem').map((line) => line.textContent)).toEqual([
      'Host cancellation fee −$25',
      'Refund for RV-REF234 −$50',
    ]);
    expect(screen.getByText('$15 taken back from this payout for refunds you fund')).toBeInTheDocument();
    // Nothing owed, so no fees or refunds lines.
    expect(screen.queryByText('Fees owed')).not.toBeInTheDocument();
    expect(screen.queryByText('Refunds owed')).not.toBeInTheDocument();
    // A transfer Stripe refused is delayed, not upcoming.
    const failed = screen.getByText('Extra charge ·', { exact: false }).closest('li')!;
    expect(within(failed).getByText('Didn’t go through: our team is on it')).toBeInTheDocument();
    expect(within(failed).getByText('Delayed')).toBeInTheDocument();
    expect(within(failed).queryByText('Upcoming')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show as table' }));
    expect(screen.getByRole('row', { name: /December 2026 \$213\.60/ })).toBeInTheDocument();
  });

  it('gives an upcoming payout both dates: when it’s sent, and when it usually reaches the bank', async () => {
    mockEarnings({}, {}, [
      {
        id: 'p4',
        type: 'TRIP',
        status: 'SCHEDULED',
        amountCents: 12000,
        deductions: [],
        scheduledFor: '2026-10-20T21:00:00.000Z',
        expectedInBankBy: '2026-10-23T21:00:00.000Z',
        booking: { ref: 'RV-NEXT01', vehicleTitle: '2021 Toyota Corolla', start: '2026-10-19T21:00:00.000Z' },
      },
    ]);
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const upcoming = await screen.findByText(/^Due .*, usually in your bank by /);
    expect(upcoming.textContent).toMatch(/21.*Oct.*24.*Oct|21\/10.*24\/10/);
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
    // Every month the chart shows, and any other with trips, newest first.
    const months = within(screen.getByRole('listbox', { name: 'Months' }));
    const options = months.getAllByRole('option').map((option) => option.textContent);
    expect(options.slice(0, 3)).toEqual(['December 2026', 'November 2026', 'October 2026']);
    expect(options).toContain('January 2026');
    await userEvent.click(months.getByRole('option', { name: 'August 2026' }));

    expect(trips.getByRole('row', { name: /RV-AUG234 \$267 −\$53\.40 −\$50 \$163\.60/ })).toBeInTheDocument();
    expect(trips.queryByText(/RV-OCT234/)).not.toBeInTheDocument();
    await userEvent.click(trips.getByRole('button', { name: /August 2026/ }));
    await userEvent.click(
      within(screen.getByRole('listbox', { name: 'Months' })).getByRole('option', { name: 'March 2026' }),
    );
    expect(trips.getByText('No trips that month.')).toBeInTheDocument();
  });

  it('asks for a month the latest 100 trips don’t all reach', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T00:00:00.000Z'));
    const latest = Array.from({ length: 100 }, (_, index) =>
      row({ ref: `RV-N${String(index).padStart(5, '0')}` }),
    );
    const sent = mockRoutes((request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /auth/session':
          return { status: 200, body: { user: hostUser } };
        case 'GET /host/earnings':
          return request.query.get('month') === '2025-11'
            ? {
                status: 200,
                body: earnings({
                  bookings: [row({ ref: 'RV-OLD777', start: '2025-11-03T21:00:00.000Z' })],
                }),
              }
            : { status: 200, body: earnings({ bookings: latest, tripMonths: ['2026-10', '2025-11'] }) };
        case 'GET /host/payouts':
          return { status: 200, body: payouts() };
        default:
          return undefined;
      }
    });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const trips = within(await screen.findByRole('region', { name: 'Trips by month' }));
    await userEvent.click(await trips.findByRole('button', { name: /October 2026/ }));
    await userEvent.click(
      within(screen.getByRole('listbox', { name: 'Months' })).getByRole('option', { name: 'November 2025' }),
    );
    expect(await trips.findByText(/RV-OLD777/)).toBeInTheDocument();
    expect(sent.some((request) => request.query.get('month') === '2025-11')).toBe(true);
  });

  it('labels a kept fee’s payout, a payout already sent and owed back, and what the upcoming payouts come to', async () => {
    mockEarnings({ feesOwedCents: 2500, refundsOwedCents: 1000, payoutsOwedCents: 10680 }, {}, [
      {
        id: 'p5',
        type: 'CANCELLATION_FEE',
        status: 'PAID',
        amountCents: 0,
        deductions: [
          { type: 'HOST_FUNDED_REFUND', amountCents: 10680, bookingRef: 'RV-NOSHOW', payoutSent: true },
        ],
        scheduledFor: '2026-09-20T21:00:00.000Z',
        paidAt: '2026-09-20T21:05:00.000Z',
        booking: { ref: 'RV-KEPT22', vehicleTitle: '2019 Mazda 3', start: '2026-09-19T21:00:00.000Z' },
      },
    ]);
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const kept = (await screen.findByText('2019 Mazda 3')).closest('li')!;
    expect(within(kept).getByText(/Your share of a cancellation fee/)).toBeInTheDocument();
    expect(within(kept).getByText('Payout already sent for RV-NOSHOW')).toBeInTheDocument();
    // A payout already sent is owed apart from refunds.
    const sentBack = screen.getByText('Payouts owed back');
    expect(sentBack.parentElement).toHaveTextContent('Trip payouts sent before the booking was cancelled');
    expect(sentBack.parentElement?.nextElementSibling).toHaveTextContent('−$106.80');
    expect(screen.getByText('Refunds owed').parentElement?.nextElementSibling).toHaveTextContent('−$10');
    expect(screen.getByText('What they’ll pay you, after what you owe below comes off')).toBeInTheDocument();
  });

  it('names who charges the commission for a GST-registered Host', async () => {
    mockEarnings(
      {},
      { gstRegistered: true, supplier: { name: 'Rento Vroom Limited', gstNumber: '123-456-789' } },
    );
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    expect(
      await screen.findByText(
        'For your GST records, the commission is charged by Rento Vroom Limited, GST number 123-456-789.',
      ),
    ).toBeInTheDocument();
  });

  it('shows Host cancellation fees still owed, to come off the next payout', async () => {
    mockEarnings({ feesOwedCents: 2500 });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const fees = await screen.findByText('Fees owed');
    expect(fees.parentElement).toHaveTextContent('Host cancellation fees, taken off your next payout');
    expect(fees.parentElement?.nextElementSibling).toHaveTextContent('−$25');
  });

  it('shows Host-funded refunds still owed apart from cancellation fees', async () => {
    mockEarnings({ feesOwedCents: 2500, refundsOwedCents: 5000 });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const refunds = await screen.findByText('Refunds owed');
    expect(refunds.parentElement).toHaveTextContent('taken off your next payout');
    expect(refunds.parentElement?.nextElementSibling).toHaveTextContent('−$50');
    expect(screen.getByText('Fees owed').parentElement?.nextElementSibling).toHaveTextContent('−$25');
  });

  it('shows the latest paid payouts, and more a page at a time on request', async () => {
    const older = Array.from({ length: 13 }, (_, index) => ({
      id: `old${index}`,
      type: 'TRIP' as const,
      status: 'PAID' as const,
      amountCents: 10000,
      deductions: [],
      scheduledFor: '2026-08-01T21:00:00.000Z',
      paidAt: '2026-08-01T21:05:00.000Z',
      booking: {
        ref: `RV-OLD${String(index).padStart(3, '0')}`,
        vehicleTitle: '2019 Mazda 3',
        start: '2026-07-31T21:00:00.000Z',
      },
    }));
    // The first page: those still to be sent, and 12 paid (the fixtures' one, then 11 of these).
    const sent = mockRoutes((request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /auth/session':
          return { status: 200, body: { user: hostUser } };
        case 'GET /host/earnings':
          return { status: 200, body: earnings() };
        case 'GET /host/payouts':
          return request.query.get('cursor') === 'old10'
            ? { status: 200, body: { ...payouts(), payouts: older.slice(11), paidCount: 14 } }
            : {
                status: 200,
                body: { ...payouts({}, older.slice(0, 11)), paidCount: 14, nextCursor: 'old10' },
              };
        default:
          return undefined;
      }
    });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    const more = await screen.findByRole('button', { name: 'Show more (2 left)' });
    expect(screen.getAllByText('2019 Mazda 3')).toHaveLength(11);
    await userEvent.click(more);
    await vi.waitFor(() => expect(screen.getAllByText('2019 Mazda 3')).toHaveLength(13));
    expect(sent.some((request) => request.query.get('cursor') === 'old10')).toBe(true);
    expect(screen.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
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

  it('opens Stripe’s dashboard in a tab opened on the click, and says why when it can’t', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
    const open = vi.fn(() => tab);
    vi.stubGlobal('open', open);
    let fail = false;
    mockRoutes((request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /auth/session':
          return { status: 200, body: { user: hostUser } };
        case 'GET /host/earnings':
          return { status: 200, body: earnings() };
        case 'GET /host/payouts':
          return { status: 200, body: payouts({ connected: true, payoutsEnabled: true }) };
        case 'POST /host/connect/dashboard-link':
          return fail
            ? {
                status: 409,
                body: { error: { code: 'NO_PAYOUT_ACCOUNT', message: 'Set up payouts first.' } },
              }
            : { status: 200, body: { url: 'https://connect.stripe.com/express/acct_1/login' } };
        default:
          return undefined;
      }
    });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');

    await userEvent.click(await screen.findByRole('button', { name: 'Bank details in Stripe' }));
    expect(open).toHaveBeenCalledWith('', '_blank');
    await vi.waitFor(() => expect(tab.location.href).toBe('https://connect.stripe.com/express/acct_1/login'));
    expect(tab.opener).toBeNull();

    fail = true;
    await userEvent.click(screen.getByRole('button', { name: 'Bank details in Stripe' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Set up payouts first.');
    expect(tab.close).toHaveBeenCalled();
  });

  it('says when the payout setup couldn’t be checked on the way back from Stripe, and tidies the address', async () => {
    mockRoutes((request) => {
      switch (`${request.method} ${request.path}`) {
        case 'POST /auth/session':
          return { status: 200, body: { user: hostUser } };
        case 'GET /host/earnings':
          return { status: 200, body: earnings() };
        case 'GET /host/payouts':
          return { status: 200, body: payouts({ connected: true }) };
        case 'POST /host/connect/sync':
          return { status: 500, body: { error: { code: 'INTERNAL', message: 'Stripe didn’t answer.' } } };
        default:
          return undefined;
      }
    });
    const { router } = renderWithRouter(
      [
        {
          path: '/host/earnings',
          element: (
            <>
              <EarningsPage />
              <Toaster />
            </>
          ),
        },
      ],
      '/host/earnings?payouts=done',
    );

    expect(await screen.findByText('We couldn’t check your payout setup with Stripe')).toBeInTheDocument();
    await vi.waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('says payouts are set up once Stripe has everything', async () => {
    mockEarnings({ connected: true, payoutsEnabled: true, bankDays: 3 });
    renderWithRouter([{ path: '/host/earnings', element: <EarningsPage /> }], '/host/earnings');
    expect(await screen.findByText('Payouts are set up')).toBeInTheDocument();
    expect(screen.getByText(/about 3 business days later/)).toBeInTheDocument();
  });
});
