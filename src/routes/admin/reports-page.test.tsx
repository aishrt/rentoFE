import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformReport } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminReportsPage } from './reports-page';

/** The file names of the downloads started. */
let downloads: string[] = [];

beforeEach(() => {
  // 1 pm on Wednesday 7 October in New Zealand.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-07T00:00:00.000Z'));
  // jsdom can't make object URLs or follow a download link.
  downloads = [];
  URL.createObjectURL = vi.fn(() => 'blob:report');
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const report = (overrides: Partial<PlatformReport['bookings']> = {}): PlatformReport => ({
  from: '2026-09-08',
  to: '2026-10-07',
  bookings: {
    created: 42,
    confirmed: 31,
    completed: 18,
    cancelled: 4,
    byStatus: { CONFIRMED: 13, COMPLETED: 18, CANCELLED: 4, DECLINED: 0 },
    ...overrides,
  },
  money: {
    grossBookingsCents: 1234550,
    refundsCents: 45000,
    platformFeesCents: 185000,
    hostPayoutsPaidCents: 902500,
    extraChargesCents: 12000,
    cancellationFeesKeptCents: 8000,
    gstCollectedCents: 161028,
    gstOnPlatformFeesCents: 24130,
  },
  fees: {
    serviceFeesCents: 92000,
    hostCommissionCents: 84000,
    cancellationFeesShareCents: 6600,
    extraChargeCommissionCents: 2400,
    totalCents: 185000,
  },
  gst: {
    ratePct: 15,
    inTripsCents: 161028,
    inExtraChargesCents: 1565,
    inCancellationFeesCents: 1043,
    givenBackCents: 2608,
    collectedCents: 161028,
    onPlatformFeesCents: 24130,
  },
});

const render = (path = '/admin/reports') =>
  renderWithRouter([{ path: '/admin/reports', element: <AdminReportsPage /> }], path);

/** The query string of each request to this path, in order. */
const queries = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith(path))
    .map((url) => url.searchParams);

const range = (params: URLSearchParams | undefined) => `${params?.get('from')} to ${params?.get('to')}`;

/** The stat card with this label. */
const figure = async (label: string) => {
  const card = (await screen.findByText(label)).closest('li');
  if (!card) throw new Error(`No figure called ${label}`);
  return within(card);
};

describe('AdminReportsPage', () => {
  it('shows the bookings, money and GST for the last 30 days', async () => {
    const fetchMock = mockApi({
      'GET /admin/reports/summary': { status: 200, body: { report: report() } },
    });
    render();

    expect((await figure('Bookings made')).getByText('42')).toBeInTheDocument();
    const gross = await figure('Gross bookings');
    expect(gross.getByText('$12,345.50')).toBeInTheDocument();
    expect(gross.getByText('Paid for trips starting on these days, GST included')).toBeInTheDocument();
    expect((await figure('Paid to Hosts')).getByText('$9,025')).toBeInTheDocument();
    expect((await figure('GST collected')).getByText('$1,610.28')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'GST' })).toBeInTheDocument();
    // GST in each kind of money, and the platform's fees by kind.
    const givenBack = await figure('GST given back');
    expect(givenBack.getByText('$26.08')).toBeInTheDocument();
    expect(givenBack.getByText('In refunds of that money sent on these days')).toBeInTheDocument();
    expect((await figure('GST in extra charges')).getByText('$15.65')).toBeInTheDocument();
    expect((await figure('GST in cancellation fees')).getByText('$10.43')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Platform fees' })).toBeInTheDocument();
    expect((await figure('Extra-charge commission')).getByText('$24')).toBeInTheDocument();
    expect((await figure('Share of cancellation fees')).getByText('$66')).toBeInTheDocument();
    expect((await figure('Host commission')).getByText('$840')).toBeInTheDocument();
    expect(
      screen.getByText(/Trip money counts by the trip’s start date, as Hosts’ earnings do/),
    ).toBeInTheDocument();
    expect(screen.getByText('Showing Tue, 8 Sep – Wed, 7 Oct.')).toBeInTheDocument();

    // Where the bookings made in the range are now, leaving out statuses with none.
    expect(screen.getByText('Where the bookings made on these days are now')).toBeInTheDocument();
    expect(screen.getByText('Confirmed', { selector: 'dt' })).toBeInTheDocument();
    expect(screen.queryByText('Declined', { selector: 'dt' })).not.toBeInTheDocument();

    expect(range(queries(fetchMock, '/admin/reports/summary')[0])).toBe('2026-09-08 to 2026-10-07');
  });

  it('asks for the report again when the dates change', async () => {
    let calls = 0;
    const fetchMock = mockApi({
      'GET /admin/reports/summary': () => {
        calls += 1;
        return { status: 200, body: { report: report({ created: calls === 1 ? 42 : 17 }) } };
      },
    });
    const { router } = render();

    await figure('Bookings made');
    await userEvent.click(screen.getByRole('button', { name: /^Dates/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'This month' }));

    expect(await (await figure('Bookings made')).findByText('17')).toBeInTheDocument();
    expect(range(queries(fetchMock, '/admin/reports/summary').at(-1))).toBe('2026-10-01 to 2026-10-07');
    expect(router.state.location.search).toBe('?range=this-month');
  });

  it('downloads each report as a CSV file for the dates chosen', async () => {
    const fetchMock = mockApi({
      'GET /admin/reports/summary': { status: 200, body: { report: report() } },
      'GET /admin/reports/export': { status: 200, body: 'Month,GST collected\r\n2026-09,1610.28\r\n' },
    });
    render('/admin/reports?range=last-month');

    await figure('Bookings made');
    await userEvent.click(screen.getByRole('button', { name: 'Download GST CSV' }));

    await vi.waitFor(() => expect(downloads).toEqual(['rento-vroom-gst-2026-09-01-to-2026-09-30.csv']));
    const sent = queries(fetchMock, '/admin/reports/export')[0];
    expect(sent?.get('type')).toBe('gst');
    expect(range(sent)).toBe('2026-09-01 to 2026-09-30');
    expect(URL.createObjectURL).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Download Payouts CSV' }));
    await vi.waitFor(() => expect(downloads).toHaveLength(2));
    expect(downloads[1]).toBe('rento-vroom-payouts-2026-09-01-to-2026-09-30.csv');

    await userEvent.click(screen.getByRole('button', { name: 'Download Revenue and fees CSV' }));
    await vi.waitFor(() => expect(downloads).toHaveLength(3));
    expect(downloads[2]).toBe('rento-vroom-revenue-2026-09-01-to-2026-09-30.csv');
    expect(queries(fetchMock, '/admin/reports/export').at(-1)?.get('type')).toBe('revenue');
  });

  it('says when a download fails', async () => {
    mockApi({
      'GET /admin/reports/summary': { status: 200, body: { report: report() } },
      'GET /admin/reports/export': {
        status: 400,
        body: { error: { code: 'VALIDATION_ERROR', message: 'Choose a range of up to 400 days.' } },
      },
    });
    render();

    await figure('Bookings made');
    await userEvent.click(screen.getByRole('button', { name: 'Download Payments CSV' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent("We couldn't download the Payments CSV");
    expect(alert).toHaveTextContent('Choose a range of up to 400 days.');
    expect(downloads).toEqual([]);
  });

  it('explains that reports are for the admin', async () => {
    mockApi({
      'GET /admin/reports/summary': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    expect(await screen.findByText('Reports are for the admin')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });
});
