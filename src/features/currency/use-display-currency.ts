import { useSyncExternalStore } from 'react';
import { isDisplayCurrency, type DisplayCurrency } from './currency';

const STORAGE_KEY = 'rv:currency';
const listeners = new Set<() => void>();

function read(): DisplayCurrency {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isDisplayCurrency(saved) ? saved : 'NZD';
  } catch {
    // Storage can be blocked (private browsing, site data turned off).
    return 'NZD';
  }
}

export function setDisplayCurrency(currency: DisplayCurrency) {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // Not remembered, but still used on this page.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The currency the visitor wants estimates in: NZD until they choose, then remembered in the browser. */
export function useDisplayCurrency() {
  return [useSyncExternalStore(subscribe, read, () => 'NZD' as const), setDisplayCurrency] as const;
}
