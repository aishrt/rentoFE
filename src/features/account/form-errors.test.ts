import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { formErrorMessage } from './form-errors';

describe('formErrorMessage', () => {
  it('shows a refusal in the API’s words, and apologises only for a fault on our side', () => {
    expect(
      formErrorMessage(
        new ApiError(409, 'HOST_SUSPENDED', 'Your hosting is suspended. Please contact support.'),
      ),
    ).toBe('Your hosting is suspended. Please contact support.');
    expect(formErrorMessage(new ApiError(500, 'INTERNAL', 'Boom'))).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    );
    expect(formErrorMessage(new Error('nope'))).toBe(
      'Something went wrong on our side. Please try again in a moment.',
    );
  });

  it('leaves field messages to their fields, and shows any the form has no field for', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Some details need fixing.', {
      bio: 'Keep it under 1,000 characters',
      reminders: 'Keep it to 20 reminders',
    });
    // Without the form's fields, as before: they're all the form's.
    expect(formErrorMessage(error)).toBeNull();
    expect(formErrorMessage(error, ['bio'])).toBe('Keep it to 20 reminders');
    expect(formErrorMessage(error, ['bio', 'reminders'])).toBeNull();
  });
});
