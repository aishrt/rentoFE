import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SessionUser } from '@/api/types';
import { fetchSessionUser, loginRequest, logoutRequest, mfaLoginRequest, signupRequest } from './auth-api';

export const sessionQueryKey = ['session'] as const;

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: sessionQueryKey,
    queryFn: fetchSessionUser,
    staleTime: 5 * 60_000,
  });
}

/** The password step. Staff with an authenticator app aren't signed in yet: their code comes next. */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (result) => {
      if ('user' in result) queryClient.setQueryData(sessionQueryKey, result.user);
    },
  });
}

/** The authenticator code step of a staff sign-in. */
export function useMfaLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mfaLoginRequest,
    onSuccess: (user) => queryClient.setQueryData(sessionQueryKey, user),
  });
}

/** Creates an account; the new user is signed in straight away. */
export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signupRequest,
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
