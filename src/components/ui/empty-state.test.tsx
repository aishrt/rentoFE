import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('is a page heading by default, with its description and actions', () => {
    render(
      <EmptyState
        title="This road doesn't go anywhere"
        description="The page you're looking for has moved."
        actions={<button type="button">Back to home</button>}
      />,
    );
    expect(screen.getByRole('heading', { level: 1, name: "This road doesn't go anywhere" })).toBeVisible();
    expect(screen.getByText("The page you're looking for has moved.")).toBeVisible();
    expect(screen.getByRole('button', { name: 'Back to home' })).toBeVisible();
  });

  it('can sit inside a page as a second-level heading', () => {
    render(<EmptyState titleAs="h2" title="No trips yet" />);
    expect(screen.getByRole('heading', { level: 2, name: 'No trips yet' })).toBeVisible();
  });
});
