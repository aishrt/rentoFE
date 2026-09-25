/**
 * Design tokens (IMPLEMENTATION_PLAN.md §12.2 and §12.4).
 *
 * Colours are declared twice on purpose: here for code and tests, and in the `@theme` block of
 * globals.css, which is how Tailwind v4 builds its classes. `tokens.test.ts` fails if the two drift,
 * and checks every text colour pair against WCAG 2.2 AA. The email theme in the backend
 * (backend/src/emails/theme.ts) is a copy of these colours.
 */
export const colors = {
  primary: '#0254C2',
  'primary-hover': '#0045A2',
  accent: '#C1D9FE',
  'accent-hover': '#DFEBFE',
  ink: '#08101D',
  muted: '#5D6470',
  canvas: '#EEEEEE',
  surface: '#FFFFFF',
  line: '#D8DBE0',
  success: '#1E8E5A',
  warning: '#C98A12',
  danger: '#C4332A',
  'danger-hover': '#AD2B23',
} as const;

export type ColorToken = keyof typeof colors;

/** Text and background pairs the UI uses for body-size text; each must reach 4.5:1. */
export const textContrastPairs: ReadonlyArray<[text: ColorToken, background: ColorToken]> = [
  ['surface', 'primary'],
  ['canvas', 'primary'],
  ['primary', 'canvas'],
  ['primary', 'surface'],
  ['ink', 'canvas'],
  ['ink', 'surface'],
  ['muted', 'canvas'],
  ['muted', 'surface'],
  ['canvas', 'ink'],
  ['accent', 'ink'],
  ['accent', 'primary'],
  ['danger', 'surface'],
  ['danger', 'canvas'],
  // Button and badge labels, including their hover states.
  ['surface', 'primary-hover'],
  ['ink', 'accent'],
  ['ink', 'accent-hover'],
  ['primary', 'accent'],
  ['surface', 'danger'],
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
