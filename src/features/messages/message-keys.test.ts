import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  applyMessagingEvent,
  messagesQueryKey,
  threadListQueryKey,
  threadQueryKey,
  unreadMessagesQueryKey,
  type MessagePages,
} from './message-keys';
import { message } from './test-fixtures';

/** A conversation with an earlier page loaded: m0 on the older page, m1 on the newest. */
function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData<MessagePages>(messagesQueryKey('RV-7K2Q9M'), {
    pages: [
      { messages: [message()], hasMore: true },
      {
        messages: [message({ id: 'm0', from: 'ME', sender: 'GUEST', createdAt: '2026-10-05T01:00:00.000Z' })],
        hasMore: false,
      },
    ],
    pageParams: ['', 'm1'],
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const invalidated = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  const pages = () => queryClient.getQueryData<MessagePages>(messagesQueryKey('RV-7K2Q9M'))!.pages;
  return { queryClient, invalidated, pages };
}

describe('applyMessagingEvent', () => {
  it('adds a message from the other side, refreshing the inbox but not the open conversation', () => {
    const { queryClient, invalidated, pages } = setup();
    applyMessagingEvent(queryClient, 'message', { ref: 'RV-7K2Q9M', message: message({ id: 'm2' }) });

    // At the end of the newest page; the earlier page stays.
    expect(pages().map((page) => page.messages.map((entry) => entry.id))).toEqual([['m1', 'm2'], ['m0']]);
    expect(invalidated()).toEqual([threadListQueryKey, unreadMessagesQueryKey]);
  });

  it('adds a message only once, whichever page has it', () => {
    const { queryClient, pages } = setup();
    applyMessagingEvent(queryClient, 'message', { ref: 'RV-7K2Q9M', message: message({ id: 'm0' }) });

    expect(pages().map((page) => page.messages.map((entry) => entry.id))).toEqual([['m1'], ['m0']]);
  });

  it('refreshes the open conversation and its messages when a booking update arrives', () => {
    const { queryClient, invalidated } = setup();
    applyMessagingEvent(queryClient, 'message', {
      ref: 'RV-7K2Q9M',
      message: message({ id: 's1', from: 'SYSTEM', sender: 'SYSTEM', body: 'Booking confirmed.' }),
    });

    expect(invalidated()).toEqual([
      threadListQueryKey,
      unreadMessagesQueryKey,
      threadQueryKey('RV-7K2Q9M'),
      messagesQueryKey('RV-7K2Q9M'),
    ]);
  });

  it('marks what was sent before the other side read the conversation as seen, on every page', () => {
    const { queryClient, pages } = setup();
    applyMessagingEvent(queryClient, 'thread:read', { ref: 'RV-7K2Q9M', at: '2026-10-06T00:00:00.000Z' });

    expect(pages()[1]!.messages[0]!.readAt).toBe('2026-10-06T00:00:00.000Z');
    // Theirs, not yours: nothing to mark.
    expect(pages()[0]!.messages[0]!.readAt).toBeUndefined();
  });
});
