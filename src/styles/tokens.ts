/**
 * Design tokens (IMPLEMENTATION_PLAN.md §12.2 and §12.4).
 *
 * Colours are declared twice on purpose: here for code and tests, and in the `@theme` block of
 * globals.css, which is how Tailwind v4 builds its classes. `tokens.test.ts` fails if the two drift,
 * and checks every text colour pair against WCAG 2.2 AA. The email theme in the backend
 * (backend/src/emails/theme.ts) is a copy of these colours.
 */
export const colors = {
  primary: '#0E3B32',
  'primary-hover': '#0A2C25',
  gold: '#C8A96A',
  'gold-text': '#8A6A2E',
  ink: '#0B1210',
  muted: '#5E6662',
  canvas: '#FAF8F4',
  surface: '#FFFFFF',
  line: '#E7E2D9',
  success: '#1E8E5A',
  warning: '#C98A12',
  danger: '#C8372D',
} as const;

export type ColorToken = keyof typeof colors;

/** Text and background pairs the UI uses for body-size text; each must reach 4.5:1. */
export const textContrastPairs: ReadonlyArray<[text: ColorToken, background: ColorToken]> = [
  ['surface', 'primary'],
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['muted', 'canvas'],
  ['muted', 'surface'],
  ['gold-text', 'canvas'],
  ['gold-text', 'surface'],
  ['canvas', 'ink'],
  ['gold', 'ink'],
  ['gold', 'primary'],
  ['danger', 'surface'],
  ['danger', 'canvas'],
];

type Bezier = readonly [number, number, number, number];

export const motion = {
  duration: {
    micro: 0.12,
    short: 0.2,
    medium: 0.32,
    long: 0.7,
  },
  ease: {
    out: [0.22, 1, 0.36, 1] as Bezier,
    inOut: [0.65, 0, 0.35, 1] as Bezier,
  },
  spring: { type: 'spring', stiffness: 300, damping: 30 },
  /** Delay between list items; only the first `staggerLimit` items are staggered. */
  stagger: 0.06,
  staggerLimit: 6,
  /** Fade-up distance for scroll reveals, in px. */
  travel: 20,
} as const;
