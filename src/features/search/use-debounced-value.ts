import { useEffect, useState } from 'react';

/** `value`, once it has stopped changing for `delay` ms: for requests that follow typing or dragging. */
export function useDebouncedValue<Value>(value: Value, delay: number): Value {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
