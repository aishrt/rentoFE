import type { QueryClient } from '@tanstack/react-query';
import type { Message, Messages } from '@/api/types';

/*
 * The messaging cache keys, and what a live Socket.IO event does to them (plan §4.4). Kept apart from the
 * hooks so the always-loaded realtime connection doesn't pull the messaging pages into every page's code.
 */

export const threadsQueryKey = ['threads'] as const;
export const threadListQueryKey = [...threadsQueryKey, 'list'] as const;
export const unreadMessagesQueryKey = [...threadsQueryKey, 'unread'] as const;
export const threadQueryKey = (ref: string) => [...threadsQueryKey, 'thread', ref] as const;
export const messagesQueryKey = (ref: string) => [...threadsQueryKey, 'messages', ref] as const;

interface MessageEvent {
  ref: string;
  message: Message;
}

interface ReadEvent {
  ref: string;
  at: string;
  /** The reader's own other tabs. */
  self?: boolean;
}

/** Adds a message that arrived live to its open conversation, unless the page already has it. */
export function addMessage(queryClient: QueryClient, ref: string, message: Message) {
  queryClient.setQueryData<Messages>(messagesQueryKey(ref), (current) =>
    current && !current.messages.some((existing) => existing.id === message.id)
      ? { ...current, messages: [...current.messages, message] }
      : current,
  );
}

/** Applies a live messaging event: a new message, or a conversation read. */
export function applyMessagingEvent(queryClient: QueryClient, event: string, payload: unknown) {
  if (event === 'message') {
    const { ref, message } = payload as MessageEvent;
    addMessage(queryClient, ref, message);
    void queryClient.invalidateQueries({ queryKey: threadListQueryKey });
    void queryClient.invalidateQueries({ queryKey: unreadMessagesQueryKey });
    if (message.from === 'SYSTEM') {
      // A booking update (confirmed, cancelled, the trip ended): the open conversation's state may have
      // changed with it, such as contact details now showing in the banner and in earlier messages.
      void queryClient.invalidateQueries({ queryKey: threadQueryKey(ref) });
      void queryClient.invalidateQueries({ queryKey: messagesQueryKey(ref) });
    }
    return true;
  }
  if (event === 'thread:read') {
    const { ref, at, self } = payload as ReadEvent;
    if (!self) {
      // The other side read the conversation: everything sent before then shows "Seen".
      queryClient.setQueryData<Messages>(messagesQueryKey(ref), (current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((message) =>
                message.from === 'ME' && !message.readAt && message.createdAt <= at
                  ? { ...message, readAt: at }
                  : message,
              ),
            }
          : current,
      );
    }
    void queryClient.invalidateQueries({ queryKey: threadListQueryKey });
    void queryClient.invalidateQueries({ queryKey: unreadMessagesQueryKey });
    return true;
  }
  return false;
}
