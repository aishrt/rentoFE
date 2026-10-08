import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/api/types';
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

function mockIncidents() {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /policies':
        return { status: 200, body: { roadsideAssistance: { phone: '0800 500 444' } } };
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
