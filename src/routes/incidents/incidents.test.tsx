import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/api/types';
import { booking, summary } from '@/features/booking/test-fixtures';
import { policiesFixture } from '@/features/content/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { IncidentPage } from './incident-page';
import { NewIncidentPage } from './new-incident-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const incident = (overrides: Partial<Incident> = {}): Incident => ({
  caseRef: 'IN-4F7K2Q',
  bookingRef: 'RV-7K2Q9M',
  vehicleTitle: '2022 Toyota RAV4',
  type: 'BREAKDOWN',
  status: 'AWAITING_RESPONSE',
  reportedBy: 'GUEST',
  role: 'GUEST',
  createdAt: '2026-10-06T01:00:00.000Z',
  updatedAt: '2026-10-06T02:00:00.000Z',
  description: 'Flat battery at the lookout.',
  events: [
    {
      id: '0',
      action: 'OPENED',
      by: 'YOU',
      byName: 'Kiri',
      note: 'Flat battery at the lookout.',
      attachments: [],
      visibility: 'BOTH',
      status: 'OPEN',
      createdAt: '2026-10-06T01:00:00.000Z',
    },
    {
      id: '2',
      action: 'STATUS',
      by: 'SUPPORT',
      byName: 'Rento Vroom support',
      note: 'Can you send a photo of the dashboard?',
      attachments: [],
      visibility: 'BOTH',
      status: 'AWAITING_RESPONSE',
      createdAt: '2026-10-06T02:00:00.000Z',
    },
  ],
  canReply: true,
  extraCharges: [],
  ...overrides,
});

/** The booking is on the Basic plan; `basicRoadside` gives that plan a roadside number of its own. */
function mockIncidents({ basicRoadside }: { basicRoadside?: string } = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /policies':
        return {
          status: 200,
          body: {
            ...policiesFixture,
            protectionPlans: policiesFixture.protectionPlans.map((plan) =>
              plan.code === 'BASIC' && basicRoadside ? { ...plan, roadsidePhone: basicRoadside } : plan,
            ),
            roadsideAssistance: { phone: '0800 500 444' },
          },
        };
      case 'GET /bookings/RV-7K2Q9M':
        return { status: 200, body: { booking: booking() } };
      case 'POST /incidents':
        return { status: 201, body: { incident: incident({ status: 'OPEN' }) } };
      case 'GET /incidents/IN-4F7K2Q':
        return { status: 200, body: { incident: incident() } };
      case 'POST /incidents/IN-4F7K2Q/events': {
        const { note } = request.body as { note: string };
        const current = incident();
        return {
          status: 201,
          body: {
            incident: {
              ...current,
              status: 'INVESTIGATING',
              events: [
                ...current.events,
                {
                  id: '3',
                  action: 'COMMENT',
                  by: 'YOU',
                  byName: 'Kiri',
                  note,
                  attachments: [],
                  visibility: 'BOTH',
                  createdAt: '2026-10-06T03:00:00.000Z',
                },
              ],
            },
          },
        };
      }
      default:
        return undefined;
    }
  });
}

describe('NewIncidentPage', () => {
  it('puts emergency help first for a breakdown, then opens a case', async () => {
    const sent = mockIncidents();
    const { router } = renderWithRouter(
      [
        { path: '/incidents/new', element: <NewIncidentPage /> },
        { path: '/incidents/:ref', element: <p>Case page</p> },
      ],
      '/incidents/new?booking=RV-7K2Q9M',
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Send report' }));
    expect(screen.getByText('Choose what happened')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: /Breakdown/ }));
    expect(screen.getByRole('link', { name: /Call 111/ })).toHaveAttribute('href', 'tel:111');
    expect(await screen.findByRole('link', { name: /Roadside assistance: 0800 500 444/ })).toHaveAttribute(
      'href',
      'tel:0800 500 444',
    );

    await userEvent.type(screen.getByLabelText('Tell us what happened'), 'Flat battery at the lookout.');
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/incidents/IN-4F7K2Q'));
    expect(sent.find((request) => request.path === '/incidents')?.body).toEqual({
      bookingRef: 'RV-7K2Q9M',
      type: 'BREAKDOWN',
      description: 'Flat battery at the lookout.',
      attachments: [],
    });
  });
});

