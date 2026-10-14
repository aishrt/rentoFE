import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { client, unwrap } from '@/api/client';
import type { Review, ReviewRequest } from '@/api/types';

/* Two-way reviews (spec §16): to write, written and received, and writing one. */

export const myReviewsQueryKey = ['me', 'reviews'] as const;

export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: myReviewsQueryKey,
    queryFn: ({ signal }) => unwrap(client.GET('/me/reviews', { signal })),
    enabled,
    staleTime: 60_000,
  });
}

/** A member's public profile and the published reviews about them, as Guest and as Host (plan §6.2). */
export function useMemberProfile(id: string) {
  return useQuery({
    queryKey: ['members', id],
    queryFn: ({ signal }) => unwrap(client.GET('/users/{id}/reviews', { params: { path: { id } }, signal })),
    enabled: id !== '',
    staleTime: 60_000,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: ReviewRequest): Promise<Review> =>
      (await unwrap(client.POST('/reviews', { body }))).review,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myReviewsQueryKey }),
  });
}
