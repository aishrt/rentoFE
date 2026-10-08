import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { Message, Messages, ReportRequest, SendMessageRequest } from '@/api/types';
import {
  addMessage,
  messagesQueryKey,
  threadListQueryKey,
  threadQueryKey,
  threadsQueryKey,
  unreadMessagesQueryKey,
} from './message-keys';

/*
 * Messaging (spec §13): the inbox, a booking's conversation and its messages, sending with photos, and
 * report and block. New messages and read receipts arrive live over Socket.IO (message-keys.ts); a
 * minute's refresh catches anything missed while the connection was down.
 */

const FALLBACK_REFRESH_MS = 60_000;

/** Every conversation, newest first, with the unread total. */
export function useThreads() {
  return useQuery({
    queryKey: threadListQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/threads', { signal })),
    refetchInterval: FALLBACK_REFRESH_MS,
    staleTime: 15_000,
  });
}

/** How many messages wait, for the Messages tab's badge. */
export function useUnreadMessages(enabled = true) {
  return useQuery({
    queryKey: unreadMessagesQueryKey,
    queryFn: async ({ signal }) => (await unwrap(client.GET('/threads/unread', { signal }))).count,
    enabled,
    refetchInterval: FALLBACK_REFRESH_MS,
    staleTime: 15_000,
  });
}

/** One booking's conversation: who it's with, and whether messages can be sent. */
export function useThread(ref: string) {
  return useQuery({
    queryKey: threadQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/threads/{ref}', { params: { path: { ref } }, signal }))).thread,
    enabled: ref !== '',
  });
}

/** The newest messages of a conversation, oldest first; older pages load with `loadOlder`. */
export function useMessages(ref: string) {
  return useQuery({
    queryKey: messagesQueryKey(ref),
    queryFn: ({ signal }) =>
      unwrap(client.GET('/threads/{ref}/messages', { params: { path: { ref }, query: {} }, signal })),
    enabled: ref !== '',
    refetchInterval: FALLBACK_REFRESH_MS,
  });
}

/** Fetches the page before the first message on screen and puts it in front. */
export function useLoadOlderMessages(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (before: string) =>
      unwrap(client.GET('/threads/{ref}/messages', { params: { path: { ref }, query: { before } } })),
    onSuccess: (older) =>
      queryClient.setQueryData<Messages>(messagesQueryKey(ref), (current) =>
        current
          ? {
              messages: [
                ...older.messages.filter((message) => !current.messages.some((m) => m.id === message.id)),
                ...current.messages,
              ],
              hasMore: older.hasMore,
            }
          : current,
      ),
  });
}

export function useSendMessage(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SendMessageRequest): Promise<Message> =>
      (await unwrap(client.POST('/threads/{ref}/messages', { params: { path: { ref } }, body }))).message,
    onSuccess: (message) => {
      addMessage(queryClient, ref, message);
      void queryClient.invalidateQueries({ queryKey: threadListQueryKey });
    },
  });
}

/** Marks the conversation read, so its unread count and the badge clear. */
export function useReadThread(ref: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(client.POST('/threads/{ref}/read', { params: { path: { ref } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadListQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadMessagesQueryKey });
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (body: ReportRequest) => unwrap(client.POST('/reports', { body })),
  });
}

/** Blocks or unblocks someone; their conversations update to say whether messages can be sent. */
export function useBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, block }: { userId: string; block: boolean }) =>
      block
        ? unwrap(client.POST('/users/{id}/block', { params: { path: { id: userId } } }))
        : unwrap(client.DELETE('/users/{id}/block', { params: { path: { id: userId } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: threadsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ['me', 'blocked-users'] });
    },
  });
}

export function useBlockedUsers() {
  return useQuery({
    queryKey: ['me', 'blocked-users'],
    queryFn: async ({ signal }) => (await unwrap(client.GET('/me/blocked-users', { signal }))).users,
  });
}
