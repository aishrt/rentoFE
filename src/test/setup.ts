import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { afterEach } from 'vitest';
import { clearToasts } from '@/components/ui/toast';

// The full suite runs many files at once; give findBy… queries more than the default second.
configure({ asyncUtilTimeout: 4_000 });

// Toasts live for 5 seconds in a store shared by a file's tests; on a fast machine a case's toast would still be
// showing in the next case, so a check for "Saved" could find two.
afterEach(() => clearToasts());

// jsdom lacks these browser APIs, which Motion and media queries rely on.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    // Report everything as visible so scroll reveals render their final state.
    this.callback(
      [{ isIntersecting: true, target, intersectionRatio: 1 } as IntersectionObserverEntry],
      this,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.IntersectionObserver = MockIntersectionObserver;

window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList;

window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};
