import { describe, expect, it } from 'vitest';
import { formatEstimate, formatNzdLabelled } from './currency';

const rates = { AUD: 0.89, USD: 0.585, EUR: 0.5, CAD: 0.81 };

describe('price estimates in other currencies', () => {
  it('converts an NZD price to whole units of the chosen currency', () => {
    expect(formatEstimate(18_000, 'AUD', rates)).toBe('≈ A$160');
    expect(formatEstimate(18_000, 'USD', rates)).toBe('≈ US$105');
    expect(formatEstimate(18_000, 'EUR', rates)).toBe('≈ €90');
    expect(formatEstimate(18_000, 'CAD', rates)).toBe('≈ CA$146');
  });

  it('keeps the cents on small amounts', () => {
    expect(formatEstimate(100, 'AUD', rates)).toBe('≈ A$0.89');
  });

  it('shows no estimate for NZD, or before the rates load', () => {
    expect(formatEstimate(18_000, 'NZD', rates)).toBeNull();
    expect(formatEstimate(18_000, 'AUD', undefined)).toBeNull();
  });

  it('labels the NZD price when an estimate sits beside it', () => {
    expect(formatNzdLabelled(18_000)).toBe('NZ$180');
  });
});
