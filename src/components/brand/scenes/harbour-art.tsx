import { cn } from '@/lib/cn';
import type { SceneProps } from './scene';

// x, y (the floor), width, height, and how many of its windows are lit.
const HOUSES: readonly (readonly [number, number, number, number, number])[] = [
  [760, 671, 34, 20, 1],
  [812, 658, 28, 18, 0],
  [856, 647, 40, 22, 2],
  [918, 632, 30, 20, 1],
  [966, 620, 36, 22, 1],
  [1022, 606, 30, 18, 2],
  [1072, 595, 42, 24, 1],
  [1136, 580, 30, 20, 2],
  [1186, 568, 36, 22, 0],
  [1244, 555, 30, 18, 1],
  [1294, 544, 40, 22, 2],
  [1356, 529, 30, 20, 1],
  [1410, 517, 36, 22, 1],
  [1470, 504, 30, 18, 2],
  [1526, 495, 38, 22, 1],
  [900, 662, 38, 22, 1],
  [1000, 640, 30, 20, 2],
  [1100, 622, 38, 22, 1],
  [1210, 600, 30, 20, 2],
  [1320, 578, 38, 22, 1],
  [1440, 556, 32, 20, 2],
  [1540, 540, 36, 22, 1],
  [960, 700, 36, 22, 1],
  [1060, 680, 30, 20, 2],
  [1180, 652, 38, 22, 1],
  [1290, 632, 30, 20, 0],
  [1390, 612, 38, 22, 2],
  [1500, 596, 32, 20, 1],
];

/**
 * About: a harbour town at dusk under a new moon, a hillside of houses with their lights on and their
 * reflections in the water. Cars from the people who live here.
 */
export function HarbourArt({ className, idPrefix = 'harbour' }: SceneProps) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <defs>
        <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#08101D" />
          <stop offset="0.42" stopColor="#112748" />
          <stop offset="0.66" stopColor="#2C4C80" />
        </linearGradient>
        <radialGradient id={id('dusk')} cx="760" cy="640" r="760" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A7BFE4" stopOpacity="0.35" />
          <stop offset="1" stopColor="#A7BFE4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('water')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1E3B68" />
          <stop offset="1" stopColor="#081120" />
        </linearGradient>
        <radialGradient id={id('moon-glow')} cx="1140" cy="280" r="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D2E3FF" stopOpacity="0.3" />
          <stop offset="1" stopColor="#D2E3FF" stopOpacity="0" />
        </radialGradient>
        <mask id={id('crescent')}>
          <rect width="1600" height="900" fill="white" />
          <circle cx="1158" cy="268" r="34" fill="black" />
        </mask>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id('sky')})`} />
      <rect width="1600" height="900" fill={`url(#${id('dusk')})`} />

      <g fill="#EEEEEE">
        <circle cx="160" cy="130" r="1.3" opacity="0.4" />
        <circle cx="340" cy="70" r="1.1" opacity="0.3" />
        <circle cx="520" cy="180" r="1.4" opacity="0.35" />
        <circle cx="700" cy="110" r="1" opacity="0.3" />
        <circle cx="900" cy="60" r="1.5" opacity="0.4" />
        <circle cx="1320" cy="120" r="1.2" opacity="0.35" />
        <circle cx="1500" cy="200" r="1" opacity="0.3" />
        <circle cx="1420" cy="290" r="1.1" opacity="0.25" />
      </g>

      <rect width="1600" height="900" fill={`url(#${id('moon-glow')})`} />
      <circle cx="1140" cy="280" r="36" fill="#E6EEFB" mask={`url(#${id('crescent')})`} />

      {/* The far side of the harbour */}
      <path
        d="M0 600 C120 574 240 560 380 568 C520 576 600 548 720 552 C820 556 880 580 940 600 L0 600 Z"
        fill="#1F3B69"
      />
      <g fill="#E6EEFB" opacity="0.5">
        <circle cx="210" cy="590" r="1.6" />
        <circle cx="260" cy="594" r="1.4" />
        <circle cx="430" cy="586" r="1.6" />
        <circle cx="610" cy="584" r="1.4" />
        <circle cx="660" cy="590" r="1.6" />
      </g>

      {/* Water */}
      <rect y="600" width="1600" height="300" fill={`url(#${id('water')})`} />
      <g stroke="#C1D9FE" strokeLinecap="round" strokeOpacity="0.12">
        <path d="M80 640 H220 M360 662 H500 M140 700 H300 M520 720 H640 M260 770 H420" />
      </g>
      {/* The moon on the water */}
      <g stroke="#E6EEFB" strokeLinecap="round" strokeWidth="3">
        <path d="M1110 612 H1170" strokeOpacity="0.3" />
        <path d="M1100 628 H1140 M1152 628 H1182" strokeOpacity="0.22" />
      </g>

      {/* The hills behind the town, then the town's own */}
      <path
        d="M780 650 C920 600 1080 548 1240 506 C1370 472 1490 448 1600 440 L1600 900 L780 900 Z"
        fill="#1B3561"
      />
      <path
        d="M640 900 L660 690 C760 660 900 630 1040 596 C1180 562 1320 522 1460 500 C1520 490 1570 486 1600 486 L1600 900 Z"
        fill="#10213F"
      />
      <path
        d="M660 690 C760 660 900 630 1040 596 C1180 562 1320 522 1460 500 C1520 490 1570 486 1600 486"
        fill="none"
        stroke="#2A4675"
        strokeWidth="2"
      />
      <path d="M640 900 L660 690 L700 700 L720 900 Z" fill="#0B1830" />

      {/* Houses, lights on */}
      {HOUSES.map(([x, y, w, h, lit]) => (
        <g key={`${x}-${y}`}>
          <path
            d={`M${x} ${y} V${y - h} L${x + w / 2} ${y - h - 12} L${x + w} ${y - h} V${y} Z`}
            fill="#1A3157"
          />
          {lit > 0 && <rect x={x + 6} y={y - h + 6} width="7" height="7" fill="#F3F7FF" opacity="0.9" />}
          {lit > 1 && (
            <rect x={x + w - 13} y={y - h + 6} width="7" height="7" fill="#F3F7FF" opacity="0.75" />
          )}
        </g>
      ))}
      {/* The wharf's lights on the water */}
      <g stroke="#F3F7FF" strokeLinecap="round" strokeWidth="2.5" strokeOpacity="0.2">
        <path d="M560 728 V760 M600 724 V744 M484 730 V770" />
      </g>

      {/* The wharf and a moored boat */}
      <path d="M540 690 H668 V696 H540 Z" fill="#0B1830" />
      <path d="M552 696 V716 M592 696 V716 M632 696 V716" stroke="#0B1830" strokeWidth="4" />
      <path d="M440 704 H520 L508 720 H452 Z" fill="#0B1830" />
      <path d="M480 704 V640 L512 698 Z" fill="#33558C" opacity="0.8" />
      <path d="M476 704 V634" stroke="#0B1830" strokeWidth="3" />
    </svg>
  );
}
