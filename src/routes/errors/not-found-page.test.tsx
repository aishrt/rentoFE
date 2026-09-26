import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test/utils';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  it('says what happened and offers the way back', async () => {
    renderWithProviders(<NotFoundPage />, '/no-such-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Looks like you took a wrong turn' }),
    ).toBeVisible();
    expect(screen.getByText('Error 404 · Page not found')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Find a car' })).toHaveAttribute('href', '/#search');
    expect(screen.getByRole('navigation', { name: 'Popular pages' })).toBeInTheDocument();
  });

  it('keeps the animated scene away from screen readers', async () => {
    const { container } = renderWithProviders(<NotFoundPage />, '/no-such-page');
    await screen.findByRole('heading', { level: 1 });

    const scene = container.querySelector('.animate-drive-in')?.closest('[aria-hidden="true"]');
    expect(scene).not.toBeNull();
    expect(scene).toHaveTextContent('404');
  });
});
