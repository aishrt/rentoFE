import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StaffTicket } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminTicketPage } from './ticket-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const render = (path = '/admin/support/ST-ABC123') =>
  renderWithRouter(
    [
      {
        path: '/admin/support/:ref',
        element: (
          <>
            <AdminTicketPage />
            <Toaster />
          </>
        ),
      },
    ],
    path,
  );

const ticket: StaffTicket = {
  ref: 'ST-ABC123',
  subject: 'Can I pick up an hour earlier?',
  category: 'BOOKING',
  status: 'OPEN',
  from: { name: 'Kiri Ngata', email: 'kiri@example.co.nz', userId: 'u2' },
  bookingRef: 'RV-7K2M9Q',
  messages: 1,
  updatedAt: '2026-09-27T22:00:00.000Z',
  createdAt: '2026-09-27T21:30:00.000Z',
  thread: [
    {
      id: 'm1',
      from: 'USER',
      authorName: 'Kiri Ngata',
      body: 'Could I collect the car at 9 instead of 10?',
      internal: false,
      createdAt: '2026-09-27T21:30:00.000Z',
    },
    {
      id: 'm2',
      from: 'STAFF',
      authorName: 'Aroha Admin',
      body: 'Checking with the Host first.',
      internal: true,
      createdAt: '2026-09-27T22:00:00.000Z',
    },
  ],
};

const withMessage = (body: string, internal: boolean, status: StaffTicket['status']): StaffTicket => ({
  ...ticket,
  status,
  thread: [
    ...ticket.thread,
    {
      id: 'm3',
      from: 'STAFF',
      authorName: 'Aroha Admin',
      body,
      internal,
      createdAt: '2026-09-27T23:00:00.000Z',
    },
  ],
});

const details = () => within(screen.getByRole('complementary', { name: 'Ticket details' }));

