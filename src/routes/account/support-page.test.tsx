import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupportTicket, SupportTicketSummary } from '@/api/types';
import { ticket, ticketSummary } from '@/features/account/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { SupportPage } from './support-page';
import { TicketPage } from './ticket-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

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
        const { body } = request.body as { body: string };
        const replied = ticket({
          status: 'OPEN',
          messages: [
            ...current().messages,
            { id: '2', from: 'YOU', body, createdAt: '2026-10-06T01:00:00.000Z' },
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
    });
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
