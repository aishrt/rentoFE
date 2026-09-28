import { client, unwrap } from '@/api/client';
import type { LoginRequest, SessionUser } from '@/api/types';

/**
 * The signed-in user, or null for a visitor who isn't signed in. The backend renews an expired
 * access token in the same call, so a page load makes one request and never logs a 401.
 */
export async function fetchSessionUser(): Promise<SessionUser | null> {
  return (await unwrap(client.POST('/auth/session'))).user;
}

export async function loginRequest(input: LoginRequest): Promise<SessionUser> {
  return (await unwrap(client.POST('/auth/login', { body: input }))).user;
}

export async function logoutRequest(): Promise<void> {
  await unwrap(client.POST('/auth/logout'));
}
