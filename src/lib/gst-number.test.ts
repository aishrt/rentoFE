import { describe, expect, it } from 'vitest';
import { isValidGstNumber } from './gst-number';

describe('isValidGstNumber', () => {
  it.each(['49-091-850', '49091850', '136-410-132', '136 410 132', '100-000-131'])(
    'passes %s, with Inland Revenue’s check digit',
    (number) => {
      expect(isValidGstNumber(number)).toBe(true);
    },
  );

  it.each(['123-456-789', '136-410-133', '49-091-851', '9-999-999', '150-000-001', '1234', ''])(
    'fails %s: the wrong check digit, outside the range IRD issues, or not 8 or 9 digits',
    (number) => {
      expect(isValidGstNumber(number)).toBe(false);
    },
  );
});
