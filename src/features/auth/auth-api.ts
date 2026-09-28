import { client, unwrap } from '@/api/client';
import type { LoginRequest, SessionUser, SignupRequest } from '@/api/types';

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

export async function signupRequest(input: SignupRequest): Promise<SessionUser> {
  return (await unwrap(client.POST('/auth/signup', { body: input }))).user;
}

export async function logoutRequest(): Promise<void> {
  await unwrap(client.POST('/auth/logout'));
}

/** Confirms the email address from the emailed link; returns the address confirmed. */
export async function verifyEmailRequest(token: string): Promise<string> {
  return (await unwrap(client.POST('/auth/verify-email', { body: { token } }))).email;
}

/** Emails a new confirmation link. Resolves false if the address is already confirmed. */
export async function resendVerificationRequest(): Promise<boolean> {
  return (await unwrap(client.POST('/auth/verify-email/resend'))).sent;
}
