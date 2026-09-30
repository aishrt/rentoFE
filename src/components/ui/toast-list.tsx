import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';
import { dismissToast, type ToastItem, type ToastTone } from './toast';

const ICONS = { success: CircleCheck, danger: CircleAlert, neutral: Info } as const;
const ICON_COLOURS: Record<ToastTone, string> = {
  success: 'text-success',
  danger: 'text-danger',
  neutral: 'text-primary',
};

/** The toasts on screen. Loaded with the first toast, so pages that never show one don't carry it. */
export default function ToastList({ toasts }: { toasts: readonly ToastItem[] }) {
  return toasts.map((item) => {
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
  });
}
