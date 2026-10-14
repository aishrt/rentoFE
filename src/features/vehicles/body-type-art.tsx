import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { BodyType } from './vehicle-format';

/*
 * Each car faces right in a 120 × 52 box and stands on y = 48. `outline` traces the paint from the bottom of
 * the tail, over the roof, to the bottom of the nose; the wheel arches close it underneath.
 */
interface Shape {
  outline: string;
  /** The side windows, one subpath per pane. */
  glass?: string;
  /** The tail's and the nose's x. */
  ends: readonly [number, number];
  /** The rear and front wheels' x. */
  wheels: readonly [number, number];
  /** The bottom of the windows, which the crease along the doors follows. */
  belt: number;
  /** Bigger wheels, sitting higher in their arches: SUVs and utes. */
  tall?: boolean;
  /** Top-left corners of the headlight and the tail light. */
  head: readonly [number, number];
  tail: readonly [number, number];
  /** Drawn behind the paint (roof rails, seats) and on top of it (a tray, door seams). */
  under?: ReactNode;
  over?: ReactNode;
}

function RoofRails({ from, to, y }: { from: number; to: number; y: number }) {
  return (
    <g className="fill-ink/75">
      <rect x={from} y={y} width={to - from} height={1.8} rx={0.9} />
      <rect x={from + 3} y={y + 1} width={1.6} height={3} />
      <rect x={to - 4.6} y={y + 1} width={1.6} height={3} />
    </g>
  );
}

const SHAPES: Record<BodyType, Shape> = {
  HATCHBACK: {
    outline:
      'M14 38 L14.5 22 Q15 14 22 13 L58 12 Q63 12 66 15 L77 25 Q97 26 102 28.5 Q106 30 106 34 L106 39 Q106 42 103 42',
    glass: 'M24 25 L25 17.5 Q25.5 15.5 28 15.5 L44 15.2 V25 Z M46.5 25 V15.1 L59 15 Q61.5 15 63.5 17 L73 25 Z',
    ends: [14, 106],
    wheels: [33, 87],
    belt: 25,
    head: [97.5, 29.8],
    tail: [14.6, 24],
  },
  SEDAN: {
    outline:
      'M6 38 L6 30 Q6 27 9 26.5 L26 25.5 Q30 25 33 22 L41 15 Q43 13.5 46 13.5 L68 13.5 Q71 13.5 73 15.5 L83 25 Q104 26 110 28.5 Q114 30 114 34 L114 39 Q114 42 111 42',
    glass: 'M36 25 L42.5 18 Q44 16.5 46.5 16.5 L56 16.5 V25 Z M58.5 25 V16.5 L67 16.5 Q69 16.5 70.5 18 L79 25 Z',
    ends: [6, 114],
    wheels: [29, 91],
    belt: 25,
    head: [105.5, 29.8],
    tail: [6.4, 29.5],
  },
  WAGON: {
    outline:
      'M6 38 L6 22 Q6 15 12 14 L70 13.5 Q73 13.5 75 15.5 L85 25 Q104 26 110 28.5 Q114 30 114 34 L114 39 Q114 42 111 42',
    glass:
      'M10 25 V19 Q10 16.5 13 16.5 L32 16.5 V25 Z M34.5 25 V16.5 L54 16.5 V25 Z M56.5 25 V16.5 L69 16.5 Q71 16.5 72.5 18 L80 25 Z',
    ends: [6, 114],
    wheels: [29, 91],
    belt: 25,
    head: [105.5, 29.8],
    tail: [6.4, 22],
    under: <RoofRails from={16} to={64} y={10.6} />,
  },
  SUV: {
    outline:
      'M8 35 L8 15 Q8 9 14 8.5 L70 8 Q73 8 75 10 L85 20 Q104 21 109 23 Q112 24.5 112 28 L112 36 Q112 39 109 39',
    glass:
      'M12.5 20 V14 Q12.5 11.5 15.5 11.5 L33 11.5 V20 Z M35.5 20 V11.5 L54 11.5 V20 Z M56.5 20 V11.5 L69 11.5 Q71 11.5 72.5 13 L80 20 Z',
    ends: [8, 112],
    wheels: [30, 90],
    belt: 20,
    tall: true,
    head: [103.5, 24.2],
    tail: [8.4, 15],
    under: <RoofRails from={16} to={64} y={5.2} />,
  },
  UTE: {
    outline:
      'M6 35 L6 23 Q6 21 8 21 L46 21 L46 12 Q46 9 49 9 L70 9 Q73 9 75 11 L85 21 Q104 22 109 24 Q113 25.5 113 29 L113 36 Q113 39 110 39',
    glass: 'M50 20 V14.5 Q50 12.5 52 12.5 L60 12.5 V20 Z M62.5 20 V12.5 L69 12.5 Q71 12.5 72.5 14 L80 20 Z',
    ends: [6, 113],
    wheels: [29, 91],
    belt: 21,
    tall: true,
    head: [104.5, 25.4],
    tail: [6.4, 23.5],
    // The tray's open top, and the gap between the tray and the cab.
    over: (
      <>
        <rect x={8} y={21} width={37} height={2.4} rx={1} className="fill-ink/35" />
        <path d="M46 21.5 V35" strokeWidth={1} className="stroke-ink/25" />
      </>
    ),
  },
  VAN: {
    outline:
      'M6 38 L6 10 Q6 6 10 6 L82 6 Q86 6 88 9 L96 21 Q108 22.5 112 25 Q114 26.5 114 30 L114 39 Q114 42 111 42',
    glass: 'M75 20 V11.5 Q75 9.5 77 9.5 L84 9.5 Q86 9.5 87 11 L93 20 Z',
    ends: [6, 114],
    wheels: [27, 93],
    belt: 20,
    head: [106, 26],
    tail: [6.4, 24],
    // The sliding door's seams.
    over: <path d="M46 9 V38 M72 9 V38" strokeWidth={1} className="stroke-ink/25" />,
  },
  PEOPLE_MOVER: {
    outline:
      'M6 38 L6 15 Q6 9 12 8.5 L60 8 Q64 8 67 10.5 L88 25 Q105 26 110 28.5 Q114 30 114 34 L114 39 Q114 42 111 42',
    glass:
      'M10.5 25 V14 Q10.5 11.5 13.5 11.5 L29 11.5 V25 Z M31.5 25 V11.5 L49 11.5 V25 Z M51.5 25 V11.5 L59 11.5 Q62 11.5 64.5 13.5 L83.5 25 Z',
    ends: [6, 114],
    wheels: [29, 91],
    belt: 25,
    head: [105.5, 29.8],
    tail: [6.4, 18],
  },
  COUPE: {
    outline:
      'M6 38 L6 31 Q6 28 9 27.5 L18 27 Q24 26.5 30 22 L40 17 Q43 16 47 16 L64 16 Q68 16 71 18.5 L80 26 Q103 27 110 29.5 Q114 31 114 35 L114 39 Q114 42 111 42',
    glass: 'M34 26 L42 20.5 Q44.5 19 48 19 L63 19 Q65.5 19 67.5 20.5 L75 26 Z',
    ends: [6, 114],
    wheels: [28, 92],
    belt: 26,
    head: [105.5, 30.8],
    tail: [6.4, 30],
    // A little spoiler on the boot lid.
    over: <path d="M6.5 27.6 L5.5 25 Q5.5 24.2 6.5 24.2 L15 24.8 L15 27.2 Z" className="fill-ink/80" />,
  },
  CONVERTIBLE: {
    outline: 'M6 38 L6 30 Q6 27 9 27 L80 27 Q103 27.5 110 30 Q114 31.5 114 35 L114 39 Q114 42 111 42',
    ends: [6, 114],
    wheels: [28, 92],
    belt: 27,
    head: [105.5, 31.2],
    tail: [6.4, 29.5],
    // The folded roof, two seats and the windscreen, standing up out of an open top.
    under: (
      <>
        <rect x={10} y={23.5} width={16} height={6} rx={3} className="fill-ink/80" />
        <rect x={38} y={18.5} width={7} height={10} rx={2.5} className="fill-ink/70" />
        <rect x={54} y={18.5} width={7} height={10} rx={2.5} className="fill-ink/70" />
        <path d="M79 28 L70 16.5" strokeWidth={3} strokeLinecap="round" className="stroke-ink/80" />
        <path d="M79 28 L70 16.5" strokeWidth={1.4} strokeLinecap="round" className="stroke-accent" />
      </>
    ),
  },
};

