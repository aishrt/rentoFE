import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';

/*
 * Toasts (plan §12.3): short confirmations that slide in at the bottom and leave on their own, e.g.
 * "Saved to your cars" or "Booking request sent". Screen readers hear them through a polite live
 * region. Errors that need the person to act belong in an Alert on the page instead.
 */

type Tone = 'success' | 'danger' | 'neutral';

interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
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

/** Shows a toast for `duration` ms (5 s by default). At most three show at once. */
export function toast(
  title: string,
  {
    description,
    tone = 'success',
    duration = 5_000,
  }: { description?: string; tone?: Tone; duration?: number } = {},
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

const ICONS = { success: CircleCheck, danger: CircleAlert, neutral: Info } as const;
const ICON_COLOURS: Record<Tone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  neutral: 'text-primary',
};

/** Rendered once, in the root layout. */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-60 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.map((item) => {
        const Icon = ICONS[item.tone];
        return (
          <div
            key={item.id}
            className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-card border border-line/80 bg-surface p-4 shadow-lift"
          >
            <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', ICON_COLOURS[item.tone])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
            </div>
            <IconButton
              label="Dismiss"
              tooltip="none"
              className="-my-2.5 -mr-2.5"
              onClick={() => dismissToast(item.id)}
            >
              <X aria-hidden="true" />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
}
