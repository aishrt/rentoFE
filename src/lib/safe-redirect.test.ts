import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each([
    ['/admin', '/admin'],
    ['/search?where=Queenstown#results', '/search?where=Queenstown#results'],
  ])('keeps the local path %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('falls back for %s', (input) => {
    expect(safeRedirect(input, '/home')).toBe('/home');
  });
});
