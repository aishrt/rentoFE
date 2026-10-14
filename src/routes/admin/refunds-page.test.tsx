import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminRefundRow } from '@/features/admin/finance/finance-api';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminRefundsPage } from './refunds-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/refunds') =>
  renderWithRouter([{ path: '/admin/refunds', element: <AdminRefundsPage /> }], path);

const supportUser = { ...adminUser, id: 'u3', firstName: 'Sam', roles: ['SUPPORT'] };

const hostFunded: AdminRefundRow = {
  id: 'r1',
  paymentId: 'pay1',
  paymentType: 'BOOKING',
  bookingRef: 'RV-7K2Q9M',
  guest: { id: 'u20', name: 'Kiri Tane' },
  amountCents: 5000,
  reason: 'The car wasn’t cleaned',
  kind: 'STAFF',
  fundedBy: 'HOST',
  status: 'SUCCEEDED',
  issuedBy: { id: 'u1', name: 'Aroha Admin' },
  hostRecovery: { deductedCents: 0, reversedCents: 3000, owedCents: 2000 },
  // 10 am on 7 October in New Zealand.
  createdAt: '2026-10-06T21:00:00.000Z',
};

const failedCancellation: AdminRefundRow = {
  id: 'r2',
  paymentId: 'pay2',
  paymentType: 'BOOKING',
  bookingRef: 'RV-3H8D2L',
  guest: { id: 'u21', name: 'Mere Paki' },
  amountCents: 33870,
  reason: 'Cancelled by the guest',
  kind: 'CANCELLATION',
  fundedBy: 'PLATFORM',
  status: 'FAILED',
  failureReason: 'The card was closed',
  createdAt: '2026-10-05T21:00:00.000Z',
};

/** The query string of each refunds request, in order. */
const queries = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([input]) => new URL((input as Request).url))
    .filter((url) => url.pathname.endsWith('/admin/refunds'))
    .map((url) => url.searchParams);

const row = async (name: RegExp) => within(await screen.findByRole('row', { name }));

describe('AdminRefundsPage', () => {
  it('lists every refund with why, who funds it, how the Host repaid it and who issued it', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/refunds': {
        status: 200,
        body: { refunds: [hostFunded, failedCancellation], total: 2, page: 1 },
      },
    });
    render();

    expect(await screen.findByRole('heading', { level: 1, name: 'Refunds' })).toBeInTheDocument();
    const first = await row(/RV-7K2Q9M/);
    expect(first.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(first.getByRole('link', { name: 'Kiri Tane' })).toHaveAttribute('href', '/admin/users/u20');
    expect(first.getByText('Wed, 7 Oct')).toBeInTheDocument();
    expect(first.getByText('$50')).toBeInTheDocument();
    expect(first.getByText('Issued by staff')).toBeInTheDocument();
    expect(first.getByText('The car wasn’t cleaned')).toBeInTheDocument();
    expect(first.getByText('Paid by the Host')).toBeInTheDocument();
    const recovered = within(first.getByRole('list', { name: 'How the Host repaid it' }));
    expect(recovered.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '$30 taken back from a paid transfer',
      '$20 still owed, off their next payout',
    ]);
    expect(first.getByText('Refunded')).toBeInTheDocument();
    expect(first.getByText('Aroha Admin')).toBeInTheDocument();

    const second = await row(/RV-3H8D2L/);
    expect(second.getByText('Cancellation')).toBeInTheDocument();
    expect(second.getByText('Paid by Rento Vroom')).toBeInTheDocument();
    expect(second.getByText('Failed')).toBeInTheDocument();
    expect(second.getByText('The card was closed')).toBeInTheDocument();
    expect(second.queryByRole('list', { name: 'How the Host repaid it' })).not.toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 refunds')).toBeInTheDocument();
  });

  it('searches by booking reference and filters by status, funder and why, in the address', async () => {
    const fetchMock = mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/refunds': { status: 200, body: { refunds: [hostFunded], total: 1, page: 1 } },
    });
    const { router } = render();
    const user = userEvent.setup();
    await row(/RV-7K2Q9M/);

    await user.type(screen.getByRole('searchbox', { name: 'Booking reference' }), '7K2Q{Enter}');
    await vi.waitFor(() => expect(queries(fetchMock).at(-1)?.get('q')).toBe('7K2Q'));

    await user.click(screen.getByRole('button', { name: /Funded by/ }));
    await user.click(screen.getByRole('option', { name: 'Paid by the Host' }));
    await user.click(screen.getByRole('button', { name: /Status/ }));
    await user.click(screen.getByRole('option', { name: 'Failed' }));
    await user.click(screen.getByRole('button', { name: /Why/ }));
    await user.click(screen.getByRole('option', { name: 'Issued by staff' }));

    await vi.waitFor(() => {
      const last = queries(fetchMock).at(-1)!;
      expect(Object.fromEntries(last)).toEqual({
        q: '7K2Q',
        fundedBy: 'HOST',
        status: 'FAILED',
        kind: 'STAFF',
        page: '1',
      });
    });
    expect(Object.fromEntries(new URLSearchParams(router.state.location.search))).toEqual({
      q: '7K2Q',
      fundedBy: 'HOST',
      status: 'FAILED',
      kind: 'STAFF',
    });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });

  it('says when nothing matches the search', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: adminUser } },
      'GET /admin/refunds': { status: 200, body: { refunds: [], total: 0, page: 1 } },
    });
    render('/admin/refunds?q=RV-ZZZZZZ');

    expect(await screen.findByText('No refunds match')).toBeInTheDocument();
  });

  it('asks support staff without the refunds permission to ask the admin, calmly', async () => {
    mockApi({
      'POST /auth/session': { status: 200, body: { user: supportUser } },
      'GET /admin/refunds': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    expect(
      await screen.findByText('Ask the admin for the refunds permission to see refunds.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });
});
