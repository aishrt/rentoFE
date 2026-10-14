import * as RadixDialog from '@radix-ui/react-dialog';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PopoverRootContext } from './popover';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

interface DialogContentProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /**
   * False for a decision the person has to make before going on: Escape and clicks outside do nothing,
   * so the dialog's own buttons are the only way out.
   */
  dismissible?: boolean;
}

/** A centred modal. Focus is trapped inside while it's open, and returns to where it was on close. */
export function DialogContent({
  title,
  description,
  children,
  className,
  dismissible = true,
}: DialogContentProps) {
  const block = dismissible ? undefined : (event: Event) => event.preventDefault();
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
      <RadixDialog.Content
        // Pickers inside open their lists in here (Popover), where the modal lets them be clicked and focused.
        ref={setRoot}
        onEscapeKeyDown={block}
        onPointerDownOutside={block}
        onInteractOutside={block}
        className={cn(
          // Centred with margins rather than a transform, which the pop animations use.
          'fixed inset-0 z-50 m-auto h-fit max-h-[85dvh] w-[min(92vw,30rem)] overflow-y-auto',
          'rounded-sheet bg-surface p-6 shadow-lift outline-none sm:p-7',
          'data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          className,
        )}
      >
        <RadixDialog.Title className="headline text-xl font-medium">{title}</RadixDialog.Title>
        {description ? (
          <RadixDialog.Description className="mt-2 text-sm text-muted">{description}</RadixDialog.Description>
        ) : (
          <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
        )}
        <div className="mt-5">
          <PopoverRootContext value={root}>{children}</PopoverRootContext>
        </div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
