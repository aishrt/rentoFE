import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageMeta } from './page-meta';

describe('PageMeta', () => {
  it('sets the page title and keeps private pages out of search results', () => {
    render(<PageMeta title="Log in" noindex />);

    expect(document.title).toBe('Log in · Rento Vroom');
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
  });

  it('wins over the static <title> from index.html', () => {
    const staticTitle = document.createElement('title');
    staticTitle.textContent = 'Static title from index.html';
    document.head.prepend(staticTitle);

    render(<PageMeta title="Staff log-in" />);

    expect(document.title).toBe('Staff log-in · Rento Vroom');
    staticTitle.remove();
  });
});
