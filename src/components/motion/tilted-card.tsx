import type { PointerEvent, ReactNode } from 'react';

interface TiltedCardProps {
  children: ReactNode;
  className?: string;
  /** The largest tilt in degrees, reached at the card's edges. */
  amplitude?: number;
}

/**
 * Tilts its content towards the pointer in 3D and lifts it slightly (adapted from React Bits' TiltedCard).
 * The angles are written to CSS variables and eased by the `tilt` utility, so there is no animation loop and
 * no re-render. Mouse and trackpad only, and still with reduced motion. Keep it for decorative panels:
 * tilting something people type into or read closely gets in their way.
 */
export function TiltedCard({ children, className, amplitude = 5 }: TiltedCardProps) {
  // The outer element is measured and the inner one tilts, so the tilt never feeds back into the maths.
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const node = event.currentTarget;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.setProperty('--tilt-x', `${(-y * 2 * amplitude).toFixed(2)}deg`);
    node.style.setProperty('--tilt-y', `${(x * 2 * amplitude).toFixed(2)}deg`);
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.removeProperty('--tilt-x');
    event.currentTarget.style.removeProperty('--tilt-y');
  };

  return (
    <div className={className} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="tilt">{children}</div>
    </div>
  );
}
