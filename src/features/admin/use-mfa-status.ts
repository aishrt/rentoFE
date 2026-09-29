import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { getMfaStatusRequest } from '@/features/account/account-api';
import { formErrorMessage } from '@/features/account/form-errors';

// Under ['admin'], so signing out drops them from memory with the rest of the staff data.
export const mfaStatusQueryKey = ['admin', 'mfa'] as const;
export const mfaSetupQueryKey = ['admin', 'mfa-setup'] as const;

/** Whether the signed-in staff member's two-factor sign-in is on, and their authenticator apps. */
export function useMfaStatus() {
  return useQuery({ queryKey: mfaStatusQueryKey, queryFn: getMfaStatusRequest });
}

// These messages come from the API and are already written for people.
const MFA_ERROR_CODES = [
  'MFA_DEVICE_LIMIT',
  'MFA_SETUP_NOT_STARTED',
  'MFA_LAST_DEVICE',
  'MFA_NOT_ENABLED',
  'NOT_FOUND',
];

/** The message a two-factor form shows above its fields, or null when the error belongs to a field. */
export function mfaErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError && MFA_ERROR_CODES.includes(error.code)) return error.message;
  return formErrorMessage(error);
}
