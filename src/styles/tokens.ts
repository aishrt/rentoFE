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
  'gold-hover': '#D6BC86',
  'gold-text': '#8A6A2E',
  ink: '#0B1210',
  muted: '#5E6662',
  canvas: '#FAF8F4',
  surface: '#FFFFFF',
  line: '#E7E2D9',
  success: '#1E8E5A',
  warning: '#C98A12',
  danger: '#C8372D',
  'danger-hover': '#B02F26',
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
  // Button labels, including their hover states.
  ['ink', 'gold'],
  ['ink', 'gold-hover'],
  ['surface', 'danger-hover'],
];

type Bezier = readonly [number, number, number, number];

/**
 * Motion tokens (plan §12.4). CSS uses the same durations as Tailwind classes (duration-120, -200,
 * -320, -700); the design-system test rejects any other duration class.
 */
export const motion = {
  duration: {
    /** Hover, press, toggles. */
    micro: 0.12,
    /** Dropdowns, tooltips, toasts. */
    short: 0.2,
    /** Modals, sheets, page transitions, tab changes. */
    medium: 0.32,
    /** Hero and section entrances. */
    long: 0.7,
    /** Count-ups and progress fills: long enough to read as a tally. */
    count: 1.1,
  },
  ease: {
    out: [0.22, 1, 0.36, 1] as Bezier,
    inOut: [0.65, 0, 0.35, 1] as Bezier,
  },
  spring: {
    /** Drag, swipe, sheets and layout changes. */
    gentle: { type: 'spring', stiffness: 300, damping: 30 },
    /** Small, quick things such as the heart on a saved car. Settles without a visible bounce. */
    snappy: { type: 'spring', stiffness: 500, damping: 34 },
  },
  /** Delay between list items; only the first `staggerLimit` items are staggered. */
  stagger: 0.06,
  staggerLimit: 6,
  /** Delay between the words of a headline that rises in word by word. */
  wordStagger: 0.05,
  /** Fade-up distances in px: `sm` for small elements, `md` for scroll reveals, `lg` for panels. */
  travel: { sm: 12, md: 20, lg: 40 },
  /** Blur in px that headline words come into focus from (BlurText). */
  blur: 8,
} as const;
