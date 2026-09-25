import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

interface SheetContentProps {
  side?: 'left' | 'right';
  /** Required for screen readers; hide it visually with `hideTitle` when the design has no heading. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** A panel that slides in from the side (mobile navigation, admin menu). Focus is trapped while open. */
export function SheetContent({
  side = 'right',
  title,
  hideTitle,
  description,
  children,
  className,
}: SheetContentProps) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
      <Dialog.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-[min(86vw,22rem)] flex-col bg-surface shadow-lift outline-none',
          side === 'right'
            ? 'right-0 rounded-l-sheet data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right'
            : 'left-0 rounded-r-sheet data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left',
          className,
        )}
      >
        <div className={cn('flex items-center justify-between gap-4 px-5 pt-5', hideTitle && 'justify-end')}>
          <Dialog.Title className={cn('headline text-xl font-medium', hideTitle && 'sr-only')}>
            {title}
          </Dialog.Title>
          <Dialog.Close asChild>
            <IconButton label="Close menu">
              <X aria-hidden="true" />
            </IconButton>
          </Dialog.Close>
        </div>
        {description ? (
          <Dialog.Description className="px-5 text-sm text-muted">{description}</Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          {children}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
