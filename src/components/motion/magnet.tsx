import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Only mice and trackpads, and only for visitors who haven't asked for less motion. */
const MAGNET_QUERY = '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';

interface MagnetProps {
  children: ReactNode;
  className?: string;
  /** How far outside the element, in px, the pointer starts to pull it. */
  reach?: number;
  /** The furthest the element moves, in px. */
  pull?: number;
}

/**
 * Lets a call to action drift a few pixels towards the pointer as it comes close (adapted from React Bits'
 * Magnet). The offset goes into CSS variables once per frame and the `magnet` utility eases it, so nothing
 * re-renders. Keep it to one element per page, usually the gold button.
 */
export function Magnet({ children, className, reach = 48, pull = 8 }: MagnetProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !window.matchMedia(MAGNET_QUERY).matches) return;

    let frame = 0;
    let near = false;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // The outer span is measured and only the inner one moves, so the pull never feeds back into it.
        const rect = node.getBoundingClientRect();
        const rangeX = rect.width / 2 + reach;
        const rangeY = rect.height / 2 + reach;
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const inRange = Math.abs(dx) < rangeX && Math.abs(dy) < rangeY;
        if (!inRange && !near) return;
        near = inRange;
        node.style.setProperty('--magnet-x', inRange ? `${((dx / rangeX) * pull).toFixed(2)}px` : '0px');
        node.style.setProperty('--magnet-y', inRange ? `${((dy / rangeY) * pull).toFixed(2)}px` : '0px');
      });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      cancelAnimationFrame(frame);
    };
  }, [reach, pull]);

  return (
    <span ref={ref} className={cn('inline-flex', className)}>
      <span className="magnet inline-flex">{children}</span>
    </span>
  );
}
