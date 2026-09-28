import { client, unwrap } from '@/api/client';
import type { MfaSetup, SessionUser } from '@/api/types';

/** Needs the current password; signs out every other device. */
export async function changePasswordRequest(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await unwrap(client.POST('/me/password', { body: input }));
}

/** Emails a link to the new address; returns it. The current address works until the link is opened. */
export async function changeEmailRequest(input: {
  newEmail: string;
  currentPassword: string;
}): Promise<string> {
  return (await unwrap(client.POST('/me/email', { body: input }))).email;
}

/** Texts a code to the number. `sent` is false when it's already the verified number. */
export async function sendPhoneCodeRequest(phone: string): Promise<{ phone: string; sent: boolean }> {
  return unwrap(client.POST('/auth/phone/otp', { body: { phone } }));
}

export async function verifyPhoneCodeRequest(code: string): Promise<SessionUser> {
  return (await unwrap(client.POST('/auth/phone/verify', { body: { code } }))).user;
}

/** Staff: a new authenticator secret, as a QR code. */
export async function startMfaSetupRequest(): Promise<MfaSetup> {
  return unwrap(client.POST('/me/mfa/setup'));
}

/** Staff: the first code from the app turns two-factor sign-in on. */
export async function enableMfaRequest(code: string): Promise<SessionUser> {
  return (await unwrap(client.POST('/me/mfa/verify', { body: { code } }))).user;
}
