import { cn } from '@/lib/cn';
import type { SceneProps } from './scene';

// x, width and height of each building; their floors line up at SKYLINE.
const BUILDINGS: readonly (readonly [number, number, number])[] = [
  [0, 90, 150],
  [96, 70, 230],
  [172, 110, 180],
  [290, 80, 300],
  [376, 96, 210],
  [480, 70, 260],
  [556, 46, 130],
  [618, 64, 170],
  [690, 90, 240],
  [786, 70, 330],
  [862, 110, 190],
  [978, 40, 140],
];
const SKYLINE = 780;
const FLOOR = 26;
const BAY = 22;

// Some windows lit, in a pattern that looks random but draws the same every time.
const WINDOWS = BUILDINGS.flatMap(([x, w, h], building) => {
  const lit: [number, number][] = [];
  for (let floor = 1; floor * FLOOR < h - 14; floor++) {
    for (let bay = 0; bay * BAY + 18 < w; bay++) {
      if ((building * 7 + floor * 5 + bay * 3) % 4 === 0)
        lit.push([x + 10 + bay * BAY, SKYLINE - floor * FLOOR]);
    }
  }
  return lit;
});

/**
 * The staff portal: the city at night with its tower, office lights on late, and the motorway's light
 * trails below. Everything keeps moving. Drawn upright for the sign-in pages' tall side panel.
 */
export function CityArt({ className, idPrefix = 'city' }: SceneProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <svg
      viewBox="0 0 1000 1100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060C17" />
          <stop offset="0.45" stopColor="#0F2140" />
          <stop offset="0.7" stopColor="#264573" />
        </linearGradient>
        <radialGradient id={id('haze')} cx="560" cy="760" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A7BFE4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#A7BFE4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#172F55" />
          <stop offset="1" stopColor="#081120" />
        </linearGradient>
      </defs>

      <rect width="1000" height="1100" fill={`url(#${id('sky')})`} />
      <rect width="1000" height="1100" fill={`url(#${id('haze')})`} />

      <g fill="#EEEEEE">
        <circle cx="120" cy="110" r="1.4" opacity="0.4" />
        <circle cx="300" cy="60" r="1.1" opacity="0.3" />
        <circle cx="420" cy="180" r="1.3" opacity="0.35" />
        <circle cx="760" cy="90" r="1.5" opacity="0.4" />
        <circle cx="900" cy="210" r="1" opacity="0.3" />
        <circle cx="200" cy="260" r="1" opacity="0.25" />
      </g>

      {/* The tower */}
      <g fill="#1A3157">
        <rect x="593" y="300" width="14" height={SKYLINE - 300} />
        <path d="M580 420 H620 L628 436 L620 452 H580 L572 436 Z" />
        <rect x="586" y="404" width="28" height="12" rx="4" />
        <rect x="598" y="212" width="4" height="90" />
      </g>
      <g fill="#E6EEFB">
        <rect x="578" y="432" width="44" height="4" opacity="0.8" />
        <circle cx="600" cy="212" r="3.5" className="animate-twinkle" />
      </g>

      {/* Buildings and their lights */}
      <g fill="#10213F">
        {BUILDINGS.map(([x, w, h]) => (
          <rect key={x} x={x} y={SKYLINE - h} width={w} height={h} />
        ))}
      </g>
      <g fill="#E6EEFB" opacity="0.75">
        {WINDOWS.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="10" height="8" />
        ))}
      </g>

      {/* Harbour */}
      <rect y={SKYLINE} width="1000" height="320" fill={`url(#${id('water')})`} />
      <g stroke="#E6EEFB" strokeLinecap="round" strokeWidth="2.5" strokeOpacity="0.16">
        <path d="M120 806 H180 M330 800 H370 M520 812 H580 M600 800 V860 M820 806 H880" />
        <path d="M60 840 H100 M260 846 H320 M720 840 H780 M900 850 H950" />
      </g>

      {/* Motorway with its light trails */}
      <path d="M0 920 C260 880 560 880 1000 940 L1000 1100 L0 1100 Z" fill="#081120" />
      <g fill="none" strokeLinecap="round">
        <path d="M0 960 C280 920 580 924 1000 984" stroke="#F0F6FF" strokeOpacity="0.55" strokeWidth="3" />
        <path d="M0 974 C280 936 580 940 1000 1000" stroke="#F0F6FF" strokeOpacity="0.3" strokeWidth="2" />
        <path
          d="M0 1012 C300 976 600 984 1000 1046"
          stroke="#EEEEEE"
          strokeOpacity="0.25"
          strokeWidth="2"
          strokeDasharray="14 18"
        />
        <path d="M0 1046 C300 1010 600 1020 1000 1084" stroke="#C1D9FE" strokeOpacity="0.6" strokeWidth="3" />
        <path
          d="M0 1060 C300 1026 600 1036 1000 1100"
          stroke="#C1D9FE"
          strokeOpacity="0.32"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
