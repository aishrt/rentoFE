import { api } from '@/api/client';
import type { LoginRequest, SessionResponse, SessionUser, UserResponse } from '@/api/types';

/**
 * The signed-in user, or null for a visitor who isn't signed in. The backend renews an expired
 * access token in the same call, so a page load makes one request and never logs a 401.
 */
export async function fetchSessionUser(): Promise<SessionUser | null> {
  return (await api.post<SessionResponse>('/auth/session')).user;
}

export async function loginRequest(input: LoginRequest): Promise<SessionUser> {
  return (await api.post<UserResponse>('/auth/login', input)).user;
}

export function logoutRequest(): Promise<void> {
  return api.post<void>('/auth/logout');
}
