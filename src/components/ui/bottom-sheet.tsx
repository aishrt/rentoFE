import { X } from 'lucide-react';
import { AnimatePresence, m, useDragControls, type HTMLMotionProps, type PanInfo } from 'motion/react';
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';
import { assignRef } from '@/lib/assign-ref';
import { cn } from '@/lib/cn';
import { motion } from '@/styles/tokens';
import { IconButton } from './icon-button';

const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Escape closes the layer and Tab cycles inside it. Keys pressed in a picker that belongs to the layer but
 * renders in the page body are left to that picker, so its Escape closes only itself.
 */
function trapModalKeys(event: KeyboardEvent<HTMLElement>, onClose: () => void) {
  const panel = event.currentTarget;
  if (!(event.target instanceof Node) || !panel.contains(event.target)) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    onClose();
    return;
  }
  if (event.key !== 'Tab') return;
  const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.tabIndex >= 0 && !element.closest('[inert]'),
  );
  const first = focusable[0];
  const last = focusable.at(-1);
  if (!first || !last) {
    event.preventDefault();
    return;
  }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

type ModalPanelProps = Omit<HTMLMotionProps<'div'>, 'ref'> & {
  onClose: () => void;
  ref?: Ref<HTMLDivElement>;
};

/**
 * The panel of a modal layer (BottomSheet, Lightbox). While it's mounted the page behind doesn't scroll,
 * focus moves into the panel and returns where it was afterwards, Tab stays inside and Escape closes it.
 *
 * Written by hand rather than with Radix Dialog: Radix blocks everything outside its panel, and the site's
 * pickers (DatePicker, Select, the location list) open in the page body, so inside a Radix dialog they
 * couldn't be clicked or focused.
 */
export function ModalPanel({ onClose, onKeyDown, ref, ...props }: ModalPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    // The panel itself takes focus, so screen readers announce the dialog and phones don't open a keyboard.
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <m.div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      {...props}
      ref={(node) => {
        panelRef.current = node;
        assignRef(ref, node);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented) trapModalKeys(event, onClose);
      }}
    />
  );
}

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Pinned under the scrolling content, e.g. "Clear all" and "Show 12 cars". */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A panel that rises from the bottom of the screen on phones and tablets, such as the search filters
 * (plan §12.3, §12.6). Drag the handle down, press the backdrop or the close button, or press Escape to
 * close it. It moves with transform only.
 *
 * The drag needs Motion's `domMax` features, which the homepage never downloads: wrap the page in
 * `MaxMotion` (features/vehicles/max-motion). Without them the sheet still opens and closes; it just
 * can't be dragged.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const close = () => onOpenChange(false);

  const onDragEnd = (_event: unknown, info: PanInfo) => {
    const height = panelRef.current?.offsetHeight ?? 480;
    // A quarter of the way down, or a quick flick, closes it; otherwise it springs back.
    if (info.offset.y > height / 4 || info.velocity.y > 600) close();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="sheet" className="fixed inset-0 z-50 flex items-end justify-center">
          <m.div
            aria-hidden="true"
            className="absolute inset-0 bg-ink/45"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motion.duration.medium, ease: motion.ease.out }}
          />
          <ModalPanel
            ref={panelRef}
            onClose={close}
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col rounded-t-sheet bg-surface shadow-lift outline-none sm:max-w-xl',
              className,
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0, transition: { duration: motion.duration.medium, ease: motion.ease.out } }}
            exit={{ y: '100%', transition: { duration: motion.duration.short, ease: motion.ease.inOut } }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={onDragEnd}
          >
            {/* The handle and title bar are where a drag starts, so the content below still scrolls. */}
            <div
              onPointerDown={(event) => dragControls.start(event)}
              className="shrink-0 cursor-grab touch-none px-5 pt-2.5 active:cursor-grabbing"
            >
              <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-ink/15" />
              <div className="mt-2 flex items-center justify-between gap-4">
                <h2 id={titleId} className="headline text-2xl font-medium">
                  {title}
                </h2>
                <IconButton label="Close" tooltip="none" onClick={close} className="-mr-2.5">
                  <X
                    aria-hidden="true"
                    className="transition-[rotate] duration-200 ease-out in-[button:hover]:rotate-90"
                  />
                </IconButton>
              </div>
              {description && (
                <p id={descriptionId} className="text-sm text-muted">
                  {description}
                </p>
              )}
            </div>
            <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 pb-5">
              {children}
            </div>
            {footer && (
              <div className="shrink-0 border-t border-line px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}
          </ModalPanel>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
