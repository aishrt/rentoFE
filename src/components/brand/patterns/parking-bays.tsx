import { cn } from '@/lib/cn';

const BAYS = Array.from({ length: 22 }, (_, bay) => -60 + bay * 84);
// Which bays have a car in them, top row then bottom row.
const PARKED_TOP = new Set([3, 4, 8, 12, 13, 15, 18]);
const PARKED_BOTTOM = new Set([1, 6, 9, 10, 14, 17, 19]);

/** A car seen from above, nose up, centred on 0 0. */
const CAR =
  'M-20 -38 C-20 -44 -14 -48 -8 -48 H8 C14 -48 20 -44 20 -38 V38 C20 44 14 48 8 48 H-8 C-14 48 -20 44 -20 38 Z ' +
  'M-15 -22 C-6 -26 6 -26 15 -22 L13 -10 C5 -12 -5 -12 -13 -10 Z M-13 22 C-5 24 5 24 13 22 L14 30 C5 33 -5 33 -14 30 Z';

/** The Host's pages: a car park seen from above, angled bays with cars in some. In the current text colour. */
export function ParkingBays({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1600 480"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
      className={cn('block', className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        {BAYS.map((x) => (
          <path key={x} d={`M${x} 30 L${x + 60} 170 M${x + 60} 310 L${x} 450`} />
        ))}
        <path d="M-20 240 H1620" strokeWidth="2" strokeDasharray="30 26" />
      </g>
      <g fill="currentColor" fillRule="evenodd" opacity="0.6">
        {BAYS.map((x, bay) => (
          <g key={x}>
            {PARKED_TOP.has(bay) && <path d={CAR} transform={`translate(${x + 72} 100) rotate(-23)`} />}
            {PARKED_BOTTOM.has(bay) && <path d={CAR} transform={`translate(${x + 72} 380) rotate(23)`} />}
          </g>
        ))}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M380 228 L396 240 L380 252 M1100 228 L1116 240 L1100 252" />
      </g>
    </svg>
  );
}
