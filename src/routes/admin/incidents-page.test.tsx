import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IncidentSummary } from '@/api/types';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminIncidentsPage } from './incidents-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/incidents') =>
  renderWithRouter([{ path: '/admin/incidents', element: <AdminIncidentsPage /> }], path);

const damage: IncidentSummary = {
  caseRef: 'IN-ABC123',
  bookingRef: 'RV-7K2Q9M',
  vehicleTitle: '2022 Toyota RAV4',
  type: 'DAMAGE',
  status: 'INVESTIGATING',
  reportedBy: 'HOST',
  role: 'STAFF',
  assignedTo: 'Mere',
  createdAt: '2026-10-05T20:00:00.000Z',
  // 9 am on 7 October in New Zealand.
  updatedAt: '2026-10-06T20:00:00.000Z',
};

const lateReturn: IncidentSummary = {
  ...damage,
  caseRef: 'IN-DEF456',
  bookingRef: 'RV-2M8P4T',
  vehicleTitle: '2019 Mazda CX-5',
  type: 'LATE_RETURN',
  status: 'OPEN',
  reportedBy: 'GUEST',
  assignedTo: undefined,
};

const lastUrl = (fetchMock: ReturnType<typeof mockApi>) =>
  new URL(String((fetchMock.mock.calls.at(-1)?.[0] as Request).url));

