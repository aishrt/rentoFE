import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffTicket } from '@/api/types';
import { Toaster } from '@/components/ui/toast';
import type * as UploadModule from '@/features/host/upload';
import { mockApi, renderWithRouter } from '@/test/utils';
import { AdminTicketPage } from './ticket-page';

// Uploads go through XMLHttpRequest, which these tests don't run: each file gets a key straight away.
vi.mock('@/features/host/upload', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile: vi.fn(async () => 'support/s1/5d1c2b7a.pdf'),
}));

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A private file as the API gives it: a signed link that works for 10 minutes. */
const signed = (key: string) => `http://localhost:4000/api/v1/files/private/${key}?e=1791543710&s=sig`;
const chooseFile = (file: File) =>
  userEvent.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);

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
      attachments: [],
      internal: false,
      createdAt: '2026-09-27T21:30:00.000Z',
    },
    {
      id: 'm2',
      from: 'STAFF',
      authorName: 'Aroha Admin',
      body: 'Checking with the Host first.',
      attachments: [],
      internal: true,
      createdAt: '2026-09-27T22:00:00.000Z',
    },
  ],
};

const withMessage = (
  body: string,
  internal: boolean,
  status: StaffTicket['status'],
  attachments: StaffTicket['thread'][number]['attachments'] = [],
): StaffTicket => ({
  ...ticket,
  status,
  thread: [
    ...ticket.thread,
    {
      id: 'm3',
      from: 'STAFF',
      authorName: 'Aroha Admin',
      body,
      attachments,
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
    expect(sent).toEqual({ body: 'Yes, 9 is fine.', internal: false, attachments: [], status: 'PENDING' });
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
    expect(sent).toEqual({ body: 'All sorted.', internal: false, attachments: [], status: 'RESOLVED' });
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
    expect(sent).toEqual({ body: 'The Host says 9 is fine.', internal: true, attachments: [] });
    expect(screen.getAllByText('Internal note — only staff see this')).toHaveLength(2);
  });

  it('shows the files on messages and notes', async () => {
    const withFiles: StaffTicket = {
      ...ticket,
      thread: [
        {
          ...ticket.thread[0]!,
          attachments: [
            { url: signed('support/u2/car.jpg'), name: 'scratch.jpg', contentType: 'image/jpeg' },
          ],
        },
        {
          ...ticket.thread[1]!,
          attachments: [
            { url: signed('support/s1/host.pdf'), name: 'host-photos.pdf', contentType: 'application/pdf' },
          ],
        },
      ],
    };
    mockApi({ 'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket: withFiles } } });
    render();

    const message = within(await screen.findByRole('article', { name: 'Message from Kiri Ngata' }));
    expect(message.getByRole('img', { name: 'scratch.jpg' })).toHaveAttribute(
      'src',
      signed('support/u2/car.jpg'),
    );
    const note = within(screen.getByRole('article', { name: 'Internal note from Aroha Admin' }));
    expect(note.getByRole('link', { name: 'host-photos.pdf' })).toHaveAttribute(
      'href',
      signed('support/s1/host.pdf'),
    );
  });

  it('attaches a document to a note', async () => {
    let sent: unknown;
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'POST /admin/support/tickets/ST-ABC123/messages': (init) => {
        sent = JSON.parse(String(init?.body));
        const file = {
          url: signed('support/s1/5d1c2b7a.pdf'),
          name: 'booking.pdf',
          contentType: 'application/pdf',
        };
        return { status: 200, body: { ticket: withMessage('The booking record.', true, 'OPEN', [file]) } };
      },
    });
    render();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('switch', { name: 'Internal note' }));
    await chooseFile(new File(['%PDF'], 'booking.pdf', { type: 'application/pdf' }));
    expect(
      await within(screen.getByRole('list', { name: 'Files to send' })).findByText('booking.pdf'),
    ).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Note for the team' }), 'The booking record.');
    await user.click(screen.getByRole('button', { name: 'Add note' }));

    expect(await screen.findByText('Note added')).toBeInTheDocument();
    expect(sent).toEqual({
      body: 'The booking record.',
      internal: true,
      attachments: [{ key: 'support/s1/5d1c2b7a.pdf', name: 'booking.pdf', contentType: 'application/pdf' }],
    });
    expect(screen.queryByRole('list', { name: 'Files to send' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'booking.pdf' })).toHaveAttribute(
      'href',
      signed('support/s1/5d1c2b7a.pdf'),
    );
  });

  it('keeps files to notes when the sender has no account', async () => {
    const visitor: StaffTicket = { ...ticket, from: { name: 'Tama Visitor', email: 'tama@example.co.nz' } };
    mockApi({ 'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket: visitor } } });
    render();

    expect(
      await screen.findByText(
        'Tama Visitor has no account to see files in. Add them to an internal note instead.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add photos or documents' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Internal note' }));
    expect(screen.getByRole('button', { name: 'Add photos or documents' })).toBeInTheDocument();
  });

  it('shows why the files couldn’t go with the reply', async () => {
    const reason = 'They have no account to see files in. Describe them in the reply, or add them to a note.';
    mockApi({
      'GET /admin/support/tickets/ST-ABC123': { status: 200, body: { ticket } },
      'POST /admin/support/tickets/ST-ABC123/messages': {
        status: 400,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some details need fixing.',
            fields: { attachments: reason },
          },
        },
      },
    });
    render();
    const user = userEvent.setup();

    const text = await screen.findByRole('textbox', { name: 'Your reply' });
    await chooseFile(new File(['%PDF'], 'map.pdf', { type: 'application/pdf' }));
    await within(await screen.findByRole('list', { name: 'Files to send' })).findByText('map.pdf');
    await user.type(text, 'The map.');
    await user.click(screen.getByRole('button', { name: 'Send reply' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(reason);
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
