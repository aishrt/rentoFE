import { describe, expect, it } from 'vitest';
import { formatNzDateTime, requestAnswerWindow } from './booking-format';

describe('requestAnswerWindow', () => {
  // 9 pm on Wed 14 Oct 2026 in NZ.
  const now = Date.parse('2026-10-14T08:00:00.000Z');
  // 7 am the next morning in NZ, ten hours on.
  const soon = '2026-10-14T18:00:00.000Z';

  it('gives a sent request’s own deadline', () => {
    expect(requestAnswerWindow({ requestExpiresAt: soon, start: '2026-10-20T21:00:00.000Z' }, now)).toBe(
      `until ${formatNzDateTime(soon)} (NZ time)`,
    );
    expect(requestAnswerWindow({ requestExpiresAt: soon }, now)).toMatch(/^until Thu, 15 Oct, 7:00/);
  });

  it('is 24 hours before a request is sent, or until the trip starts when that’s sooner', () => {
    expect(requestAnswerWindow({ start: '2026-10-20T21:00:00.000Z' }, now)).toBe('24 hours');
    expect(requestAnswerWindow({ start: soon }, now)).toBe(`until ${formatNzDateTime(soon)} (NZ time)`);
    // No dates yet, or a start already passed (no request can be sent for it): the rule.
    expect(requestAnswerWindow({}, now)).toBe('24 hours');
    expect(requestAnswerWindow({ start: '2026-10-13T21:00:00.000Z' }, now)).toBe('24 hours');
  });
});
