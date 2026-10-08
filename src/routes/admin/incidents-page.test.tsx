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

describe('AdminIncidentsPage', () => {
  it('lists every open case by default, each linking to it', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents': { status: 200, body: { incidents: [damage, lateReturn] } },
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
        body: {
          incidents:
            lastUrl(fetchMock).searchParams.get('status') === 'RESOLVED'
              ? [{ ...damage, status: 'RESOLVED' }]
              : [],
        },
      }),
    });
    const { router } = render();

    expect(await screen.findByText('No open cases')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Resolved' }));

    expect(await screen.findByRole('link', { name: 'IN-ABC123' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?status=resolved');
    expect(lastUrl(fetchMock).searchParams.get('status')).toBe('RESOLVED');
  });

  it('opens the tab named in the address', async () => {
    const fetchMock = mockApi({ 'GET /admin/incidents': { status: 200, body: { incidents: [] } } });
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
