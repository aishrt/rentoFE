import { client, unwrap } from '@/api/client';
import type { MfaSetup, MfaStatus, SessionUser } from '@/api/types';

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

/** Staff: whether two-factor sign-in is on, and their authenticator apps. */
export async function getMfaStatusRequest(): Promise<MfaStatus> {
  return unwrap(client.GET('/me/mfa'));
}

/** Staff: a new authenticator secret, as a QR code, for the first app or a backup. */
export async function startMfaSetupRequest(): Promise<MfaSetup> {
  return unwrap(client.POST('/me/mfa/setup'));
}

/**
 * Staff: the first code from a new app adds it. The first app turns two-factor sign-in on and signs out
 * other devices; a backup also needs a code from the app already set up.
 */
export async function addMfaDeviceRequest(input: {
  code: string;
  name?: string;
  currentCode?: string;
}): Promise<SessionUser> {
  return (await unwrap(client.POST('/me/mfa/verify', { body: input }))).user;
}

/** Staff: removes one of two authenticator apps, with a code from either. */
export async function removeMfaDeviceRequest(input: { id: string; code: string }): Promise<MfaStatus> {
  return unwrap(
    client.POST('/me/mfa/devices/{id}/remove', {
      params: { path: { id: input.id } },
      body: { code: input.code },
    }),
  );
}

/** Staff: turns two-factor sign-in off with a code from any of their apps. */
export async function disableMfaRequest(code: string): Promise<SessionUser> {
  return (await unwrap(client.POST('/me/mfa/disable', { body: { code } }))).user;
}
