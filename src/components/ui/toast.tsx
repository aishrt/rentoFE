import { lazy, Suspense, useSyncExternalStore } from 'react';

/*
 * Toasts (plan §12.3): short confirmations that slide in at the bottom and leave on their own, e.g.
 * "Saved to your cars" or "Booking request sent". Screen readers hear them through a polite live
 * region. Errors that need the person to act belong in an Alert on the page instead.
 */

export type ToastTone = 'success' | 'danger' | 'neutral';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function dismissToast(id: number) {
  items = items.filter((item) => item.id !== id);
  emit();
}

/** Clears every toast at once: the tests do after each case, so one case's toast never shows in the next. */
// eslint-disable-next-line react-refresh/only-export-components
export function clearToasts() {
  items = [];
  emit();
}

/** Shows a toast for `duration` ms (5 s by default). At most three show at once. */
export function toast(
  title: string,
  {
    description,
    tone = 'success',
    duration = 5_000,
  }: { description?: string; tone?: ToastTone; duration?: number } = {},
) {
  const id = nextId++;
  items = [...items.slice(-2), { id, title, description, tone }];
  emit();
  setTimeout(() => dismissToast(id), duration);
  return id;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => items;

// The toasts themselves load with the first one, keeping them out of every page's first load (plan §12.5).
const ToastList = lazy(() => import('./toast-list'));

/** Rendered once, in the root layout. The live region is always there, so the first toast is announced. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.length > 0 && (
        <Suspense fallback={null}>
          <ToastList toasts={toasts} />
        </Suspense>
      )}
    </div>
  );
}
