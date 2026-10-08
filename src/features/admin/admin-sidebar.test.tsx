import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminUser, mockApi, renderWithRouter } from '@/test/utils';
import { AdminSidebar } from './admin-sidebar';

/*
 * jsdom has no layout, so the list is given one: 600 px tall on screen, its links 46 px apart from the top of
 * the list's content, and 806 px of content in all, as on a laptop screen with every section showing.
 */
const LIST_TOP = 100;
const LIST_HEIGHT = 600;
const CONTENT_HEIGHT = 806;
const LINK_STEP = 46;
const LINK_HEIGHT = 44;

const scrollTops = new WeakMap<Element, number>();
const descriptors = ['scrollTop', 'clientHeight', 'scrollHeight'].map(
  (name) => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)] as const,
);

const rect = (top: number, height: number) =>
  ({ top, bottom: top + height, height, left: 0, right: 240, width: 240, x: 0, y: top }) as DOMRect;

beforeEach(() => {
  Object.defineProperties(Element.prototype, {
    scrollTop: {
      configurable: true,
      get(this: Element) {
        return scrollTops.get(this) ?? 0;
      },
      set(this: Element, value: number) {
        scrollTops.set(this, Math.min(Math.max(0, value), CONTENT_HEIGHT - LIST_HEIGHT));
      },
    },
    clientHeight: {
      configurable: true,
      get: () => LIST_HEIGHT,
    },
    scrollHeight: {
      configurable: true,
      get: () => CONTENT_HEIGHT,
    },
  });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.tagName === 'NAV') return rect(LIST_TOP, LIST_HEIGHT);
    const nav = this.closest('nav');
    if (!nav) return rect(0, 0);
    const index = [...nav.querySelectorAll('a')].indexOf(this as HTMLAnchorElement);
    return rect(LIST_TOP + index * LINK_STEP - nav.scrollTop, LINK_HEIGHT);
  });
});

afterEach(() => {
  for (const [name, descriptor] of descriptors) {
    if (descriptor) Object.defineProperty(Element.prototype, name, descriptor);
    else Reflect.deleteProperty(Element.prototype, name);
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const render = (path: string) => {
  mockApi({ 'POST /auth/session': { status: 200, body: { user: adminUser } } });
  return renderWithRouter([{ path: '*', element: <AdminSidebar /> }], path);
};

describe('AdminSidebar', () => {
  it('scrolls the list to the current page’s link when it starts below the fold', async () => {
    render('/admin/content');

    const link = await screen.findByRole('link', { name: 'Content' });
    expect(link).toHaveAttribute('aria-current', 'page');
    const nav = screen.getByRole('navigation', { name: 'Staff portal' });
    const list = nav.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    expect(box.top).toBeGreaterThanOrEqual(list.top);
    // Clear of the fade over the bottom tenth of the list.
    expect(box.bottom).toBeLessThanOrEqual(list.bottom - list.height * 0.1);
    expect(nav.scrollTop).toBeGreaterThan(0);
  });

  it('leaves the list where it is when the current link already shows', async () => {
    render('/admin/users');

    await screen.findByRole('link', { name: 'Content' });
    expect(screen.getByRole('navigation', { name: 'Staff portal' }).scrollTop).toBe(0);
  });

  it('fades the bottom of the list while more links are below it', async () => {
    render('/admin');

    await screen.findByRole('link', { name: 'Jobs' });
    const nav = screen.getByRole('navigation', { name: 'Staff portal' });
    expect(nav).toHaveAttribute('data-more-end');

    nav.scrollTop = CONTENT_HEIGHT - LIST_HEIGHT;
    fireEvent.scroll(nav);
    expect(nav).not.toHaveAttribute('data-more-end');
  });
});
