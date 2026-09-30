import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// The full suite runs many files at once; give findBy… queries more than the default second.
configure({ asyncUtilTimeout: 4_000 });

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
