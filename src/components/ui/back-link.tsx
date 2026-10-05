import { ArrowLeft } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { cn } from '@/lib/cn';

/** True when the entry before this one in the tab's history is one of our pages (React Router counts from 0). */
function cameFromThisSite() {
  const state: unknown = window.history.state;
  return (
    typeof state === 'object' &&
    state !== null &&
    'idx' in state &&
    typeof state.idx === 'number' &&
    state.idx > 0
  );
}

/** A click that would open the link in this tab, not a new one. */
const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;

interface BackLinkProps {
  /** The page this one belongs to. */
  to: string;
  children: ReactNode;
  /**
   * For a page opened from several places, such as a car's calendar: goes back to the page before when that
   * was one of ours. `to` is then the way out for someone who opened this page directly.
   */
  previous?: boolean;
  /** Runs first. Call `preventDefault` to go somewhere yourself, such as after saving. */
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  className?: string;
}

/**
 * The way back from a page the header and menus don't link to, such as a trip, a booking or a car's
 * calendar. It goes above the page's title. Its text is the size of the text around it, and a 44 px touch
 * target surrounds it (plan §12.2).
 */
export function BackLink({ to, children, previous = false, onClick, className }: BackLinkProps) {
  const navigate = useNavigate();
  return (
    <Link
      to={to}
      viewTransition
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !previous || !isPlainClick(event) || !cameFromThisSite()) return;
        event.preventDefault();
        void navigate(-1);
      }}
      className={cn(
        'link-underline flex w-fit items-center gap-1.5 text-sm font-medium text-primary',
        'before:absolute before:-inset-x-2 before:-inset-y-3',
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="nudge-left size-4" />
      {children}
    </Link>
  );
}
