import { cn } from '@/lib/cn';

// x of each neighbour's house along the street, its width and height.
const HOUSES: readonly (readonly [number, number, number])[] = [
  [820, 64, 44],
  [904, 86, 58],
  [1020, 70, 48],
  [1480, 76, 50],
];
const KERB = 330;

/**
 * Become a host: a street of houses in the evening, lights on, and one car parked under a carport, ready
 * to earn. Drawn in the current text colour, with lit windows in the accent, for the brand blue hero.
 */
export function StreetArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 420"
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <path
        d="M0 220 L120 180 L220 200 L340 140 L440 185 L560 150 L700 190 L820 130 L960 175 L1100 140 L1240 180 L1380 120 L1500 165 L1600 140 V420 H0 Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M0 300 C200 272 400 262 600 280 C800 298 1000 270 1200 258 C1380 248 1500 264 1600 260 V420 H0 Z"
        fill="currentColor"
        opacity="0.18"
      />

      {/* Trees */}
      <g fill="currentColor" opacity="0.3">
        <circle cx="990" cy="300" r="20" />
        <circle cx="1124" cy="288" r="30" />
        <circle cx="1450" cy="294" r="24" />
        <circle cx="1590" cy="290" r="28" />
      </g>

      {/* The neighbours */}
      <g fill="currentColor" opacity="0.4">
        {HOUSES.map(([x, w, h]) => (
          <path
            key={x}
            d={`M${x} ${KERB} V${KERB - h} L${x + w / 2} ${KERB - h - 26} L${x + w} ${KERB - h} V${KERB} Z`}
          />
        ))}
      </g>
      <g className="fill-accent" opacity="0.8">
        {HOUSES.map(([x, w, h]) => (
          <rect key={x} x={x + w / 2 - 8} y={KERB - h + 12} width="16" height="14" rx="1.5" />
        ))}
      </g>

      {/* The Host's house, carport and car */}
      <g fill="currentColor" opacity="0.5">
        <path d="M1170 330 V246 L1240 200 L1310 246 V330 Z" />
        <rect x="1306" y="252" width="132" height="10" />
        <rect x="1314" y="262" width="6" height="68" />
        <rect x="1426" y="262" width="6" height="68" />
      </g>
      <g className="fill-accent">
        <rect x="1190" y="262" width="26" height="22" rx="2" opacity="0.9" />
        <rect x="1262" y="262" width="26" height="22" rx="2" opacity="0.7" />
        <rect x="1228" y="292" width="22" height="38" rx="2" opacity="0.45" />
      </g>
      <g fill="currentColor" opacity="0.72">
        <path d="M1328 326 V306 C1328 300 1332 296 1338 295 L1352 293 L1368 278 C1371 275 1375 274 1379 274 H1402 C1407 274 1411 276 1414 280 L1424 294 C1428 296 1430 300 1430 305 V326 Z" />
        <circle cx="1350" cy="328" r="9" />
        <circle cx="1408" cy="328" r="9" />
      </g>
      <g className="fill-accent">
        <path d="M1372 280 H1388 V294 H1358 Z" opacity="0.55" />
        <path d="M1394 280 H1404 C1407 280 1409 282 1411 284 L1418 294 H1394 Z" opacity="0.55" />
        <rect x="1424" y="300" width="6" height="5" rx="1" />
      </g>

      {/* The street */}
      <rect y={KERB} width="1600" height={420 - KERB} fill="currentColor" opacity="0.42" />
      <path d="M1316 330 L1432 330 L1452 360 L1300 360 Z" className="fill-accent" opacity="0.14" />
      <path
        d="M0 384 H1600"
        className="stroke-accent"
        strokeOpacity="0.45"
        strokeWidth="4"
        strokeDasharray="36 30"
      />
    </svg>
  );
}
