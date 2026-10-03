import { cn } from '@/lib/cn';
import type { SceneProps } from './scene';

/**
 * How it works: a lit farmhouse on rolling hills before dawn, its driveway joining a road that winds away to a
 * glow on the horizon, with a route marked from the door to the far end. "From a local's driveway to the open
 * road." No peaks and no sun, so it doesn't repeat the home hero.
 */
export function JourneyArt({ className, idPrefix = 'journey' }: SceneProps) {
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
          <stop offset="0" stopColor="#060D18" />
          <stop offset="0.4" stopColor="#0E1F3B" />
          <stop offset="0.6" stopColor="#1C3864" />
          <stop offset="0.68" stopColor="#3A5A90" />
        </linearGradient>
        <radialGradient id={id('dawn')} cx="1180" cy="575" r="620" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D2E3FF" stopOpacity="0.6" />
          <stop offset="0.3" stopColor="#A7BFE4" stopOpacity="0.22" />
          <stop offset="1" stopColor="#A7BFE4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('window')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F0F6FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F0F6FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('road')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#0B1526" />
          <stop offset="1" stopColor="#24406C" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id('sky')})`} />
      <rect width="1600" height="900" fill={`url(#${id('dawn')})`} />

      <g fill="#EEEEEE">
        <circle cx="140" cy="110" r="1.4" opacity="0.45" />
        <circle cx="300" cy="200" r="1" opacity="0.3" />
        <circle cx="520" cy="80" r="1.5" opacity="0.4" />
        <circle cx="700" cy="170" r="1.1" opacity="0.3" />
        <circle cx="860" cy="60" r="1.3" opacity="0.35" />
        <circle cx="980" cy="240" r="1" opacity="0.25" />
        <circle cx="1240" cy="130" r="1.4" opacity="0.35" />
        <circle cx="1450" cy="220" r="1.2" opacity="0.3" />
        <circle cx="1540" cy="90" r="1" opacity="0.3" />
      </g>

      {/* Far downs, lit from behind */}
      <path
        d="M0 580 C180 560 360 550 540 562 C720 575 880 548 1060 538 C1240 528 1420 552 1600 545 L1600 900 L0 900 Z"
        fill="#2C4A7C"
        opacity="0.85"
      />
      {/* Paddocks */}
      <path
        d="M0 650 C180 624 360 612 540 628 C720 645 880 612 1040 600 C1210 588 1390 616 1600 602 L1600 900 L0 900 Z"
        fill="#183059"
      />
      <g fill="none" stroke="#2C4A7C" strokeOpacity="0.55" strokeWidth="1.5">
        <path d="M120 660 C300 640 470 636 620 652" />
        <path d="M1290 612 C1400 606 1500 610 1600 606" />
      </g>
      {/* The hill the house stands on */}
      <path
        d="M0 735 C220 712 420 704 620 720 C800 734 930 700 1070 680 C1210 660 1370 650 1600 662 L1600 900 L0 900 Z"
        fill="#0F2141"
      />
      <path
        d="M0 822 C260 800 520 806 760 826 C960 842 1180 828 1600 812 L1600 900 L0 900 Z"
        fill="#081120"
      />

      {/* Fence along the hill */}
      <g stroke="#1E3964" strokeWidth="3" strokeLinecap="round">
        <path d="M1440 640 V662 M1480 640 V662 M1520 640 V663 M1560 641 V664 M1600 642 V665" />
        <path d="M1440 648 L1600 650" strokeWidth="1.5" />
      </g>

      {/* The road, from the bottom of the frame to the glow */}
      <path
        d="M760 900 C880 822 1030 770 1110 722 C1168 688 1170 632 1176 568 L1186 568 C1194 632 1210 690 1206 728 C1196 790 1110 846 1040 900 Z"
        fill={`url(#${id('road')})`}
      />
      <g fill="none" strokeLinecap="round">
        <path
          d="M760 900 C880 822 1030 770 1110 722 C1168 688 1170 632 1176 568"
          stroke="#C1D9FE"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
        <path
          d="M1040 900 C1110 846 1196 790 1206 728 C1210 690 1194 632 1186 568"
          stroke="#C1D9FE"
          strokeOpacity="0.25"
          strokeWidth="1.5"
        />
      </g>

      {/* Tree and farmhouse */}
      <g fill="#081326">
        <circle cx="1252" cy="612" r="26" />
        <circle cx="1232" cy="628" r="20" />
        <circle cx="1272" cy="630" r="18" />
        <rect x="1248" y="630" width="7" height="26" />
        <path d="M1296 626 L1342 590 L1388 626 Z" />
        <rect x="1304" y="624" width="76" height="38" />
        <rect x="1360" y="584" width="10" height="24" />
      </g>
      <circle cx="1342" cy="642" r="46" fill={`url(#${id('window')})`} />
      <g fill="#F0F6FF">
        <rect x="1314" y="634" width="12" height="11" rx="1" opacity="0.9" />
        <rect x="1356" y="634" width="12" height="11" rx="1" opacity="0.75" />
        <rect x="1336" y="642" width="10" height="20" rx="1" opacity="0.5" />
      </g>

      {/* The route: out of the door, down the drive, along the road */}
      <path
        d="M1341 664 C1330 690 1270 700 1200 712 C1150 724 1060 772 960 822 C900 852 860 876 830 900"
        fill="none"
        stroke="#C1D9FE"
        strokeOpacity="0.7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="2 14"
      />
      <path
        d="M1200 712 C1178 690 1176 640 1181 572"
        fill="none"
        stroke="#C1D9FE"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 12"
      />

      {/* Waypoints: home, the turn onto the road, the far end */}
      <g fill="#C1D9FE">
        <circle cx="1200" cy="712" r="14" opacity="0.18" />
        <circle cx="1200" cy="712" r="6" />
        <circle cx="1181" cy="566" r="22" opacity="0.14" />
        <circle cx="1181" cy="566" r="9" opacity="0.3" />
        <circle cx="1181" cy="566" r="4.5" />
      </g>
      <g transform="translate(1342 578)">
        <path d="M0 0 C-9 -11 -15 -19 -15 -28 A15 15 0 1 1 15 -28 C15 -19 9 -11 0 0 Z" fill="#C1D9FE" />
        <circle cy="-28" r="5.5" fill="#0F2141" />
      </g>
    </svg>
  );
}