describe('AdminTicketPage', () => {
  it('shows the conversation, with internal notes marked, and who and what it’s about', async () => {
    mockApi({ 'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } } });
    render();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Can I pick up an hour earlier?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('ST-ABC123 · Booking')).toBeInTheDocument();

    const message = within(screen.getByRole('article', { name: 'Message from Kiri Ngata' }));
    expect(message.getByText('Could I collect the car at 9 instead of 10?')).toBeInTheDocument();
    const note = within(screen.getByRole('article', { name: 'Internal note from Aroha Admin' }));
    expect(note.getByText('Internal note — only staff see this')).toBeInTheDocument();
    expect(note.getByText('Checking with the Host first.')).toBeInTheDocument();

    const panel = details();
    expect(panel.getByRole('link', { name: 'Kiri Ngata' })).toHaveAttribute('href', '/admin/users/u2');
    expect(panel.getByRole('link', { name: 'kiri@example.co.nz' })).toHaveAttribute(
      'href',
      'mailto:kiri@example.co.nz',
    );
    expect(panel.getByRole('link', { name: 'RV-7K2M9Q' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q',
    );
    expect(panel.getByRole('link', { name: 'Messages' })).toHaveAttribute(
      'href',
      '/admin/bookings/RV-7K2M9Q/thread?context=TICKET:ST-ABC123',
    );
    expect(panel.getByText('Nobody yet')).toBeInTheDocument();
    expect(panel.getByRole('button', { name: /^Status/ })).toHaveTextContent('Open');
  });

  it('sends a reply, leaving the ticket waiting on them', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'POST /admin/support/tickets/ST-ABC123/messages': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { ticket: withMessage('Yes, 9 is fine.', false, 'PENDING') } };
      },
    });
    render();
    const user = userEvent.setup();

    const reply = await screen.findByRole('textbox', { name: 'Your reply' });
    expect(
      screen.getByText('We’ll email it to kiri@example.co.nz and show it in their account.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Then set the status to/ })).toHaveTextContent(
      'Waiting on them',
    );
    await user.type(reply, 'Yes, 9 is fine.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    // Toasts outlive a test, so each test looks for its own: the description names the new status.
    expect(await screen.findByText('We’ve emailed Kiri Ngata. Status: Waiting on them.')).toBeInTheDocument();
    expect(sent).toEqual({ body: 'Yes, 9 is fine.', internal: false, status: 'PENDING' });
    expect(screen.getByRole('article', { name: 'Reply from Aroha Admin' })).toHaveTextContent(
      'Yes, 9 is fine.',
    );
    expect(reply).toHaveValue('');
    expect(details().getByRole('button', { name: /^Status/ })).toHaveTextContent('Waiting on them');
  });

  it('can resolve the ticket with a reply', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'POST /admin/support/tickets/ST-ABC123/messages': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { ticket: withMessage('All sorted.', false, 'RESOLVED') } };
      },
    });
    render();
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Your reply' }), 'All sorted.');
    await user.click(screen.getByRole('button', { name: /^Then set the status to/ }));
    await user.click(screen.getByRole('option', { name: 'Resolved' }));
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('We’ve emailed Kiri Ngata. Status: Resolved.')).toBeInTheDocument();
    expect(sent).toEqual({ body: 'All sorted.', internal: false, status: 'RESOLVED' });
  });

  it('adds an internal note without changing the status', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'POST /admin/support/tickets/ST-ABC123/messages': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { ticket: withMessage('The Host says 9 is fine.', true, 'OPEN') } };
      },
    });
    render();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('switch', { name: 'Internal note' }));
    expect(screen.queryByRole('button', { name: 'Send reply' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Then set the status to/ })).toHaveTextContent(
      'Open (no change)',
    );
    await user.type(screen.getByRole('textbox', { name: 'Note for the team' }), 'The Host says 9 is fine.');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByText('Note added')).toBeInTheDocument();
    // Nothing is emailed, and without a status the ticket stays as it is.
    expect(sent).toEqual({ body: 'The Host says 9 is fine.', internal: true });
    expect(screen.getAllByText('Internal note — only staff see this')).toHaveLength(2);
  });

  it('needs something to send', async () => {
    const fetchMock = mockApi({ 'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } } });
    render();

    await screen.findByRole('textbox', { name: 'Your reply' });
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByText('Write a reply')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([input]) => (input as Request).method === 'POST')).toBe(false);
  });

  it('assigns the ticket to me', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'PATCH /admin/support/tickets/ST-ABC123': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { ticket: { ...ticket, assignedTo: 'Aroha Admin' } } };
      },
    });
    render();

    await userEvent.click(await screen.findByRole('button', { name: 'Assign to me' }));

    expect(await screen.findByText('Assigned to you')).toBeInTheDocument();
    expect(sent).toEqual({ assignToMe: true });
    expect(details().getByText('Aroha Admin')).toBeInTheDocument();
    expect(details().queryByText('Nobody yet')).not.toBeInTheDocument();
  });

  it('changes the status', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'PATCH /admin/support/tickets/ST-ABC123': (init) => {
        sent = JSON.parse(String(init?.body));
        return { status: 200, body: { ticket: { ...ticket, status: 'RESOLVED' } } };
      },
    });
    render();
    const user = userEvent.setup();

    await screen.findByRole('complementary', { name: 'Ticket details' });
    await user.click(details().getByRole('button', { name: /^Status/ }));
    await user.click(screen.getByRole('option', { name: 'Resolved' }));

    expect(await screen.findByText('Ticket marked resolved')).toBeInTheDocument();
    expect(sent).toEqual({ status: 'RESOLVED' });
    expect(details().getByRole('button', { name: /^Status/ })).toHaveTextContent('Resolved');
  });

  it('says when there’s no such ticket', async () => {
    mockApi({
      'GET /admin/support/tickets/ST-NOPE00': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'No such support ticket.' } },
      },
    });
    render('/admin/support/ST-NOPE00');

    expect(await screen.findByText('We couldn’t find that ticket')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the inbox' })).toHaveAttribute('href', '/admin/support');
  });
});
