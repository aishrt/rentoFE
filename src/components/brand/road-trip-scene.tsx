import { useId } from 'react';
import { cn } from '@/lib/cn';

/** Stars as [top %, left %, twinkle delay in s]. */
const STARS: ReadonlyArray<readonly [number, number, number]> = [
  [8, 6, 0],
  [15, 17, 1.2],
  [5, 29, 0.6],
  [21, 38, 2],
  [9, 52, 0.3],
  [4, 66, 1.6],
  [18, 74, 0.9],
  [7, 90, 2.4],
  [27, 9, 1.8],
  [31, 94, 0.4],
  [25, 58, 2.2],
  [13, 45, 1],
];

/* Hill silhouettes that start and end at the same height, so two copies side by side tile without a seam. */
const FAR_RIDGE =
  'M0 64 L30 50 L55 58 L90 28 L118 46 L150 30 L184 52 L214 24 L248 48 L280 36 L318 56 L350 34 L380 52 L400 64 V100 H0 Z';
const NEAR_RIDGE = 'M0 74 C40 60 80 52 120 60 S200 78 250 66 S340 52 400 74 V100 H0 Z';

/** A strip of hills twice the scene's width that pans left and loops. */
function Hills({ path, className, strip }: { path: string; className: string; strip: string }) {
  return (
    <div className={cn('absolute inset-x-0', className)}>
      <div className={cn('flex h-full w-[200%]', strip)}>
        {[0, 1].map((copy) => (
          <svg key={copy} viewBox="0 0 400 100" preserveAspectRatio="none" className="h-full w-1/2 shrink-0">
            <path d={path} fill="currentColor" />
          </svg>
        ))}
      </div>
    </div>
  );
}

/* The car faces right, in a 330 × 92 box: the body spans x 10–212, and the headlight beam fills the rest. */
const BODY =
  'M10 66 L10 52 Q10 43 21 41 L46 38 Q60 22 82 19 L132 18 Q146 18 156 27 L170 38 L200 42 Q212 45 212 55 L212 63 Q212 68 206 68 L191 68 A19 19 0 0 0 153 68 L75 68 A19 19 0 0 0 37 68 L15 68 Q10 68 10 63 Z';
const REAR_WINDOW = 'M52 38 Q64 25 83 23 L106 23 L106 38 Z';
const FRONT_WINDOW = 'M112 23 L131 23 Q142 23 150 30 L160 38 L112 38 Z';
const WHEEL_Y = 68;

/** A tyre with a five-spoke rim; the rim and tread turn, the tyre's outline stays put. */
function Wheel({ cx }: { cx: number }) {
  return (
    <g>
      <circle cx={cx} cy={WHEEL_Y} r={15} className="fill-ink" />
      <g className="origin-center animate-wheel-spin transform-fill">
        <circle
          cx={cx}
          cy={WHEEL_Y}
          r={13.5}
          fill="none"
          strokeWidth={2}
          strokeDasharray="3 3.2"
          className="stroke-canvas/15"
        />
        <circle cx={cx} cy={WHEEL_Y} r={9} className="fill-line" />
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d={`M${cx} ${WHEEL_Y} V${WHEEL_Y - 7.5}`}
            transform={`rotate(${angle} ${cx} ${WHEEL_Y})`}
            strokeWidth={2.6}
            strokeLinecap="round"
            className="stroke-muted"
          />
        ))}
        <circle cx={cx} cy={WHEEL_Y} r={2.6} className="fill-ink/70" />
      </g>
    </g>
  );
}

