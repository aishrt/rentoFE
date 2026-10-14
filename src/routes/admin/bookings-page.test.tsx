import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBookings } from '@/api/types';
import { bookingRow } from '@/features/admin/bookings/test-fixtures';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminBookingsPage } from './bookings-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/bookings') =>
  renderWithRouter([{ path: '/admin/bookings', element: <AdminBookingsPage /> }], path);

const list = (bookings = [bookingRow()], total = bookings.length, page = 1) => ({
  status: 200,
  body: { bookings, total, page } satisfies AdminBookings,
});

const requestUrls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([input]) => new URL((input as Request).url));

const rana = bookingRow({
  id: 'bk2',
  ref: 'RV-3M8T1X',
  status: 'COMPLETED',
  vehicleTitle: '2019 Mazda CX-5',
  guest: { id: 'u4', name: 'Rana Patel' },
  host: { id: 'u5', name: 'Mere Parata' },
  start: '2026-09-10T21:00:00.000Z',
  end: '2026-09-12T21:00:00.000Z',
  totalCents: 31_050,
});

describe('AdminBookingsPage', () => {
  it('lists bookings with links to each booking, Guest and Host', async () => {
    mockApi({ 'GET /admin/bookings': list([bookingRow(), rana]) });
    render();

    const table = within(await screen.findByRole('table', { name: 'Bookings' }));
    expect(table.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(table.getByRole('link', { name: 'Kiri Tane' })).toHaveAttribute('href', '/admin/users/u2');
    expect(table.getByRole('link', { name: 'Liam Walker' })).toHaveAttribute('href', '/admin/users/u3');
    expect(table.getByText('2022 Toyota RAV4')).toBeInTheDocument();
    expect(table.getByText('1–9 Dec')).toBeInTheDocument();
    expect(table.getByText('Confirmed')).toBeInTheDocument();
    expect(table.getByText('$1,050.80')).toBeInTheDocument();
    expect(table.getByText('Completed')).toBeInTheDocument();
    expect(table.getByText('$310.50')).toBeInTheDocument();
    expect(screen.getByText('1–2 of 2 bookings')).toBeInTheDocument();
  });

  it('searches by reference, name or email when Search is pressed', async () => {
    const fetchMock = mockApi({
      'GET /admin/bookings': () => {
        const searched = requestUrls(fetchMock).at(-1)?.searchParams.get('q');
        return searched ? list([rana]) : list([bookingRow(), rana]);
      },
    });
    const { router } = render();

    await screen.findByRole('link', { name: 'RV-7K2Q9M' });
    await userEvent.type(screen.getByLabelText('Search'), 'rana@example.co.nz');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('1 booking')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'RV-7K2Q9M' })).not.toBeInTheDocument();
    expect(router.state.location.search).toBe('?q=rana%40example.co.nz');
    const last = requestUrls(fetchMock).at(-1)!;
    expect(last.searchParams.get('q')).toBe('rana@example.co.nz');
    expect(last.searchParams.get('page')).toBe('1');
  });

  it('filters by status, and keeps the dates from the address', async () => {
    const fetchMock = mockApi({ 'GET /admin/bookings': list() });
    const { router } = render('/admin/bookings?from=2026-12-01&to=2026-12-31');

    await screen.findByRole('link', { name: 'RV-7K2Q9M' });
    const first = requestUrls(fetchMock)[0]!;
    expect(first.searchParams.get('from')).toBe('2026-12-01');
    expect(first.searchParams.get('to')).toBe('2026-12-31');
    expect(first.searchParams.has('status')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: /^Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Cancelled' }));

    expect(router.state.location.search).toBe('?status=CANCELLED&from=2026-12-01&to=2026-12-31');
    await vi.waitFor(() =>
      expect(requestUrls(fetchMock).at(-1)?.searchParams.get('status')).toBe('CANCELLED'),
    );

    // Clearing one date keeps the rest; Clear filters drops them all.
    await userEvent.click(screen.getByRole('button', { name: 'Clear the to date' }));
    expect(router.state.location.search).toBe('?status=CANCELLED&from=2026-12-01');
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(router.state.location.search).toBe('');
  });

  it('pages through the results', async () => {
    const fetchMock = mockApi({
      'GET /admin/bookings': () => {
        const page = Number(requestUrls(fetchMock).at(-1)?.searchParams.get('page'));
        return page === 2 ? list([rana], 26, 2) : list([bookingRow()], 26, 1);
      },
    });
    const { router } = render();

    expect(await screen.findByText('1–25 of 26 bookings')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('26–26 of 26 bookings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RV-3M8T1X' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
  });

  it('says when nothing matches the search', async () => {
    mockApi({ 'GET /admin/bookings': list([]) });
    render('/admin/bookings?q=RV-000000');

    expect(await screen.findByRole('heading', { name: 'No bookings match' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toHaveValue('RV-000000');
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/bookings': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: 'You don’t have access to this.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the bookings');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
