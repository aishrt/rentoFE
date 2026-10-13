import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/client';
import { actionErrorMessage, REFUNDS_PERMISSION_MESSAGE } from './bookings-api';

const OWN_RECORD = "Another team member needs to handle this, as it's about your own account.";

describe('actionErrorMessage', () => {
  it('reads a plain refusal on a money action as the missing refunds permission', () => {
    const error = new ApiError(403, 'FORBIDDEN', 'You don’t have access to this.');
    expect(actionErrorMessage(error, { needsRefunds: true })).toBe(REFUNDS_PERMISSION_MESSAGE);
    expect(actionErrorMessage(error)).toBe('You don’t have access to this.');
  });

  it('says when it’s the staff member’s own booking, even on a money action (plan §6.2)', () => {
    const error = new ApiError(403, 'OWN_RECORD', OWN_RECORD);
    expect(actionErrorMessage(error, { needsRefunds: true })).toBe(OWN_RECORD);
    expect(actionErrorMessage(error)).toBe(OWN_RECORD);
  });
});
