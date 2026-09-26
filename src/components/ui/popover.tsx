import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type KeyboardEvent,
  type Ref,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { assignRef } from '@/lib/assign-ref';
import { cn } from '@/lib/cn';

/** Space between the anchor and the popover, and the margin kept clear at the viewport's edges, in px. */
const GAP = 8;
const EDGE = 8;

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), [tabindex]';

type PopoverProps = Omit<ComponentProps<'div'>, 'ref' | 'style'> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the popover sits against. Pointer presses and focus inside it don't close the popover. */
  anchorRef: RefObject<HTMLElement | null>;
  /** Lines up the popover's left edge (`start`) or right edge (`end`) with the anchor's. */
  align?: 'start' | 'end';
  /** Makes the popover at least as wide as its anchor, as for a list under an input. */
  matchWidth?: boolean;
  /** Keeps Tab and Shift+Tab inside the popover, as in a calendar. */
  trapFocus?: boolean;
  /** Focused again when Escape closes the popover, usually the button that opened it. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  ref?: Ref<HTMLDivElement>;
};

/**
 * A floating panel for pickers and suggestion lists. It renders into the page body, so a parent with
 * `overflow: hidden` (such as the home hero) can't clip it. It opens below its anchor, or above when there
 * is more room there, stays inside the viewport and follows the anchor as the page scrolls. It closes on
 * Escape, and when you press or focus anywhere outside it and its anchor. This is a few hundred bytes,
 * where a positioning library would add about 10 KB to the homepage (plan §12.5).
 */
export function Popover({
  open,
  onOpenChange,
  anchorRef,
  align = 'start',
  matchWidth,
  trapFocus,
  returnFocusRef,
  ref,
  className,
  onKeyDown,
  ...props
}: PopoverProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Positioned by writing styles directly, so scrolling doesn't re-render what's inside.
  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;

    const place = (opening = false) => {
      const anchor = anchorRef.current;
      const content = contentRef.current;
      if (!anchor || !content) return;
      let rect = anchor.getBoundingClientRect();
      if (matchWidth) content.style.minWidth = `${rect.width}px`;
      content.style.maxHeight = '';
      const { offsetWidth: width, offsetHeight: height } = content;

      const roomBelow = () => window.innerHeight - rect.bottom - GAP - EDGE;
      const roomAbove = () => rect.top - GAP - EDGE;
      if (opening && height > roomBelow() && height > roomAbove()) {
        // Room on neither side: scroll the page just enough to fit it below, keeping the anchor in view.
        window.scrollBy({ top: Math.min(height - roomBelow(), rect.top - EDGE), behavior: 'instant' });
        rect = anchor.getBoundingClientRect();
      }
      const below = roomBelow();
      const above = roomAbove();
      const side = height <= below || below >= above ? 'bottom' : 'top';
      const room = Math.max(side === 'bottom' ? below : above, 160);
      if (height > room) content.style.maxHeight = `${room}px`;

      const preferredLeft = align === 'start' ? rect.left : rect.right - width;
      const maxLeft = document.documentElement.clientWidth - EDGE - width;
      content.style.left = `${Math.max(EDGE, Math.min(preferredLeft, maxLeft))}px`;
      content.style.top = `${side === 'bottom' ? rect.bottom + GAP : rect.top - GAP - Math.min(height, room)}px`;
      content.style.transformOrigin = `${align === 'start' ? 'left' : 'right'} ${side}`;
      content.style.visibility = 'visible';
    };

    const schedule = (event: Event) => {
      // Scrolling inside the popover itself doesn't move it.
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => place());
    };

    place(true);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [open, align, matchWidth, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      Boolean(contentRef.current?.contains(target) || anchorRef.current?.contains(target));

    const onPointerDown = (event: PointerEvent) => {
      if (!isInside(event.target)) onOpenChange(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isInside(event.target)) onOpenChange(false);
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onOpenChange(false);
      returnFocusRef?.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, onOpenChange, anchorRef, returnFocusRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (!trapFocus || event.key !== 'Tab' || event.defaultPrevented) return;
    // Roving-focus items (such as calendar days other than the focused one) have tabindex -1 and are skipped.
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (element) => element.tabIndex >= 0,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;
  return createPortal(
    <div
      {...props}
      ref={(node) => {
        contentRef.current = node;
        assignRef(ref, node);
      }}
      onKeyDown={handleKeyDown}
      // Hidden until placed, which happens before the first paint.
      className={cn(
        'invisible fixed top-0 left-0 z-50 animate-pop-in overflow-y-auto overscroll-contain rounded-card border border-line bg-surface shadow-lift',
        className,
      )}
    />,
    document.body,
  );
}
