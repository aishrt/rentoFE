import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import type { Messages } from '@/api/types';
import {
  applyMessagingEvent,
  messagesQueryKey,
  threadListQueryKey,
  threadQueryKey,
  unreadMessagesQueryKey,
} from './message-keys';
import { message } from './test-fixtures';

function setup() {
  const queryClient = new QueryClient();
  queryClient.setQueryData<Messages>(messagesQueryKey('RV-7K2Q9M'), {
    messages: [message()],
    hasMore: false,
  });
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue();
  const invalidated = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { queryClient, invalidated };
}

describe('applyMessagingEvent', () => {
  it('adds a message from the other side, refreshing the inbox but not the open conversation', () => {
    const { queryClient, invalidated } = setup();
    applyMessagingEvent(queryClient, 'message', { ref: 'RV-7K2Q9M', message: message({ id: 'm2' }) });

    expect(queryClient.getQueryData<Messages>(messagesQueryKey('RV-7K2Q9M'))?.messages).toHaveLength(2);
    expect(invalidated()).toEqual([threadListQueryKey, unreadMessagesQueryKey]);
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
});
