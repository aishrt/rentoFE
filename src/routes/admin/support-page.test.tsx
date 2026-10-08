import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffTicketRow, StaffTickets } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminSupportPage } from './support-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/support') =>
  renderWithRouter([{ path: '/admin/support', element: <AdminSupportPage /> }], path);

const kiri: StaffTicketRow = {
  ref: 'ST-ABC123',
  subject: 'Can I pick up an hour earlier?',
  category: 'BOOKING',
  status: 'OPEN',
  from: { name: 'Kiri Ngata', email: 'kiri@example.co.nz', userId: 'u2' },
  bookingRef: 'RV-7K2M9Q',
  messages: 1,
  updatedAt: '2026-09-27T21:30:00.000Z',
  createdAt: '2026-09-27T21:30:00.000Z',
};

const visitor: StaffTicketRow = {
  ref: 'ST-XYZ789',
  subject: 'Delete my data',
  category: 'PRIVACY',
  status: 'PENDING',
  from: { name: 'Sam Visitor', email: 'sam@example.com' },
  assignedTo: 'Aroha Admin',
  messages: 2,
  updatedAt: '2026-09-28T01:00:00.000Z',
  createdAt: '2026-09-26T01:00:00.000Z',
};

const inbox = (tickets: StaffTicketRow[], total = tickets.length, page = 1): StaffTickets => ({
  tickets,
  total,
  page,
});

/** The query of the latest inbox request. */
const lastQuery = (fetchMock: ReturnType<typeof mockApi>) =>
  new URL((fetchMock.mock.calls.at(-1)?.[0] as Request).url).searchParams;

describe('AdminSupportPage', () => {
  it('lists the tickets to answer, each linking to its conversation', async () => {
    const fetchMock = mockApi({
      'GET /admin/support/tickets': { status: 200, body: inbox([kiri, visitor]) },
    });
    render();

    const link = await screen.findByRole('link', { name: /ST-ABC123/ });
    expect(link).toHaveAttribute('href', '/admin/support/ST-ABC123');
    expect(link).toHaveTextContent('Can I pick up an hour earlier?');

    const first = within(screen.getByRole('row', { name: /ST-ABC123/ }));
    expect(first.getByText('Kiri Ngata')).toBeInTheDocument();
    expect(first.getByText('kiri@example.co.nz')).toBeInTheDocument();
    expect(first.getByText('Booking')).toBeInTheDocument();
    expect(first.getByRole('link', { name: 'RV-7K2M9Q' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q',
    );
    expect(first.getByText('Nobody yet')).toBeInTheDocument();
    expect(first.getByText('Open')).toBeInTheDocument();

    const second = within(screen.getByRole('row', { name: /ST-XYZ789/ }));
    expect(second.getByText('Privacy')).toBeInTheDocument();
    expect(second.getByText('Aroha Admin')).toBeInTheDocument();
    expect(second.getByText('Waiting on them')).toBeInTheDocument();
    expect(second.getByText('None')).toBeInTheDocument();

    expect(screen.getByText('1–2 of 2 tickets')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'To answer' })).toHaveAttribute('aria-selected', 'true');
    // No status: the API sends open and waiting tickets, the longest waiting first.
    const query = lastQuery(fetchMock);
    expect(query.get('status')).toBeNull();
    expect(query.get('mine')).toBeNull();
    expect(query.get('page')).toBe('1');
  });

  it('opens with the filters in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/support/tickets': { status: 200, body: inbox([visitor]) },
    });
    render('/admin/support?status=pending&category=privacy&q=data&mine=true');

    expect(await screen.findByRole('link', { name: /ST-XYZ789/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Waiting on them' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('searchbox', { name: 'Search tickets' })).toHaveValue('data');
    expect(screen.getByRole('button', { name: /Category/ })).toHaveTextContent('Privacy');
    expect(screen.getByRole('switch', { name: 'Assigned to me' })).toHaveAttribute('aria-checked', 'true');

    const query = lastQuery(fetchMock);
    expect(query.get('status')).toBe('PENDING');
    expect(query.get('category')).toBe('PRIVACY');
    expect(query.get('q')).toBe('data');
    expect(query.get('mine')).toBe('true');
  });

  it('keeps the tab, search, category and "Assigned to me" in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/support/tickets': { status: 200, body: inbox([kiri]) },
    });
    const { router } = render();
    const user = userEvent.setup();
    await screen.findByRole('link', { name: /ST-ABC123/ });

    await user.click(screen.getByRole('tab', { name: 'Resolved' }));
    expect(router.state.location.search).toBe('?status=resolved');
    await vi.waitFor(() => expect(lastQuery(fetchMock).get('status')).toBe('RESOLVED'));

    await user.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'ST-ABC123{Enter}');
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('ST-ABC123');
    await vi.waitFor(() => expect(lastQuery(fetchMock).get('q')).toBe('ST-ABC123'));

    await user.click(screen.getByRole('button', { name: /Category/ }));
    await user.click(screen.getByRole('option', { name: 'Payment' }));
    await user.click(screen.getByRole('switch', { name: 'Assigned to me' }));

    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('status')).toBe('resolved');
    expect(params.get('q')).toBe('ST-ABC123');
    expect(params.get('category')).toBe('payment');
    expect(params.get('mine')).toBe('true');
    await vi.waitFor(() => {
      const query = lastQuery(fetchMock);
      expect(query.get('category')).toBe('PAYMENT');
      expect(query.get('mine')).toBe('true');
      expect(query.get('status')).toBe('RESOLVED');
    });
  });

  it('searches after a pause in typing', async () => {
    const fetchMock = mockApi({
      'GET /admin/support/tickets': { status: 200, body: inbox([kiri]) },
    });
    const { router } = render();
    await screen.findByRole('link', { name: /ST-ABC123/ });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search tickets' }), 'refund');
    await vi.waitFor(() => expect(router.state.location.search).toBe('?q=refund'));
    await vi.waitFor(() => expect(lastQuery(fetchMock).get('q')).toBe('refund'));
  });

  it('moves between pages', async () => {
    const fetchMock = mockApi({
      'GET /admin/support/tickets': () => ({
        status: 200,
        body: inbox([kiri], 30, Number(lastQuery(fetchMock).get('page'))),
      }),
    });
    const { router } = render();

    expect(await screen.findByText('1–25 of 30 tickets')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(router.state.location.search).toBe('?page=2');
    expect(await screen.findByText('26–30 of 30 tickets')).toBeInTheDocument();
    expect(lastQuery(fetchMock).get('page')).toBe('2');
  });

  it('says when nothing is waiting, and when nothing matches', async () => {
    mockApi({ 'GET /admin/support/tickets': { status: 200, body: inbox([]) } });
    const { unmount } = render();
    expect(await screen.findByText('Nothing to answer')).toBeInTheDocument();
    unmount();

    render('/admin/support?q=nothing');
    expect(await screen.findByText('No tickets match')).toBeInTheDocument();
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/support/tickets': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the inbox');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
