import { client, unwrap } from '@/api/client';
import type { LoginRequest, SessionUser, SignupRequest } from '@/api/types';

/**
 * The signed-in user, or null for a visitor who isn't signed in. The backend renews an expired
 * access token in the same call, so a page load makes one request and never logs a 401.
 */
export async function fetchSessionUser(): Promise<SessionUser | null> {
  return (await unwrap(client.POST('/auth/session'))).user;
}

/** Signed in, or (staff with an authenticator app) the code is needed next. */
export type LoginResult = { user: SessionUser } | { mfaChallenge: string };

export async function loginRequest(input: LoginRequest): Promise<LoginResult> {
  const result = await unwrap(client.POST('/auth/login', { body: input }));
  return 'mfaRequired' in result ? { mfaChallenge: result.challenge } : { user: result.user };
}

/** The second step of a staff sign-in: the code from the authenticator app. */
export async function mfaLoginRequest(input: { challenge: string; code: string }): Promise<SessionUser> {
  return (await unwrap(client.POST('/auth/login/mfa', { body: input }))).user;
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

/** Emails a reset link if the address has an account; the answer is the same either way. */
export async function forgotPasswordRequest(email: string): Promise<void> {
  await unwrap(client.POST('/auth/forgot-password', { body: { email } }));
}

/** Sets a new password from the emailed link; returns the account's email. */
export async function resetPasswordRequest(input: { token: string; password: string }): Promise<string> {
  return (await unwrap(client.POST('/auth/reset-password', { body: input }))).email;
}

/** Switches to a new email address from the link sent to it; returns the new address. */
export async function confirmEmailChangeRequest(token: string): Promise<string> {
  return (await unwrap(client.POST('/auth/confirm-email-change', { body: { token } }))).email;
}
