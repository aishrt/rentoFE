import { cn } from '@/lib/cn';
import type { SceneProps } from './scene';

/**
 * Safety: a lighthouse on a headland at night, its beam sweeping slowly over a calm sea. Someone is keeping
 * watch, which is what the page is about.
 */
export function LighthouseArt({ className, idPrefix = 'lighthouse' }: SceneProps) {
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
          <stop offset="0" stopColor="#050B16" />
          <stop offset="0.45" stopColor="#0B1A33" />
          <stop offset="0.66" stopColor="#1A3560" />
        </linearGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15305A" />
          <stop offset="1" stopColor="#060D19" />
        </linearGradient>
        <linearGradient id={id('beam')} x1="1330" y1="0" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E0ECFF" stopOpacity="0.5" />
          <stop offset="0.45" stopColor="#C1D9FE" stopOpacity="0.16" />
          <stop offset="1" stopColor="#C1D9FE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('back-beam')} x1="1330" y1="0" x2="1600" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E0ECFF" stopOpacity="0.32" />
          <stop offset="1" stopColor="#C1D9FE" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('lamp')} cx="1330" cy="394" r="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F0F6FF" stopOpacity="0.75" />
          <stop offset="0.25" stopColor="#D2E3FF" stopOpacity="0.25" />
          <stop offset="1" stopColor="#D2E3FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('tower')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C9D8F0" />
          <stop offset="1" stopColor="#7F98C2" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id('sky')})`} />

      <g fill="#EEEEEE">
        <circle cx="90" cy="90" r="1.3" opacity="0.4" />
        <circle cx="210" cy="190" r="1" opacity="0.3" />
        <circle cx="380" cy="60" r="1.5" opacity="0.45" />
        <circle cx="560" cy="150" r="1.1" opacity="0.3" />
        <circle cx="720" cy="80" r="1.4" opacity="0.4" />
        <circle cx="900" cy="200" r="1" opacity="0.3" />
        <circle cx="1040" cy="110" r="1.6" opacity="0.5" />
        <circle cx="1180" cy="250" r="1.1" opacity="0.3" />
        <circle cx="1460" cy="140" r="1.4" opacity="0.4" />
        <circle cx="1560" cy="260" r="1" opacity="0.3" />
        <circle cx="640" cy="280" r="1" opacity="0.25" />
        <circle cx="300" cy="320" r="1.1" opacity="0.25" />
      </g>

      {/* Sea, with a far island on the horizon */}
      <rect y="598" width="1600" height="302" fill={`url(#${id('sea')})`} />
      <path d="M180 600 C240 588 300 584 360 588 C430 592 480 586 560 590 L620 600 Z" fill="#132A4D" />
      <g stroke="#C1D9FE" strokeLinecap="round">
        <path
          d="M120 652 H260 M420 640 H520 M700 676 H860 M300 724 H470 M600 772 H700"
          strokeOpacity="0.12"
        />
        <path d="M980 630 H1060 M900 700 H1000" strokeOpacity="0.16" />
      </g>
      {/* The lamp on the water */}
      <g stroke="#E0ECFF" strokeLinecap="round" strokeWidth="3">
        <path d="M1296 618 H1364" strokeOpacity="0.42" />
        <path d="M1280 646 H1340 M1352 646 H1382" strokeOpacity="0.34" />
        <path d="M1262 680 H1312 M1330 680 H1398" strokeOpacity="0.26" />
        <path d="M1240 722 H1300 M1324 722 H1360 M1376 722 H1420" strokeOpacity="0.18" />
        <path d="M1220 774 H1290 M1312 774 H1440" strokeOpacity="0.12" />
      </g>

      {/* The beam, sweeping */}
      <g className="origin-[1330px_394px] animate-sweep">
        <path d="M1330 386 L0 230 L0 560 L1330 402 Z" fill={`url(#${id('beam')})`} />
        <path d="M1330 388 L1600 330 L1600 450 L1330 400 Z" fill={`url(#${id('back-beam')})`} />
      </g>
      <rect width="1600" height="900" fill={`url(#${id('lamp')})`} />

      {/* Headland */}
      <path
        d="M1060 900 L1072 760 C1090 700 1130 660 1190 616 C1230 586 1270 566 1312 560 L1420 556 C1480 560 1530 580 1600 594 L1600 900 Z"
        fill="#0A1628"
      />
      <path
        d="M1072 760 C1090 700 1130 660 1190 616 C1230 586 1270 566 1312 560 L1420 556 C1480 560 1530 580 1600 594"
        fill="none"
        stroke="#1E3964"
        strokeWidth="2"
      />
      <path d="M1060 900 L1072 760 L1110 790 L1100 900 Z" fill="#081120" />
      <path d="M0 900 L0 860 C120 850 240 856 360 870 L420 900 Z" fill="#081120" />

      {/* Lighthouse */}
      <path d="M1308 560 L1316 420 L1344 420 L1352 560 Z" fill={`url(#${id('tower')})`} />
      <g fill="#1E3964">
        <path d="M1311 512 L1349 512 L1350 532 L1310 532 Z" />
        <path d="M1314 456 L1346 456 L1347 474 L1313 474 Z" />
      </g>
      <rect x="1306" y="412" width="48" height="8" rx="2" fill="#13294C" />
      <rect x="1318" y="382" width="24" height="30" fill="#F0F6FF" />
      <path d="M1318 386 H1342 M1330 382 V412" stroke="#7F98C2" strokeWidth="1.5" />
      <path d="M1314 382 C1316 366 1344 366 1346 382 Z" fill="#13294C" />
      <rect x="1328" y="356" width="4" height="12" rx="2" fill="#13294C" />
      <rect x="1360" y="536" width="34" height="22" fill="#13294C" />
      <path d="M1356 538 L1377 524 L1398 538 Z" fill="#13294C" />
      <rect x="1372" y="542" width="8" height="8" fill="#E0ECFF" opacity="0.7" />
    </svg>
  );
}
