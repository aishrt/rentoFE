import type { Ref } from 'react';

/** Fills a ref passed in by a parent, whether it is a callback or an object, alongside a component's own. */
export function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) ref.current = node;
}
