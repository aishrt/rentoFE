import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '@/test/utils';
import { HostSubNav } from './host-nav';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * jsdom has no layout: a phone-width tab row, 300 px wide, holding five 90 px tabs after 16 px of padding,
 * so the row scrolls 186 px (16 + 5 × 90 + 4 × 4 gaps + 16 − 300).
 */
function phoneLayout() {
  let scrollLeft = 0;
  const isNav = (element: Element) => element.tagName === 'NAV';
  const left = (element: Element) => {
    if (isNav(element)) return 0;
    const index = [...(element.parentElement?.children ?? [])].indexOf(element);
    return 16 + index * 94 - scrollLeft;
  };
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const x = left(this);
    const width = isNav(this) ? 300 : 90;
    return { x, y: 0, left: x, top: 0, right: x + width, bottom: 44, width, height: 44 } as DOMRect;
  });
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return isNav(this) ? 300 : 90;
  });
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
    return isNav(this) ? 486 : 90;
  });
  vi.spyOn(Element.prototype, 'scrollLeft', 'get').mockImplementation(() => scrollLeft);
  const set = vi.spyOn(Element.prototype, 'scrollLeft', 'set').mockImplementation((value: number) => {
    scrollLeft = Math.min(Math.max(value, 0), 186);
  });
  return { set, scrollLeft: () => scrollLeft };
}

const render = (path: string) => renderWithRouter([{ path: '*', element: <HostSubNav /> }], path);

describe('HostSubNav', () => {
  it('scrolls the current tab into view on a phone, and fades the edge with more tabs past it', () => {
    const layout = phoneLayout();
    render('/host/profile');

    // Profile is the last tab, from 392 px to 482 px: the row scrolls to its end, and only the row.
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(layout.set).toHaveBeenCalledWith(482 + 40 - 300);
    expect(layout.scrollLeft()).toBe(186);
    const nav = screen.getByRole('navigation', { name: 'Hosting' });
    expect(nav).toHaveAttribute('data-more-start');
    expect(nav).not.toHaveAttribute('data-more-end');
  });

  it('leaves the row at its start when the current tab is already in view', () => {
    const layout = phoneLayout();
    render('/host');

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(layout.scrollLeft()).toBe(0);
    const nav = screen.getByRole('navigation', { name: 'Hosting' });
    expect(nav).not.toHaveAttribute('data-more-start');
    expect(nav).toHaveAttribute('data-more-end');
  });
});
