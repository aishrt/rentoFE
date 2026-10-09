import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Message, ThreadDetail } from '@/api/types';
import { applyMessagingEvent } from '@/features/messages/message-keys';
import { message, threadDetail, threadSummary } from '@/features/messages/test-fixtures';
import { mockRoutes } from '@/features/vehicles/test-fixtures';
import { guestUser, renderWithRouter } from '@/test/utils';
import { ConversationPage } from './conversation-page';
import { MessagesPage } from './messages-page';

afterEach(() => {
  vi.unstubAllGlobals();
});

const hostUser = { ...guestUser, roles: ['GUEST', 'HOST'], hostStatus: 'APPROVED' };

function mockMessaging({
  user = guestUser,
  thread = threadDetail(),
  messages = [message()],
  threadError,
  sendError,
}: {
  user?: typeof guestUser | typeof hostUser;
  /** A function to change the conversation the API returns during a test. */
  thread?: ThreadDetail | (() => ThreadDetail);
  messages?: Message[];
  threadError?: { status: number; code: string };
  sendError?: { status: number; code: string; message: string };
} = {}) {
  const current = [...messages];
  return mockRoutes((request) => {
    switch (`${request.method} ${request.path}`) {
      case 'POST /auth/session':
        return { status: 200, body: { user } };
      case 'GET /threads':
        return {
          status: 200,
          body: {
            threads: [
              threadSummary(),
              threadSummary({
                ref: 'RV-HOST22',
                role: 'HOST',
                otherParty: { id: 'g2', firstName: 'Mere' },
                unreadCount: 0,
                lastMessage: {
                  body: 'Thanks!',
                  from: 'ME',
                  hasPhotos: false,
                  createdAt: '2026-10-05T01:00:00Z',
                },
              }),
            ],
            unreadTotal: 1,
          },
        };
      case 'GET /threads/unread':
        return { status: 200, body: { count: 1 } };
      case 'GET /threads/RV-7K2Q9M':
        return threadError
          ? { status: threadError.status, body: { error: { code: threadError.code, message: 'Not here' } } }
          : { status: 200, body: { thread: typeof thread === 'function' ? thread() : thread } };
      case 'GET /threads/RV-7K2Q9M/messages':
        return { status: 200, body: { messages: current, hasMore: false } };
      case 'POST /threads/RV-7K2Q9M/read':
        return { status: 204 };
      case 'POST /threads/RV-7K2Q9M/messages': {
        if (sendError) {
          return {
            status: sendError.status,
            body: { error: { code: sendError.code, message: sendError.message } },
          };
        }
        const { body } = request.body as { body: string };
        const sent = message({ id: `m${current.length + 1}`, from: 'ME', sender: 'GUEST', body });
        current.push(sent);
        return { status: 201, body: { message: sent } };
      }
      case 'POST /reports':
        return { status: 201, body: { id: 'r1', status: 'OPEN' } };
      case 'POST /users/host-1/block':
        return { status: 204 };
      default:
        return undefined;
    }
  });
}

const render = (path: string) =>
  renderWithRouter(
    [
      { path: '/messages', element: <MessagesPage /> },
      { path: '/messages/:ref', element: <ConversationPage /> },
    ],
    path,
  );

describe('MessagesPage', () => {
  it('lists each booking’s conversation with who it’s with and what’s unread', async () => {
    mockMessaging();
    render('/messages');

    expect(await screen.findByRole('heading', { level: 1, name: 'Messages' })).toBeInTheDocument();
    const hana = await screen.findByRole('link', { name: /Hana/ });
    expect(hana).toHaveAttribute('href', '/messages/RV-7K2Q9M');
    expect(within(hana).getByText('Your host')).toBeInTheDocument();
    expect(within(hana).getByText('See you at 10!')).toBeInTheDocument();
    expect(within(hana).getByText('unread', { exact: false })).toBeInTheDocument();
    expect(within(screen.getByRole('link', { name: /Mere/ })).getByText('You: Thanks!')).toBeInTheDocument();
    // Only Hosts get the trips and guests filter.
    expect(screen.queryByRole('tab', { name: 'Your guests' })).not.toBeInTheDocument();
  });

  it('lets a host see only their guests’ conversations', async () => {
    mockMessaging({ user: hostUser });
    render('/messages');
    await userEvent.click(await screen.findByRole('tab', { name: 'Your guests' }));
    expect(await screen.findByRole('link', { name: /Mere/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Hana/ })).not.toBeInTheDocument();
  });
});

