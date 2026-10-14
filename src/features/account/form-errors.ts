import { ApiError } from '@/api/client';

/**
 * The message a form shows above its fields for an API error, or null when the error is about its fields
 * (each shows next to its field instead). Pass the form's field names to show here any field message none
 * of them can take. A refusal (4xx) comes with a message written for people, such as "Your hosting is
 * suspended", so it shows as it is; only a fault on our side gets the general apology.
 */
export function formErrorMessage(error: unknown, formFields?: readonly string[]): string | null {
  if (error instanceof ApiError) {
    if (error.fields) {
      if (!formFields) return null;
      const elsewhere = Object.entries(error.fields)
        .filter(([field]) => !formFields.includes(field))
        .map(([, message]) => message);
      return elsewhere.length > 0 ? elsewhere.join(' ') : null;
    }
    if (error.status >= 400 && error.status < 500) return error.message;
    // These messages come from the API, or the client, and are already written for people.
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
