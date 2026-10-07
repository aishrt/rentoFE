import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils';
import { MobileMenu } from './mobile-menu';
import { SiteFooter } from './site-footer';

/** jsdom has no View Transitions API: a stand-in that runs the page change, as browsers do. */
function stubViewTransitions() {
  const start = vi.fn((update: () => void | Promise<void>) => {
    const done = Promise.resolve().then(update);
    return { finished: done, ready: done, updateCallbackDone: done, skipTransition: () => {} };
  });
  Object.defineProperty(document, 'startViewTransition', { value: start, configurable: true });
  return start;
}

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition;
});

describe('Page transitions', () => {
  it('animate the change of page from the footer’s links', async () => {
    const start = stubViewTransitions();
    const { router } = renderWithRouter([{ path: '*', element: <SiteFooter /> }], '/');

    await userEvent.click(screen.getByRole('link', { name: 'Safety' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/safety'));
    expect(start).toHaveBeenCalled();
  });

  it('animate the change of page from the mobile menu’s links', async () => {
    const start = stubViewTransitions();
    const onOpenChange = vi.fn();
    const { router } = renderWithRouter(
      [{ path: '*', element: <MobileMenu open onOpenChange={onOpenChange} user={null} /> }],
      '/',
    );

    await userEvent.click(screen.getByRole('link', { name: 'Browse cars' }));

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/cars'));
    expect(start).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