describe('ConversationPage', () => {
  it('shows the messages, marks them read and sends a reply', async () => {
    const sent = mockMessaging({
      messages: [
        message({ id: 's1', from: 'SYSTEM', sender: 'SYSTEM', body: 'Booking confirmed.' }),
        message(),
        message({ id: 'm2', from: 'ME', sender: 'GUEST', body: 'Great', readAt: '2026-10-06T02:00:00.000Z' }),
      ],
    });
    render('/messages/RV-7K2Q9M');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hana' })).toBeInTheDocument();
    const log = screen.getByRole('log', { name: 'Messages with Hana' });
    expect(within(log).getByText('Booking confirmed.')).toBeInTheDocument();
    expect(within(log).getByText('See you at 10!')).toBeInTheDocument();
    expect(within(log).getByText(/Seen/)).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(sent.some((request) => request.method === 'POST' && request.path.endsWith('/read'))).toBe(true),
    );

    await userEvent.type(screen.getByRole('textbox', { name: 'Message Hana' }), 'Can I pick up at 10:30?');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await within(log).findByText('Can I pick up at 10:30?')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message Hana' })).toHaveValue('');
    expect(
      sent.find((request) => request.method === 'POST' && request.path.endsWith('/messages'))?.body,
    ).toEqual({
      body: 'Can I pick up at 10:30?',
      attachments: [],
    });
  });

  it('says contact details are hidden before the booking is confirmed', async () => {
    mockMessaging({ thread: threadDetail({ bookingStatus: 'PENDING', contactsHidden: true }) });
    render('/messages/RV-7K2Q9M');
    expect(await screen.findByText('Contact details are hidden for now')).toBeInTheDocument();
  });

  it('shows why messages can’t be sent instead of the box to write in', async () => {
    mockMessaging({
      thread: threadDetail({
        canSend: false,
        readOnly: true,
        readOnlyReason: 'This conversation closed after the trip. Contact support if you need help.',
      }),
    });
    render('/messages/RV-7K2Q9M');
    expect(await screen.findByText(/This conversation closed after the trip/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Message Hana' })).not.toBeInTheDocument();
  });

  it('reports the other person with a reason', async () => {
    const sent = mockMessaging();
    render('/messages/RV-7K2Q9M');
    await userEvent.click(await screen.findByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Report Hana' }));

    const dialog = await screen.findByRole('dialog', { name: 'Report Hana' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    expect(within(dialog).getByText('Choose a reason')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'A scam or fraud' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));

    await vi.waitFor(() =>
      // With the conversation it came from, so support can read it.
      expect(sent.find((request) => request.path === '/reports')?.body).toEqual({
        targetType: 'USER',
        targetId: 'host-1',
        reason: 'SCAM',
        bookingRef: 'RV-7K2Q9M',
      }),
    );
  });

  it('reports a message without a booking, as the message says which conversation it’s in', async () => {
    const sent = mockMessaging();
    render('/messages/RV-7K2Q9M');
    const log = await screen.findByRole('log', { name: 'Messages with Hana' });
    await userEvent.click(within(log).getByRole('button', { name: /Report/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Report this message' });
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Spam' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send report' }));
    await vi.waitFor(() =>
      expect(sent.find((request) => request.path === '/reports')?.body).toEqual({
        targetType: 'MESSAGE',
        targetId: 'm1',
        reason: 'SPAM',
      }),
    );
  });

  it('swaps the box for the reason when the conversation closed after it was opened', async () => {
    let current = threadDetail();
    mockMessaging({
      thread: () => current,
      sendError: { status: 409, code: 'THREAD_CLOSED', message: 'Messages can’t be sent here.' },
    });
    render('/messages/RV-7K2Q9M');
    await userEvent.type(await screen.findByRole('textbox', { name: 'Message Hana' }), 'Hello?');

    // Hana blocked Kiri in the meantime.
    current = threadDetail({ canSend: false, readOnlyReason: 'Hana isn’t taking messages.' });
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Hana isn’t taking messages.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Message Hana' })).not.toBeInTheDocument();
  });

  it('updates when a booking update arrives live, such as the booking being confirmed', async () => {
    let current = threadDetail({ bookingStatus: 'PENDING', contactsHidden: true });
    const sent = mockMessaging({ thread: () => current });
    const { queryClient } = render('/messages/RV-7K2Q9M');
    expect(await screen.findByText('Contact details are hidden for now')).toBeInTheDocument();
    const loads = () => sent.filter((request) => request.path === '/threads/RV-7K2Q9M/messages').length;
    const before = loads();

    current = threadDetail();
    act(() => {
      applyMessagingEvent(queryClient, 'message', {
        ref: 'RV-7K2Q9M',
        message: message({ id: 's2', from: 'SYSTEM', sender: 'SYSTEM', body: 'Booking confirmed.' }),
      });
    });
    await vi.waitFor(() =>
      expect(screen.queryByText('Contact details are hidden for now')).not.toBeInTheDocument(),
    );
    // The messages load again too, so contact details typed before show unmasked.
    await vi.waitFor(() => expect(loads()).toBeGreaterThan(before));
  });

  it('explains there’s no conversation for a booking that hasn’t reached the host', async () => {
    mockMessaging({ threadError: { status: 404, code: 'NO_THREAD' } });
    render('/messages/RV-7K2Q9M');
    expect(
      await screen.findByRole('heading', { name: 'There’s no conversation here yet' }),
    ).toBeInTheDocument();
  });
});
