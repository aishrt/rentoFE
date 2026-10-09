import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { Message, Messages, ReportRequest, SendMessageRequest } from '@/api/types';
import {
  addMessage,
  messagesQueryKey,
  threadListQueryKey,
  threadQueryKey,
  threadsQueryKey,
  unreadMessagesQueryKey,
  type MessagePages,
} from './message-keys';

/*
 * Messaging (spec §13): the inbox, a booking's conversation and its messages, sending with photos, and
 * report and block. New messages and read receipts arrive live over Socket.IO (message-keys.ts); a
 * minute's refresh catches anything missed while the connection was down. The unread count beside the
 * Messages links is in unread-count.ts.
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

/** One booking's conversation: who it's with, and whether messages can be sent. */
export function useThread(ref: string, enabled = true) {
  return useQuery({
    queryKey: threadQueryKey(ref),
    queryFn: async ({ signal }) =>
      (await unwrap(client.GET('/threads/{ref}', { params: { path: { ref } }, signal }))).thread,
    enabled: enabled && ref !== '',
  });
}

/** The pages loaded so far as one list, oldest first, and whether there are older ones. */
function joinPages(data: MessagePages): Messages {
  return {
    messages: [...data.pages].reverse().flatMap((page) => page.messages),
    hasMore: data.pages.at(-1)?.hasMore ?? false,
  };
}

/**
 * A conversation's messages, oldest first: the newest page, and older pages as `fetchNextPage` loads them.
 * Each page is cached on its own, so the minute's refresh and a live booking update fetch every page loaded
 * again, from the newest back, rather than replacing earlier messages with the newest page.
 */
export function useMessages(ref: string) {
  return useInfiniteQuery({
    queryKey: messagesQueryKey(ref),
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET('/threads/{ref}/messages', {
          params: { path: { ref }, query: pageParam ? { before: pageParam } : {} },
          signal,
        }),
      ),
    initialPageParam: '',
    // The page before the oldest message loaded.
    getNextPageParam: (oldest: Messages) => (oldest.hasMore ? oldest.messages[0]?.id : undefined),
    select: joinPages,
    enabled: ref !== '',
    refetchInterval: FALLBACK_REFRESH_MS,
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
