import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@/api/types';
import { fetchSessionUser, loginRequest, logoutRequest } from './auth-api';

export const sessionQueryKey = ['session'] as const;

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: sessionQueryKey,
    queryFn: fetchSessionUser,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => {
      queryClient.setQueryData(sessionQueryKey, null);
      // Drop any staff data from memory so the next person on this device can't see it.
      queryClient.removeQueries({ queryKey: ['admin'] });
    },
  });
}
