import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('treats the custom type scale as font sizes, not colours', () => {
    expect(cn('text-title-3', 'text-ink')).toBe('text-title-3 text-ink');
    expect(cn('text-title-3', 'text-sm')).toBe('text-sm');
    expect(cn('text-ui', 'text-display')).toBe('text-display');
  });

  it('resolves conflicts between the custom radii, shadows and highlights', () => {
    expect(cn('rounded-card', 'rounded-inner')).toBe('rounded-inner');
    expect(cn('shadow-card', 'shadow-lift')).toBe('shadow-lift');
    expect(cn('inset-shadow-highlight', 'inset-shadow-none')).toBe('inset-shadow-none');
  });
});
