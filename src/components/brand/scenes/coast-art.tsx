import { cn } from '@/lib/cn';
import type { SceneProps } from './scene';

/**
 * Signing in and joining: a coast road on a clifftop under a full moon, one car's headlights on it. Drawn
 * upright for the sign-in pages' tall side panel.
 */
export function CoastArt({ className, idPrefix = 'coast' }: SceneProps) {
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
          <stop offset="0" stopColor="#070E19" />
          <stop offset="0.38" stopColor="#10244A" />
          <stop offset="0.58" stopColor="#2B4A7E" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="640" cy="290" r="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D2E3FF" stopOpacity="0.45" />
          <stop offset="0.3" stopColor="#A7BFE4" stopOpacity="0.15" />
          <stop offset="1" stopColor="#A7BFE4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('moon')} cx="0.45" cy="0.4" r="0.65">
          <stop offset="0" stopColor="#F0F6FF" />
          <stop offset="1" stopColor="#C9D8F0" />
        </radialGradient>
        <linearGradient id={id('sea')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1C3862" />
          <stop offset="1" stopColor="#070E19" />
        </linearGradient>
        <linearGradient id={id('lights')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F0F6FF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#F0F6FF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1000" height="1100" fill={`url(#${id('sky')})`} />
      <rect width="1000" height="1100" fill={`url(#${id('glow')})`} />

      <g fill="#EEEEEE">
        <circle cx="90" cy="120" r="1.6" opacity="0.45" />
        <circle cx="230" cy="60" r="1.2" opacity="0.35" />
        <circle cx="330" cy="200" r="1.4" opacity="0.35" />
        <circle cx="470" cy="110" r="1" opacity="0.3" />
        <circle cx="860" cy="90" r="1.5" opacity="0.4" />
        <circle cx="940" cy="230" r="1.1" opacity="0.3" />
        <circle cx="160" cy="300" r="1" opacity="0.3" />
        <circle cx="820" cy="380" r="1.1" opacity="0.25" />
      </g>

      <circle cx="640" cy="290" r="62" fill={`url(#${id('moon')})`} />

      {/* Sea, a far headland, and the moon's path on the water */}
      <rect y="640" width="1000" height="460" fill={`url(#${id('sea')})`} />
      <path d="M680 642 C760 622 860 614 1000 618 L1000 642 Z" fill="#1A3360" />
      <g stroke="#E6EEFB" strokeLinecap="round" strokeWidth="3">
        <path d="M612 662 H668" strokeOpacity="0.45" />
        <path d="M596 690 H636 M648 690 H690" strokeOpacity="0.38" />
        <path d="M580 726 H630 M650 726 H706" strokeOpacity="0.3" />
        <path d="M560 772 H610 M626 772 H664 M680 772 H730" strokeOpacity="0.22" />
        <path d="M540 830 H600 M624 830 H690 M712 830 H756" strokeOpacity="0.15" />
        <path d="M520 900 H590 M616 900 H700 M724 900 H790" strokeOpacity="0.1" />
      </g>

      {/* Clifftop, with the coast road along its edge */}
      <path
        d="M0 520 C80 500 170 504 240 528 C310 552 370 596 420 640 C440 660 452 690 458 730 L470 1100 L0 1100 Z"
        fill="#0D1B33"
      />
      <path
        d="M0 520 C80 500 170 504 240 528 C310 552 370 596 420 640 C440 660 452 690 458 730"
        fill="none"
        stroke="#1E3964"
        strokeWidth="2"
      />
      <path
        d="M0 610 C90 592 190 600 270 630 C340 656 390 700 420 760 L432 800"
        fill="none"
        stroke="#2A4675"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M0 610 C90 592 190 600 270 630 C340 656 390 700 420 760 L432 800"
        fill="none"
        stroke="#EEEEEE"
        strokeOpacity="0.35"
        strokeWidth="2"
        strokeDasharray="10 14"
      />
      {/* The car's headlights */}
      <path d="M236 622 L380 600 L380 680 Z" fill={`url(#${id('lights')})`} transform="rotate(14 236 622)" />
      <circle cx="232" cy="620" r="5" fill="#F0F6FF" />
      <circle cx="222" cy="616" r="4" fill="#F0F6FF" opacity="0.8" />

      {/* A pohutukawa on the cliff */}
      <g fill="#081326">
        <path d="M118 512 L124 470 L130 470 L134 510 Z" />
        <circle cx="96" cy="458" r="26" />
        <circle cx="130" cy="446" r="32" />
        <circle cx="166" cy="460" r="24" />
        <circle cx="112" cy="476" r="20" />
        <circle cx="150" cy="478" r="18" />
      </g>

      <path d="M0 1100 V980 C200 960 400 992 600 1010 C760 1026 900 1000 1000 990 V1100 Z" fill="#060C17" />
    </svg>
  );
}
