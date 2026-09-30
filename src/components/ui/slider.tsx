import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';

interface SliderProps {
  /** One value for a single thumb, or two for a range such as a price from–to. */
  value: readonly number[];
  /** While dragging or pressing keys, on every step. */
  onValueChange: (value: number[]) => void;
  /** When a drag ends, or after each key press: the moment to run a search. */
  onValueCommit?: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  /** Names each thumb for screen readers, e.g. ["Minimum price", "Maximum price"]. */
  thumbLabels: readonly string[];
  /** How screen readers hear a value, e.g. "$150 a day". */
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * A slider with one or two thumbs, e.g. the price range filter (plan §12.3). Drag a thumb, or press
 * anywhere on the track to move the nearest one there. Each thumb follows the WAI-ARIA slider pattern:
 * arrow keys move a step, Page Up and Page Down ten steps, Home and End to the ends. The two thumbs never
 * cross. Each thumb has a 44 px touch area around its 24 px handle.
 */
export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step = 1,
  thumbLabels,
  formatValue,
  disabled = false,
  className,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  // The values as a drag leaves them, for the commit when it ends.
  const dragValues = useRef<number[] | null>(null);

  const span = max - min || 1;
  const percent = (amount: number) => ((clamp(amount, min, max) - min) / span) * 100;
  const snap = (amount: number) => clamp(Math.round((amount - min) / step) * step + min, min, max);

  /** `base` with thumb `index` moved to `amount`, kept between its neighbours. */
  const moved = (base: readonly number[], index: number, amount: number): number[] => {
    const next = [...base];
    const low = index > 0 ? (next[index - 1] ?? min) : min;
    const high = index < next.length - 1 ? (next[index + 1] ?? max) : max;
    next[index] = clamp(snap(amount), low, high);
    return next;
  };

  const update = (index: number, amount: number) => {
    const base = dragValues.current ?? value;
    const next = moved(base, index, amount);
    if (next.every((item, position) => item === base[position])) return;
    dragValues.current = next;
    onValueChange(next);
  };

  const valueAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return min;
    return min + clamp((clientX - rect.left) / rect.width, 0, 1) * span;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    const amount = valueAt(event.clientX);
    // The nearest thumb takes the press; on a tie, the one on the side the press is on.
    let index = 0;
    value.forEach((thumb, position) => {
      const current = value[index] ?? min;
      const closer = Math.abs(thumb - amount) < Math.abs(current - amount);
      const tieOnRight = thumb === current && amount > thumb;
      if (closer || tieOnRight) index = position;
    });
    setActive(index);
    dragValues.current = [...value];
    event.currentTarget.setPointerCapture?.(event.pointerId);
    thumbRefs.current[index]?.focus();
    update(index, amount);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (active === null) return;
    update(active, valueAt(event.clientX));
  };

  const endDrag = () => {
    if (active === null) return;
    setActive(null);
    onValueCommit?.(dragValues.current ?? [...value]);
    dragValues.current = null;
  };

  const onThumbKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
    const current = value[index] ?? min;
    const moves: Record<string, number | undefined> = {
      ArrowRight: current + step,
      ArrowUp: current + step,
      ArrowLeft: current - step,
      ArrowDown: current - step,
      PageUp: current + step * 10,
      PageDown: current - step * 10,
      Home: min,
      End: max,
    };
    const target = moves[event.key];
    if (target === undefined || disabled) return;
    event.preventDefault();
    const next = moved(value, index, target);
    if (next.every((item, position) => item === value[position])) return;
    onValueChange(next);
    onValueCommit?.(next);
  };

  const [first = min, second] = value;
  const fillStart = second === undefined ? 0 : percent(first);
  const fillEnd = percent(second ?? first);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-disabled={disabled || undefined}
      className={cn(
        'relative flex h-11 touch-none select-none items-center px-3',
        disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        className,
      )}
    >
      <div ref={trackRef} className="relative h-1.5 w-full rounded-full bg-ink/10">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 rounded-full bg-primary"
          style={{ left: `${fillStart}%`, right: `${100 - fillEnd}%` }}
        />
        {value.map((thumb, index) => (
          <div
            key={index}
            ref={(node) => {
              thumbRefs.current[index] = node;
            }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-label={thumbLabels[index]}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={thumb}
            aria-valuetext={formatValue?.(thumb)}
            aria-orientation="horizontal"
            aria-disabled={disabled || undefined}
            data-active={active === index || undefined}
            onKeyDown={(event) => onThumbKeyDown(index, event)}
            className="group/thumb absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none data-active:z-10"
            style={{ left: `${percent(thumb)}%` }}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-6 rounded-full border-2 border-primary bg-surface shadow-card transition-[scale] duration-120 ease-out',
                'group-focus-visible/thumb:ring-4 group-focus-visible/thumb:ring-primary/20',
                !disabled && 'group-hover/thumb:scale-110 group-data-active/thumb:scale-95',
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
