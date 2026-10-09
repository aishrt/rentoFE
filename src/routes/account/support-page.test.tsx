import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AttachmentInput, SupportTicket, SupportTicketSummary } from '@/api/types';
import { ticket, ticketSummary } from '@/features/account/test-fixtures';
import type * as UploadModule from '@/features/host/upload';
import { uploadFile } from '@/features/host/upload';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { SupportPage } from './support-page';
import { TicketPage } from './ticket-page';

// Uploads go through XMLHttpRequest, which these tests don't run: each file gets a key straight away.
vi.mock('@/features/host/upload', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile: vi.fn(async () => 'support/u1/0b6a3c1e.pdf'),
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

function mockSupport({
  tickets = [ticketSummary()],
  current = () => ticket(),
}: { tickets?: SupportTicketSummary[]; current?: () => SupportTicket } = {}) {
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user: guestUser } };
      case 'GET /support/tickets':
        return { status: 200, body: { tickets } };
      case 'GET /support/tickets/ST-4HX8PA':
        return { status: 200, body: { ticket: current() } };
      case 'POST /support/tickets/ST-4HX8PA/messages': {
        const { body, attachments } = request.body as { body: string; attachments: AttachmentInput[] };
        const replied = ticket({
          status: 'OPEN',
          messages: [
            ...current().messages,
            {
              id: '2',
              from: 'YOU',
              body,
              attachments: attachments.map((file) => ({ ...file, url: signed(file.key) })),
              createdAt: '2026-10-06T01:00:00.000Z',
            },
          ],
        });
        return { status: 200, body: { ticket: replied } };
      }
      case 'GET /support/tickets/ST-NOPE23':
        return { status: 404, body: { error: { code: 'NOT_FOUND', message: 'Not found' } } };
      default:
        return undefined;
    }
  });
}

const render = (path: string) =>
  renderWithRouter(
    [
      { path: '/account/support', element: <SupportPage /> },
      { path: '/account/support/:ref', element: <TicketPage /> },
    ],
    path,
  );

describe('SupportPage', () => {
  it('links to the help centre, safety and contact, and lists the user’s requests', async () => {
    mockSupport({
      tickets: [
        ticketSummary(),
        ticketSummary({
          ref: 'ST-PRIV23',
          subject: 'Privacy: close my account',
          category: 'PRIVACY',
          status: 'RESOLVED',
          bookingRef: undefined,
        }),
      ],
    });
    render('/account/support');

    expect(await screen.findByRole('heading', { level: 1, name: 'Help and support' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Help centre/ })).toHaveAttribute('href', '/help');
    expect(screen.getByRole('link', { name: /Safety and emergencies/ })).toHaveAttribute('href', '/safety');

    const requests = within(await screen.findByRole('region', { name: 'Your support requests' }));
    const first = await requests.findByRole('link', { name: /Where do I collect the car\?/ });
    expect(first).toHaveAttribute('href', '/account/support/ST-4HX8PA');
    expect(within(first).getByText(/ST-4HX8PA · Booking · Trip RV-7K2Q9M/)).toBeInTheDocument();
    expect(within(first).getByText('With our team')).toBeInTheDocument();
    const second = requests.getByRole('link', { name: /Privacy: close my account/ });
    expect(within(second).getByText('Resolved')).toBeInTheDocument();
  });

  it('says where requests will show before there are any', async () => {
    mockSupport({ tickets: [] });
    render('/account/support');

    expect(await screen.findByText(/No requests yet/)).toBeInTheDocument();
  });
});

describe('TicketPage', () => {
  it('shows the conversation, and sends a reply back to support', async () => {
    const sent = mockSupport();
    render('/account/support/ST-4HX8PA');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Where do I collect the car?' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'RV-7K2Q9M' })).toHaveAttribute('href', '/trips/RV-7K2Q9M');
    const messages = within(screen.getByRole('list', { name: 'Messages' }));
    expect(messages.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringMatching(/^YouIs it at the airport\?/),
      expect.stringMatching(/^Rento Vroom supportIt’s at the Host’s home\./),
    ]);

    // An empty reply is caught before it's sent.
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Write a message')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Your reply'), 'Thanks, found it.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await messages.findByText('Thanks, found it.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your reply')).toHaveValue('');
    expect(sent.find((request) => request.path.endsWith('/messages'))?.body).toEqual({
      body: 'Thanks, found it.',
      attachments: [],
    });
  });

  it('shows the files on each message, and sends a reply with a document', async () => {
    const withFiles = ticket({
      messages: [
        ticket().messages[0]!,
        {
          ...ticket().messages[1]!,
          attachments: [
            { url: signed('support/s1/map.jpg'), name: 'map.jpg', contentType: 'image/jpeg' },
            {
              url: signed('support/s1/directions.pdf'),
              name: 'directions.pdf',
              contentType: 'application/pdf',
            },
          ],
        },
      ],
    });
    const sent = mockSupport({ current: () => withFiles });
    render('/account/support/ST-4HX8PA');

    const files = within(await screen.findByRole('list', { name: 'Files' }));
    expect(files.getByRole('img', { name: 'map.jpg' })).toHaveAttribute('src', signed('support/s1/map.jpg'));
    expect(files.getByRole('link', { name: 'directions.pdf' })).toHaveAttribute(
      'href',
      signed('support/s1/directions.pdf'),
    );

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await userEvent.upload(input, new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' }));
    const toSend = within(await screen.findByRole('list', { name: 'Files to send' }));
    expect(await toSend.findByText('receipt.pdf')).toBeInTheDocument();
    // Into the person's own support folder: no booking or car.
    expect(vi.mocked(uploadFile)).toHaveBeenCalledWith(
      expect.objectContaining({ purpose: 'SUPPORT_FILE', filename: 'receipt.pdf' }),
    );
    expect(vi.mocked(uploadFile).mock.calls[0]![0]).not.toHaveProperty('bookingId');

    await userEvent.type(screen.getByLabelText('Your reply'), 'Here’s the receipt.');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('link', { name: 'receipt.pdf' })).toHaveAttribute(
      'href',
      signed('support/u1/0b6a3c1e.pdf'),
    );
    expect(sent.find((request) => request.path.endsWith('/messages'))?.body).toEqual({
      body: 'Here’s the receipt.',
      attachments: [{ key: 'support/u1/0b6a3c1e.pdf', name: 'receipt.pdf', contentType: 'application/pdf' }],
    });
    expect(screen.queryByRole('list', { name: 'Files to send' })).not.toBeInTheDocument();
  });

  it('says a resolved request opens again with a reply', async () => {
    mockSupport({ current: () => ticket({ status: 'RESOLVED' }) });
    render('/account/support/ST-4HX8PA');

    expect(
      await screen.findByText(/This request is resolved\. Write here to open it again\./),
    ).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
  });

  it('says when a request can’t be found', async () => {
    mockSupport();
    render('/account/support/ST-NOPE23');

    expect(await screen.findByRole('heading', { name: 'We couldn’t find that request' })).toBeInTheDocument();
  });
});