/**
 * A cartoon of a body type, side on and facing right, in the brand blue with the 404 car's tinted glass: for
 * the vehicle type picker on Browse Cars. Decorative, so hidden from screen readers; its button says the type.
 */
export function BodyTypeArt({ type, className }: { type: BodyType; className?: string }) {
  const id = useId().replace(/[^\w-]/g, '');
  const shape = SHAPES[type];
  const [rear, front] = shape.ends;
  const [rearWheel, frontWheel] = shape.wheels;
  const sill = shape.tall ? 39 : 42;
  const radius = shape.tall ? 8.5 : 8;
  const arch = shape.tall ? 11.5 : 11;
  const arches = [frontWheel, rearWheel]
    .map((x) => `L${x + arch} ${sill} A${arch} ${arch} 0 0 0 ${x - arch} ${sill}`)
    .join(' ');
  const body = `${shape.outline} ${arches} L${rear + 3} ${sill} Q${rear} ${sill} ${rear} ${sill - 4} Z`;

  return (
    <svg viewBox="0 0 120 52" aria-hidden="true" focusable="false" className={cn('block h-auto', className)}>
      <defs>
        <linearGradient id={`${id}-paint`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" className="text-primary" />
          <stop offset="1" stopColor="currentColor" className="text-primary-hover" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" className="text-accent" />
          <stop offset="1" stopColor="currentColor" stopOpacity={0.7} className="text-ink" />
        </linearGradient>
      </defs>

      <ellipse cx={(rear + front) / 2} cy={48.2} rx={(front - rear) / 2 - 2} ry={2.4} className="fill-ink/10" />
      {shape.under}
      <path d={body} fill={`url(#${id}-paint)`} />
      {shape.glass && <path d={shape.glass} fill={`url(#${id}-glass)`} />}
      {shape.over}

      {/* A crease along the doors, a highlight on the shoulder, and the lights. */}
      <path
        d={`M${rearWheel + arch + 1.5} ${sill - 3.5} H${frontWheel - arch - 1.5}`}
        strokeWidth={1.6}
        strokeLinecap="round"
        className="stroke-ink/20"
      />
      <path
        d={`M${rear + 4} ${shape.belt + 3} L${front - 10} ${shape.belt + 3.5}`}
        strokeWidth={1}
        strokeLinecap="round"
        className="stroke-canvas/30"
      />
      <rect x={shape.head[0]} y={shape.head[1]} width={6} height={2.6} rx={1.3} className="fill-accent" />
      <rect x={shape.tail[0]} y={shape.tail[1]} width={2.2} height={4.5} rx={1} className="fill-danger" />

      {shape.wheels.map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy={48 - radius} r={radius} className="fill-ink" />
          <circle cx={cx} cy={48 - radius} r={radius * 0.55} className="fill-line" />
          <circle cx={cx} cy={48 - radius} r={radius * 0.2} className="fill-muted" />
        </g>
      ))}
    </svg>
  );
}
