import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Incident } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminIncidentPage } from './incident-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/incidents/IN-ABC123') =>
  renderWithRouter(
    [
      {
        path: '/admin/incidents/:ref',
        element: (
          <>
            <AdminIncidentPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const incident = (overrides: Partial<Incident> = {}): Incident => ({
  caseRef: 'IN-ABC123',
  bookingRef: 'RV-7K2Q9M',
  vehicleTitle: '2022 Toyota RAV4',
  type: 'DAMAGE',
  status: 'INVESTIGATING',
  reportedBy: 'HOST',
  role: 'STAFF',
  assignedTo: 'Mere',
  createdAt: '2026-10-05T20:00:00.000Z',
  updatedAt: '2026-10-06T20:00:00.000Z',
  description: 'A deep scratch along the passenger door.',
  events: [
    {
      id: '0',
      action: 'OPENED',
      by: 'HOST',
      byName: 'Aroha',
      note: 'A deep scratch along the passenger door.',
      attachments: [
        { url: 'https://files.example/door.jpg', name: 'door.jpg', contentType: 'image/jpeg' },
        { url: 'https://files.example/quote.pdf', name: 'quote.pdf', contentType: 'application/pdf' },
      ],
      visibility: 'BOTH',
      status: 'OPEN',
      createdAt: '2026-10-05T20:00:00.000Z',
    },
    {
      id: '1',
      action: 'COMMENT',
      by: 'GUEST',
      byName: 'Kiri',
      note: 'It was there when I picked it up.',
      attachments: [],
      visibility: 'BOTH',
      createdAt: '2026-10-06T01:00:00.000Z',
    },
    {
      id: '2',
      action: 'STATUS',
      by: 'SUPPORT',
      byName: 'Mere',
      note: 'Checking the pick-up photos.',
      attachments: [],
      visibility: 'INTERNAL',
      status: 'INVESTIGATING',
      createdAt: '2026-10-06T20:00:00.000Z',
    },
  ],
  canReply: true,
  extraCharges: [],
  ...overrides,
});

const resolved = (overrides: Partial<Incident> = {}) => incident({ status: 'RESOLVED', ...overrides });

describe('AdminIncidentPage', () => {
  it('shows the report, its evidence and every event with who could see it', async () => {
    mockApi({ 'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: incident() } } });
    render();

    expect(screen.getByRole('heading', { level: 1, name: 'Case IN-ABC123' })).toBeInTheDocument();
    expect(await screen.findByText('Damage · 2022 Toyota RAV4')).toBeInTheDocument();
    expect(screen.getByText('A deep scratch along the passenger door.')).toBeInTheDocument();
    const evidence = within(screen.getByRole('list', { name: 'Evidence' }));
    expect(evidence.getByRole('img', { name: 'door.jpg' })).toHaveAttribute(
      'src',
      'https://files.example/door.jpg',
    );
    expect(evidence.getByRole('link', { name: 'quote.pdf' })).toHaveAttribute(
      'href',
      'https://files.example/quote.pdf',
    );

    const facts = within(screen.getByRole('region', { name: 'The case' }));
    expect(facts.getByText('Investigating')).toBeInTheDocument();
    expect(facts.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M',
    );
    expect(facts.getByText('Aroha (Host)')).toBeInTheDocument();
    expect(facts.getByText('Mere')).toBeInTheDocument();
    expect(facts.getByRole('link', { name: 'Messages' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2Q9M/thread?context=INCIDENT:IN-ABC123',
    );

    // The events themselves, not the files listed inside them.
    const events = Array.from(screen.getByRole('list', { name: 'History' }).children);
    expect(events).toHaveLength(3);
    expect(events[0]).toHaveTextContent('Aroha (Host) reported it');
    expect(events[0]).toHaveTextContent('Both parties');
    expect(events[1]).toHaveTextContent('Kiri (Guest) added an update');
    expect(events[1]).toHaveTextContent('It was there when I picked it up.');
    expect(events[2]).toHaveTextContent('Mere (Support) changed the status: Investigating');
    expect(events[2]).toHaveTextContent('Internal note');
    expect(events[2]).toHaveTextContent('Checking the pick-up photos.');

    // Charges wait until the case is resolved.
    expect(screen.getByText(/Once the case is resolved, you can charge the Guest/)).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Charge the Guest' })).not.toBeInTheDocument();
  });

  it('posts an internal note, a new status and takes the case', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: incident() } },
      'POST /admin/incidents/IN-ABC123/events': (init) => {
        sent = JSON.parse(String(init?.body));
        const current = incident();
        return {
          status: 200,
          body: {
            incident: {
              ...current,
              status: 'AWAITING_RESPONSE',
              assignedTo: 'Aroha',
              events: [
                ...current.events,
                {
                  id: '3',
                  action: 'STATUS',
                  by: 'YOU',
                  byName: 'Aroha',
                  note: 'Asked the Host for the pick-up photos.',
                  attachments: [],
                  visibility: 'INTERNAL',
                  status: 'AWAITING_RESPONSE',
                  createdAt: '2026-10-07T01:00:00.000Z',
                },
              ],
            },
          },
        };
      },
    });
    render();

    const form = within(await screen.findByRole('form', { name: 'Update the case' }));
    await userEvent.type(form.getByLabelText('Update'), 'Asked the Host for the pick-up photos.');
    await userEvent.click(form.getByRole('radio', { name: /Internal note/ }));
    await userEvent.click(form.getByRole('button', { name: /^Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Waiting on them' }));
    await userEvent.click(form.getByRole('checkbox', { name: /Assign to me/ }));
    await userEvent.click(form.getByRole('button', { name: 'Save update' }));

    expect(await screen.findByText('Case updated')).toBeInTheDocument();
    expect(sent).toEqual({
      note: 'Asked the Host for the pick-up photos.',
      attachments: [],
      visibility: 'INTERNAL',
      status: 'AWAITING_RESPONSE',
      assignToMe: true,
    });
    expect(
      screen.getByText(/It’s now waiting on them. It’s assigned to you. Only staff can see your note./),
    ).toBeInTheDocument();
    const history = within(screen.getByRole('list', { name: 'History' }));
    expect(history.getByText(/^You$/)).toBeInTheDocument();
    // The form is ready for the next update.
    expect(form.getByLabelText('Update')).toHaveValue('');
    expect(form.getByRole('radio', { name: /Both parties/ })).toBeChecked();
  });

  it('needs something to post', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: incident() } },
    });
    render();

    const form = within(await screen.findByRole('form', { name: 'Update the case' }));
    await userEvent.click(form.getByRole('button', { name: 'Save update' }));

    expect(await form.findByText('Write an update, change the status or take the case')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => (input as Request).method === 'POST')).toBe(false);
  });

  it('charges the Guest from a resolved case, in cents', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: resolved() } },
      'POST /admin/incidents/IN-ABC123/charges': (init) => {
        sent = JSON.parse(String(init?.body));
        return {
          status: 200,
          body: {
            incident: resolved({
              extraCharges: [
                {
                  type: 'DAMAGE',
                  description: 'Repair the passenger door',
                  amountCents: 4550,
                  status: 'PENDING',
                },
              ],
            }),
          },
        };
      },
    });
    render();

    const form = within(await screen.findByRole('form', { name: 'Charge the Guest' }));
    expect(
      screen.getByText(/Charged to the Guest’s saved card, and the Host’s share is paid on/),
    ).toBeInTheDocument();
    // A damage case starts on Damage.
    expect(form.getByRole('button', { name: /^For/ })).toHaveTextContent('Damage');
    await userEvent.type(form.getByLabelText('Description'), 'Repair the passenger door');
    await userEvent.type(form.getByLabelText('Amount (NZD)'), '45.50');
    await userEvent.click(form.getByRole('button', { name: 'Charge $45.50' }));

    expect(await screen.findByText('$45.50 charge added')).toBeInTheDocument();
    expect(sent).toEqual({ type: 'DAMAGE', description: 'Repair the passenger door', amountCents: 4550 });
    const charges = within(screen.getByRole('list', { name: 'Charges from this case' }));
    expect(charges.getByText('Repair the passenger door')).toBeInTheDocument();
    expect(charges.getByText('Charging')).toBeInTheDocument();
  });

  it('checks the amount before charging', async () => {
    const fetchMock = mockApi({
      'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: resolved() } },
    });
    render();

    const form = within(await screen.findByRole('form', { name: 'Charge the Guest' }));
    await userEvent.type(form.getByLabelText('Description'), 'Repair the passenger door');
    await userEvent.type(form.getByLabelText('Amount (NZD)'), '45.555');
    await userEvent.click(form.getByRole('button', { name: 'Charge the Guest' }));

    expect(await form.findByText('Enter an amount in dollars, such as 45 or 45.50')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => (input as Request).method === 'POST')).toBe(false);
  });

  it('explains that charging needs the refunds permission', async () => {
    mockApi({
      'GET /admin/incidents/IN-ABC123': { status: 200, body: { incident: resolved() } },
      'POST /admin/incidents/IN-ABC123/charges': {
        status: 403,
        body: { error: { code: 'FORBIDDEN', message: "Your account can't do this." } },
      },
    });
    render();

    const form = within(await screen.findByRole('form', { name: 'Charge the Guest' }));
    await userEvent.type(form.getByLabelText('Description'), 'Repair the passenger door');
    await userEvent.type(form.getByLabelText('Amount (NZD)'), '120');
    await userEvent.click(form.getByRole('button', { name: 'Charge $120' }));

    expect(await form.findByRole('alert')).toHaveTextContent('You need the refunds permission');
  });

  it('says when there’s no such case', async () => {
    mockApi({
      'GET /admin/incidents/IN-ZZZ999': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No such case.' } },
      },
    });
    render('/admin/incidents/in-zzz999');

    expect(await screen.findByText('We couldn’t find that case')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Incidents & disputes' })).toHaveAttribute(
      'href',
      '/admin/incidents',
    );
  });
});