describe('AdminIncidentsPage: opening a case', () => {
  it('opens a case on a booking by its reference, saying when there’s no such booking', async () => {
    const sent: unknown[] = [];
    mockApi({
      'GET /admin/incidents': { status: 200, body: { incidents: [], total: 0, page: 1 } },
      'POST /admin/incidents': (init) => {
        const body = JSON.parse(String(init?.body)) as { bookingRef: string };
        sent.push(body);
        return body.bookingRef === 'RV-ZZZZZZ'
          ? {
              status: 404,
              body: {
                error: {
                  code: 'NOT_FOUND',
                  message: 'We couldn’t find that booking.',
                  fields: { bookingRef: 'No booking has this reference' },
                },
              },
            }
          : { status: 201, body: { incident: { caseRef: 'IN-NEW123', bookingRef: body.bookingRef } } };
      },
    });
    const { router } = renderWithRouter(
      [
        { path: '/admin/incidents', element: <AdminIncidentsPage /> },
        { path: '/admin/incidents/:ref', element: <p>Case page</p> },
      ],
      '/admin/incidents',
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Open a case' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Open a case' }));
    await userEvent.type(dialog.getByLabelText('Booking reference'), 'RV-12');
    await userEvent.click(dialog.getByRole('button', { name: /^What happened/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Fine' }));
    await userEvent.type(dialog.getByLabelText('Description'), 'Speed camera notice from NZ Police.');
    await userEvent.click(dialog.getByRole('button', { name: 'Open the case' }));
    expect(await dialog.findByText('Enter a booking reference like RV-7K2Q9M')).toBeInTheDocument();
    expect(sent).toEqual([]);

    await userEvent.clear(dialog.getByLabelText('Booking reference'));
    await userEvent.type(dialog.getByLabelText('Booking reference'), 'rv-zzzzzz');
    await userEvent.click(dialog.getByRole('button', { name: 'Open the case' }));
    expect(await dialog.findByText('No booking has this reference')).toBeInTheDocument();

    await userEvent.clear(dialog.getByLabelText('Booking reference'));
    await userEvent.type(dialog.getByLabelText('Booking reference'), 'RV-2M8P4T');
    await userEvent.click(dialog.getByRole('button', { name: 'Open the case' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/admin/incidents/IN-NEW123'));
    expect(sent.at(-1)).toMatchObject({ bookingRef: 'RV-2M8P4T', type: 'FINE', visibility: 'BOTH' });
  });
});

describe('AdminIncidentsPage', () => {
  it('lists every open case by default, each linking to it', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': { status: 200, body: { incidents: [damage, lateReturn], total: 2, page: 1 } },
    });
    render();

    const table = within(await screen.findByRole('table', { name: 'Cases' }));
    expect(lastUrl(fetchMock).searchParams.has('status')).toBe(false);
    expect(screen.getByRole('tab', { name: 'All open' })).toHaveAttribute('aria-selected', 'true');

    const [, first, second] = table.getAllByRole('row');
    const row = within(first!);
    expect(row.getByRole('link', { name: 'IN-ABC123' })).toHaveAttribute(
      'href',
      '/admin/incidents/IN-ABC123',
    );
    expect(row.getByText('Damage')).toBeInTheDocument();
    expect(row.getByText('Investigating')).toBeInTheDocument();
    expect(row.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute('href', '/admin/bookings/RV-7K2Q9M');
    expect(row.getByText('Host')).toBeInTheDocument();
    expect(row.getByText('Mere')).toBeInTheDocument();
    expect(row.getByText('Wed, 7 Oct, 9:00 am')).toBeInTheDocument();

    const next = within(second!);
    expect(next.getByText('Late return')).toBeInTheDocument();
    expect(next.getByText('Guest')).toBeInTheDocument();
    expect(next.getByText('Nobody yet')).toBeInTheDocument();
    expect(screen.getByText('2 cases')).toBeInTheDocument();
  });

  it('switches to resolved cases and keeps the tab in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': () => ({
        status: 200,
        body:
          lastUrl(fetchMock).searchParams.get('status') === 'RESOLVED'
            ? { incidents: [{ ...damage, status: 'RESOLVED' }], total: 1, page: 1 }
            : { incidents: [], total: 0, page: 1 },
      }),
    });
    const { router } = render();

    expect(await screen.findByText('No open cases')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Resolved' }));

    expect(await screen.findByRole('link', { name: 'IN-ABC123' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=resolved');
    expect(lastUrl(fetchMock).searchParams.get('status')).toBe('RESOLVED');
  });

  it('goes through the cases a page at a time, keeping the page in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': () => {
        const page = Number(lastUrl(fetchMock).searchParams.get('page') ?? 1);
        return {
          status: 200,
          body: { incidents: [page === 2 ? lateReturn : damage], total: 51, page },
        };
      },
    });
    const { router } = render();

    expect(await screen.findByRole('link', { name: 'IN-ABC123' })).toBeInTheDocument();
    expect(screen.getByText('51 cases')).toBeInTheDocument();
    expect(screen.getByText('1–50 of 51 cases')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Late return')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?page=2');
    expect(lastUrl(fetchMock).searchParams.get('page')).toBe('2');
  });

  it('goes back to the last page when the one in the address is past the end', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': () => {
        const page = Number(lastUrl(fetchMock).searchParams.get('page') ?? 1);
        const resolved = { ...lateReturn, status: 'RESOLVED' as const };
        return { status: 200, body: { incidents: page === 2 ? [resolved] : [], total: 51, page } };
      },
    });
    const { router } = render('/admin/incidents?status=resolved&page=4');

    expect(await screen.findByRole('link', { name: 'IN-DEF456' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=resolved&page=2');
    expect(screen.getByText('51–51 of 51 cases')).toBeInTheDocument();
    expect(screen.queryByText('No resolved cases')).not.toBeInTheDocument();
  });

  it('shows another tab loading rather than the last tab’s cases', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': () => ({
        status: 200,
        body:
          lastUrl(fetchMock).searchParams.get('status') === 'RESOLVED'
            ? { incidents: [{ ...lateReturn, status: 'RESOLVED' }], total: 1, page: 1 }
            : { incidents: [damage], total: 1, page: 1 },
      }),
    });
    // The resolved cases arrive only when the test says so.
    let release = () => {};
    const held = new Promise<void>((resolve) => (release = resolve));
    vi.stubGlobal('fetch', async (input: Request) => {
      if (new URL(input.url).searchParams.get('status') === 'RESOLVED') await held;
      return fetchMock(input);
    });
    render();

    expect(await screen.findByRole('link', { name: 'IN-ABC123' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Resolved' }));

    expect(await screen.findByText('Loading cases')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'IN-ABC123' })).not.toBeInTheDocument();
    release();
    expect(await screen.findByRole('link', { name: 'IN-DEF456' })).toBeInTheDocument();
  });

  it('opens the tab named in the address', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': { status: 200, body: { incidents: [], total: 0, page: 1 } },
    });
    render('/admin/incidents?status=awaiting_response');

    expect(await screen.findByText('Nobody to wait on')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Waiting on them' })).toHaveAttribute('aria-selected', 'true');
    expect(lastUrl(fetchMock).searchParams.get('status')).toBe('AWAITING_RESPONSE');
  });

  it('shows an error with a way to try again', async () => {
    mockApi({
      'GET /admin/incidents': {
        status: 500,
        body: { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } },
      },
    });
    render();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load the cases');
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
