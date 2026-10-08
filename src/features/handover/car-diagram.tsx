import type { MouseEvent } from 'react';
import { cn } from '@/lib/cn';
import { areaName } from './car-areas';

export interface DiagramPin {
  id: string;
  x: number;
  y: number;
  note?: string;
  /** Damage found at check-out or after, shown in the danger colour; earlier damage is grey. */
  isNew: boolean;
}

interface CarDiagramProps {
  pins: DiagramPin[];
  /** Tapping the car marks damage there; left out, the diagram only shows pins. */
  onAdd?: (x: number, y: number) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * A car seen from above, front at the top, with damage pinned where it is (spec §14). Pin positions are
 * percentages of the drawing, as the API stores them.
 */
export function CarDiagram({ pins, onAdd, selectedId, onSelect, className }: CarDiagramProps) {
  const add = (event: MouseEvent<SVGSVGElement>) => {
    if (!onAdd) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * 1000) / 10;
    const y = Math.round(((event.clientY - box.top) / box.height) * 1000) / 10;
    onAdd(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)));
  };

  return (
    <div className={cn('relative mx-auto w-full max-w-56', className)}>
      <p className="mb-1 text-center text-xs font-medium tracking-wide text-muted uppercase">Front</p>
      <svg
        viewBox="0 0 100 200"
        className={cn('block w-full text-ink', onAdd && 'cursor-crosshair')}
        onClick={add}
        role="img"
        aria-label={
          pins.length === 0
            ? 'A car seen from above, with no damage marked'
            : `A car seen from above, with damage marked at: ${pins.map((pin) => areaName(pin.x, pin.y)).join(', ')}`
        }
      >
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
          {/* Wheels, then the body over them. */}
          <rect x="7" y="34" width="10" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
          <rect x="83" y="34" width="10" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
          <rect x="7" y="146" width="10" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
          <rect x="83" y="146" width="10" height="22" rx="3" fill="currentColor" fillOpacity="0.5" />
          <path
            d="M50 4c17 0 30 6 31 22l3 50v62l-2 40c-1 13-13 18-32 18s-31-5-32-18l-2-40V76l3-50C19 10 33 4 50 4z"
            fill="var(--color-surface, #fff)"
          />
          {/* Windscreen, roof and rear window. */}
          <path d="M24 60c8-6 44-6 52 0l-5 22H29z" fill="currentColor" fillOpacity="0.1" />
          <path d="M29 82h42v62H29z" />
          <path d="M29 144h42l4 18c-8 5-42 5-50 0z" fill="currentColor" fillOpacity="0.1" />
          {/* Mirrors, doors and lights. */}
          <path d="M18 66l-7-3v8l7 1M82 66l7-3v8l-7 1" />
          <path d="M18 113h8M74 113h8" />
          <path d="M30 9c3 3 6 4 10 4M70 9c-3 3-6 4-10 4M31 194c3-2 6-3 9-3M69 194c-3-2-6-3-9-3" />
        </g>
        {pins.map((pin, index) => {
          const cx = pin.x;
          const cy = pin.y * 2;
          const selected = pin.id === selectedId;
          return (
            <g
              key={pin.id}
              onClick={(event) => {
                if (!onSelect) return;
                event.stopPropagation();
                onSelect(pin.id);
              }}
              className={cn(onSelect && 'cursor-pointer')}
            >
              <circle
                cx={cx}
                cy={cy}
                r={selected ? 6 : 5}
                className={pin.isNew ? 'fill-danger' : 'fill-ink/55'}
                stroke="white"
                strokeWidth="1.5"
              />
              <text x={cx} y={cy + 2.2} textAnchor="middle" fontSize="6" fontWeight="700" fill="white">
                {index + 1}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-xs font-medium tracking-wide text-muted uppercase">Rear</p>
    </div>
  );
}