describe('NewIncidentPage trip choice', () => {
  /** 15 finished trips as Guest, the oldest a car whose toll notice came weeks later. */
  const finished = Array.from({ length: 15 }, (_, index) =>
    summary({
      id: `bk${index}`,
      ref: `RV-OLD${String(index).padStart(3, '0')}`,
      status: 'COMPLETED',
      vehicle: {
        slug: `car-${index}`,
        title: index === 14 ? '2019 Mazda CX-5' : `2022 Toyota RAV4 no. ${index}`,
      },
      start: new Date(Date.UTC(2026, 8, 20 - index)).toISOString(),
      end: new Date(Date.UTC(2026, 8, 21 - index)).toISOString(),
    }),
  );

  it('lists every finished trip on request, and finds one by search', async () => {
    mockRoutes((request) => {
      if (request.method === 'POST' && request.path === '/auth/session') {
        return { status: 200, body: { user: guestUser } };
      }
      if (request.method === 'GET' && request.path === '/bookings') {
        const mine = request.query.get('role') === 'guest' && request.query.get('group') === 'completed';
        return { status: 200, body: { bookings: mine ? finished : [] } };
      }
      return undefined;
    });
    const { router } = renderWithRouter(
      [{ path: '/incidents/new', element: <NewIncidentPage /> }],
      '/incidents/new?type=TOLL',
    );

    const choices = await screen.findByRole('group', { name: 'Which trip is it about?' });
    expect(within(choices).getAllByRole('radio')).toHaveLength(12);
    expect(screen.queryByRole('radio', { name: /2019 Mazda CX-5/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show more trips (3 more)' }));
    expect(screen.getAllByRole('radio')).toHaveLength(15);
    expect(screen.queryByRole('button', { name: /Show more trips/ })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Find the trip'), 'mazda');
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    await userEvent.clear(screen.getByLabelText('Find the trip'));
    await userEvent.type(screen.getByLabelText('Find the trip'), 'nothing like it');
    expect(screen.getByText('No trips match “nothing like it”.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Find the trip'));
    await userEvent.type(screen.getByLabelText('Find the trip'), 'rv-old014');
    await userEvent.click(screen.getByRole('radio', { name: /2019 Mazda CX-5/ }));
    expect(router.state.location.search).toBe('?booking=RV-OLD014&type=TOLL');
  });
});

describe('NewIncidentPage roadside number', () => {
  it('gives the roadside number of the booking’s protection plan when it has one', async () => {
    mockIncidents({ basicRoadside: '0800 765 432' });
    renderWithRouter(
      [{ path: '/incidents/new', element: <NewIncidentPage /> }],
      '/incidents/new?booking=RV-7K2Q9M&type=ACCIDENT',
    );

    expect(await screen.findByRole('link', { name: /Roadside assistance: 0800 765 432/ })).toHaveAttribute(
      'href',
      'tel:0800 765 432',
    );
    expect(screen.queryByText(/0800 500 444/)).not.toBeInTheDocument();
  });
});

describe('IncidentPage', () => {
  it('shows the case number, status and history, and adds a reply', async () => {
    mockIncidents();
    renderWithRouter([{ path: '/incidents/:ref', element: <IncidentPage /> }], '/incidents/IN-4F7K2Q');

    expect(await screen.findByRole('heading', { level: 1, name: 'Breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Case IN-4F7K2Q')).toBeInTheDocument();
    expect(screen.getByText('Our team is waiting for you')).toBeInTheDocument();
    expect(screen.getByText('Can you send a photo of the dashboard?')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Add an update/), 'Here you go.');
    await userEvent.click(screen.getByRole('button', { name: 'Send update' }));
    const history = within(screen.getByRole('heading', { name: 'History' }).parentElement!);
    expect(await history.findByText('Here you go.')).toBeInTheDocument();
  });
});