function Car() {
  const id = useId().replace(/[^\w-]/g, '');
  const paint = `${id}-paint`;
  const glass = `${id}-glass`;
  const beam = `${id}-beam`;
  const puff = `${id}-puff`;

  return (
    <svg viewBox="0 0 330 92" className="block h-auto w-full overflow-visible">
      <defs>
        <linearGradient id={paint} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" className="text-primary" />
          <stop offset="1" stopColor="currentColor" className="text-primary-hover" />
        </linearGradient>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.6} className="text-accent" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity={0.92} className="text-ink" />
        </linearGradient>
        {/* Eases out (a straight fade leaves a visible line where it ends) well before the cone's far edge. */}
        <linearGradient id={beam} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.5} className="text-accent" />
          <stop offset="0.3" stopColor="currentColor" stopOpacity={0.24} className="text-accent" />
          <stop offset="0.55" stopColor="currentColor" stopOpacity={0.09} className="text-accent" />
          <stop offset="0.75" stopColor="currentColor" stopOpacity={0.025} className="text-accent" />
          <stop offset="0.9" stopColor="currentColor" stopOpacity={0} className="text-accent" />
        </linearGradient>
        <radialGradient id={puff}>
          <stop offset="0" stopColor="currentColor" stopOpacity={0.8} className="text-canvas" />
          <stop offset="1" stopColor="currentColor" stopOpacity={0} className="text-canvas" />
        </radialGradient>
      </defs>

      {/* Soft puffs of exhaust that drift back, swell and fade, one after another. */}
      {[0, 0.5, 1].map((delay) => (
        <circle
          key={delay}
          cx={9}
          cy={63}
          r={4}
          fill={`url(#${puff})`}
          className="origin-center animate-exhaust opacity-0 transform-fill"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}

      {/* The body rides gently on its suspension; the wheels stay on the road. */}
      <g className="animate-car-bob">
        {/* The headlight's cone, dipped towards the road ahead. */}
        <path d="M206 49 L330 40 L330 88 Z" fill={`url(#${beam})`} className="animate-beam" />
        <path d={BODY} fill={`url(#${paint})`} />
        <path
          d="M22 44 L198 46"
          fill="none"
          strokeWidth={1.2}
          strokeLinecap="round"
          className="stroke-canvas/25"
        />
        <path d={REAR_WINDOW} fill={`url(#${glass})`} />
        <path d={FRONT_WINDOW} fill={`url(#${glass})`} />
        <path d="M109 41 V64" strokeWidth={1} className="stroke-ink/25" />
        <rect x={88} y={47} width={9} height={2.2} rx={1.1} className="fill-canvas/40" />
        <rect x={138} y={47} width={9} height={2.2} rx={1.1} className="fill-canvas/40" />
        <path d="M156 35 L164 34 L165 39 L159 40 Z" className="fill-primary-hover" />
        <path d="M78 61 H150" strokeWidth={3} strokeLinecap="round" className="stroke-ink/30" />
        <path d="M199 46 L210 48 Q212 52 207 53 L199 51 Z" className="fill-accent" />
        <path d="M11 46 L17 45 L17 51 L11 52 Z" className="fill-danger" />
      </g>

      <Wheel cx={56} />
      <Wheel cx={172} />
    </svg>
  );
}

/**
 * A night drive for the 404 page, drawn in SVG and moved by CSS alone: the car drives in, then cruises with
 * its wheels turning and its body riding the suspension, while lane markings and marker posts stream past
 * and two ranges of hills pan behind at their own speeds. A giant 404 glows on the horizon. With reduced
 * motion it is a still picture. Decorative, so hidden from screen readers; the page says what happened.
 */
export function RoadTripScene({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('@container relative isolate overflow-hidden bg-ink', className)}>
      {/* Sky, lightening towards a glow on the horizon */}
      <div className="absolute inset-0 bg-linear-to-b from-ink via-ink to-primary/60" />
      <div className="absolute inset-0 bg-radial-[at_50%_78%] from-accent/25 to-transparent to-60%" />
      <span className="absolute top-[12%] right-[9%] size-7 rounded-full bg-accent/85 ring-8 ring-accent/10 sm:size-9" />
      {STARS.map(([top, left, delay]) => (
        <span
          key={`${top}-${left}`}
          className="absolute size-0.5 animate-twinkle rounded-full bg-canvas opacity-60"
          style={{ top: `${top}%`, left: `${left}%`, animationDelay: `${delay}s` }}
        />
      ))}

      <span className="headline absolute inset-x-0 bottom-[20%] bg-linear-to-b from-accent/50 to-accent/0 bg-clip-text text-center text-numeral font-medium tracking-tight text-transparent select-none">
        404
      </span>

      <Hills path={FAR_RIDGE} className="bottom-[29%] h-[34%] text-primary/45" strip="animate-pan-far" />
      <Hills path={NEAR_RIDGE} className="bottom-[29%] h-[20%] text-ink/85" strip="animate-pan-near" />

      {/* The road, its marker posts and the dashed centre line */}
      <div className="roadside-posts absolute bottom-[30%] left-0 h-3 w-[calc(100%+12rem)] animate-roadside text-canvas/30" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] border-t border-canvas/10 bg-ink">
        <div className="road-dashes absolute top-[58%] left-0 h-1 w-[calc(100%+6rem)] animate-road-dashes text-accent/45" />
      </div>

      <div className="absolute bottom-[6%] left-[5%] w-[64cqw] max-w-[27rem] animate-drive-in">
        <Car />
      </div>
    </div>
  );
}
