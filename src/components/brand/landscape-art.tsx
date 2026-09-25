import { cn } from '@/lib/cn';

interface LandscapeArtProps {
  className?: string;
  /** Prefix for the SVG gradient ids; give each instance on the same page its own. */
  idPrefix?: string;
}

/**
 * An original illustration of an NZ road at dusk: layered alpine ridges, a low sun and a road
 * winding into the hills. It stands in for the hero photography and video until the client's
 * art direction is approved (plan §12.1), and weighs a few KB instead of a 2 MB video.
 */
export function LandscapeArt({ className, idPrefix = 'landscape' }: LandscapeArtProps) {
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
          <stop offset="0" stopColor="#06100D" />
          <stop offset="0.45" stopColor="#0B2A23" />
          <stop offset="0.72" stopColor="#1A4E41" />
          <stop offset="1" stopColor="#2E5D4F" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="1030" cy="350" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#E9CF94" stopOpacity="0.55" />
          <stop offset="0.35" stopColor="#C8A96A" stopOpacity="0.2" />
          <stop offset="1" stopColor="#C8A96A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('sun')} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#FFF4DA" />
          <stop offset="0.6" stopColor="#EED9A6" />
          <stop offset="1" stopColor="#C8A96A" />
        </radialGradient>
        <linearGradient id={id('mist')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAF8F4" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FAF8F4" stopOpacity="0.07" />
          <stop offset="1" stopColor="#FAF8F4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0A1A16" />
          <stop offset="1" stopColor="#173F35" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id('sky')})`} />
      <rect width="1600" height="900" fill={`url(#${id('glow')})`} />

      <g fill="#FAF8F4">
        <circle cx="180" cy="120" r="1.6" opacity="0.5" />
        <circle cx="320" cy="70" r="1.2" opacity="0.35" />
        <circle cx="470" cy="160" r="1.4" opacity="0.4" />
        <circle cx="610" cy="95" r="1" opacity="0.3" />
        <circle cx="90" cy="230" r="1.2" opacity="0.3" />
        <circle cx="1380" cy="110" r="1.3" opacity="0.35" />
        <circle cx="1500" cy="190" r="1" opacity="0.3" />
      </g>

      <circle cx="1030" cy="350" r="58" fill={`url(#${id('sun')})`} />

      {/* Far alpine range with snow on the highest peaks */}
      <path
        d="M0 520 L70 488 L130 505 L190 455 L240 478 L300 420 L350 452 L420 395 L470 430 L530 378 L585 418 L640 402 L700 440 L760 390 L820 350 L870 392 L930 372 L990 418 L1050 385 L1110 432 L1170 400 L1230 445 L1290 405 L1350 370 L1410 410 L1470 392 L1530 430 L1600 410 L1600 900 L0 900 Z"
        fill="#2F6154"
        opacity="0.6"
      />
      <g fill="#FAF8F4" opacity="0.22">
        <path d="M798 372 L820 350 L843 374 L832 370 L824 378 L815 368 L806 376 Z" />
        <path d="M512 396 L530 378 L548 398 L539 394 L531 401 L522 393 Z" />
        <path d="M1330 388 L1350 370 L1370 391 L1361 387 L1352 395 L1343 386 Z" />
        <path d="M404 411 L420 395 L437 413 L428 409 L421 415 L413 408 Z" />
      </g>

      <rect y="440" width="1600" height="190" fill={`url(#${id('mist')})`} />

      {/* Mid ridges */}
      <path
        d="M0 610 C90 575 170 560 260 585 C340 606 400 548 490 540 C570 533 640 575 720 580 C800 585 860 530 960 525 C1050 520 1090 560 1160 565 C1240 571 1300 520 1390 515 C1470 511 1540 545 1600 560 L1600 900 L0 900 Z"
        fill="#174237"
      />
      {/* Near hills */}
      <path
        d="M0 700 C140 660 280 650 420 675 C540 697 640 690 760 668 C880 646 1000 640 1120 662 C1240 684 1380 670 1480 648 C1540 636 1580 640 1600 645 L1600 900 L0 900 Z"
        fill="#0E2A23"
      />
      {/* Foreground */}
      <path
        d="M0 790 C200 760 380 770 560 800 C700 822 820 815 940 790 C1080 762 1240 758 1400 780 C1480 791 1560 800 1600 796 L1600 900 L0 900 Z"
        fill="#07140F"
      />

      {/* The road, winding towards the sun */}
      <path
        d="M510 900 C630 820 770 760 880 700 C950 662 1000 610 1025 572 L1035 572 C1020 612 990 668 940 712 C860 780 770 840 730 900 Z"
        fill={`url(#${id('road')})`}
      />
      <g fill="none" strokeLinecap="round">
        <path
          d="M510 900 C630 820 770 760 880 700 C950 662 1000 610 1025 572"
          stroke="#C8A96A"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path
          d="M730 900 C770 840 860 780 940 712 C990 668 1020 612 1035 572"
          stroke="#C8A96A"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path
          d="M620 900 C720 830 820 770 910 706 C970 664 1010 612 1030 572"
          stroke="#FAF8F4"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeDasharray="14 18"
        />
      </g>
    </svg>
  );
}
