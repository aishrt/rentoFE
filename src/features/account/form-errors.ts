import { ApiError } from '@/api/client';

/**
 * The message a form shows above its fields for an API error, or null when the error is about a
 * field (it shows next to that field instead).
 */
export function formErrorMessage(error: unknown): string | null {
  if (error instanceof ApiError) {
    if (error.fields) return null;
    // These messages come from the API and are already written for people.
    if (['RATE_LIMITED', 'NETWORK_ERROR', 'TOO_MANY_CODES', 'NUMBER_NOT_ALLOWED'].includes(error.code)) {
      return error.message;
    }
  }
  return 'Something went wrong on our side. Please try again in a moment.';
}

/** Copies an API error's field messages onto a form's fields. */
export function applyFieldErrors<Field extends string>(
  error: unknown,
  fields: readonly Field[],
  setError: (field: Field, error: { message: string }, options?: { shouldFocus: boolean }) => void,
) {
  if (!(error instanceof ApiError) || !error.fields) return;
  for (const field of fields) {
    const message = error.fields[field];
    if (message) setError(field, { message }, { shouldFocus: true });
  }
}
