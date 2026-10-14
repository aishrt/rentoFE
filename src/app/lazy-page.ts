import type { ComponentType } from 'react';

/** Loads a page's code only when it is first visited (plan §12.5: route-level code splitting). */
export function page<Module, Name extends keyof Module>(load: () => Promise<Module>, name: Name) {
  return async () => ({ Component: (await load())[name] as ComponentType });
}
