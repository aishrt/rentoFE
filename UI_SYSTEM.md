# Rento Vroom UI system

How the website looks and moves, and how to build new screens that match. The design intent is in [IMPLEMENTATION_PLAN.md §12](../IMPLEMENTATION_PLAN.md): luxurious, calm and confident; ivory, ink and pounamu green, with champagne gold used sparingly; quiet, quick motion.

## Rules

These are checked by tests, so a pull request that breaks them fails.

1. **No hardcoded design values in components.** No hex colours and no arbitrary `text-[…]`, `leading-[…]`, `rounded-[…]`, `shadow-[…]`, `z-[…]`, `duration-[…]` and so on. Use a token, or add one. Layout values such as `grid-cols-[…]` or `max-w-[26rem]` are fine. (`src/styles/design-system.test.ts`)
2. **Only the four motion durations:** `duration-120`, `-200`, `-320`, `-700`. (same test)
3. **Every text colour pair passes WCAG AA (4.5:1).** Add new pairs to `textContrastPairs` in `tokens.ts`. (`src/styles/tokens.test.ts`)
4. **Colours live in two places on purpose:** `tokens.ts` for code and tests, and the `@theme` block of `globals.css` for Tailwind. The token test fails if they drift apart.

And by convention:

- **Animate only `transform` and `opacity`** (in Tailwind v4, the `translate`, `scale` and `rotate` properties count as transform). When you add `active:scale-*` or `hover:translate-*`, include `scale` or `translate` in the element's transition list, or the change snaps instead of easing. The one exception is `BlurText`, which also animates a small `filter: blur()` on a few headline words, once.
- **Respect reduced motion.** The global rule in `globals.css` shortens every CSS animation and transition, and `MotionConfig reducedMotion="user"` turns Motion's movement into fades. Anything else, such as SVG path drawing, must check `useReducedMotion()` (see `CheckDraw`).
- **Blur only on sticky bars** (header, booking bar). It is expensive on budget phones.
- **Touch targets are at least 44 × 44 px.**
- **Watch the budget.** The homepage's first load is limited to 170 KB of gzipped JavaScript (plan §12.5). Prefer CSS to JavaScript for motion.

## Tokens

Defined in [`src/styles/globals.css`](src/styles/globals.css) (the `@theme` block) and [`src/styles/tokens.ts`](src/styles/tokens.ts).

### Colour

| Token                                             | Value                 | Use                                                                                       |
| ------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `primary` / `primary-hover`                       | `#0E3B32` / `#0A2C25` | Pounamu green: primary buttons, links, brand                                              |
| `gold` / `gold-hover`                             | `#C8A96A` / `#D6BC86` | Champagne: thin rules, icons and highlights on dark or green. Too light for text on ivory |
| `gold-text`                                       | `#8A6A2E`             | Gold text on light backgrounds                                                            |
| `ink`                                             | `#0B1210`             | Text, dark sections                                                                       |
| `muted`                                           | `#5E6662`             | Secondary text                                                                            |
| `canvas` / `surface`                              | `#FAF8F4` / `#FFFFFF` | Page background / cards                                                                   |
| `line`                                            | `#E7E2D9`             | Hairlines and dividers                                                                    |
| `success` · `warning` · `danger` / `danger-hover` |                       | States                                                                                    |

Destination backgrounds are gradient tokens, used as `tone-queenstown`, `tone-auckland`, `tone-christchurch`, `tone-wellington` and `tone-rotorua`.

### Type

Fraunces (`headline` utility, with −0.02em tracking) for headings, Inter for everything else. Headings use the named scale; body and UI text use Tailwind's `text-xs` to `text-2xl`.

| Class          | Size                     | Use                                             |
| -------------- | ------------------------ | ----------------------------------------------- |
| `text-display` | 40 → 72 px, fluid        | Home hero                                       |
| `text-title-1` | 36 → 56 px               | Standalone page titles                          |
| `text-title-2` | 32 → 44 px               | Section headings                                |
| `text-title-3` | 30 → 36 px               | Compact page titles: log-in, errors, dashboards |
| `text-stat`    | 32 px                    | Dashboard figures                               |
| `text-ui`      | 15 px                    | Navigation links, medium buttons                |
| `eyebrow`      | 12 px, uppercase, 0.08em | Small labels above headings                     |

```tsx
<h1 className="headline text-title-3 font-medium">Welcome back</h1>
<p className="eyebrow text-gold-text">Popular destinations</p>
```

### Radius, shadow and highlight

| Token                                          | Value              | Use                                          |
| ---------------------------------------------- | ------------------ | -------------------------------------------- |
| `rounded-inner`                                | 8 px               | Elements nested inside a control             |
| `rounded-control`                              | 10 px              | Inputs, buttons, menu items                  |
| `rounded-card`                                 | 16 px              | Cards                                        |
| `rounded-sheet`                                | 24 px              | Sheets, modals, raised panels                |
| `shadow-input` · `shadow-card` · `shadow-lift` |                    | Input edge · resting card · hover and raised |
| `inset-shadow-highlight`                       | 1px white top edge | Coloured buttons and dark panels             |

### Motion

In `tokens.ts` as `motion`, for use with Motion (`motion/react`):

| Token                                      | Value                   | Use                                                                 |
| ------------------------------------------ | ----------------------- | ------------------------------------------------------------------- |
| `duration.micro`                           | 120 ms                  | Hover, press, toggles                                               |
| `duration.short`                           | 200 ms                  | Dropdowns, toasts                                                   |
| `duration.medium`                          | 320 ms                  | Modals, sheets, page and tab changes                                |
| `duration.long`                            | 700 ms                  | Hero and section entrances                                          |
| `duration.count`                           | 1.1 s                   | Count-ups and progress fills                                        |
| `ease.out` / `ease.inOut`                  |                         | Entrances / moves on screen (also `ease-out`, `ease-in-out` in CSS) |
| `spring.gentle` / `spring.snappy`          |                         | Drag, sheets, layout / small pops such as a heart                   |
| `stagger` · `staggerLimit` · `wordStagger` | 60 ms · 6 items · 50 ms | Lists (only the first 6 wait) · headlines word by word              |
| `travel.sm` / `md` / `lg`                  | 12 / 20 / 40 px         | Fade-up distance: small elements / sections / panels                |

## Components

In [`src/components/ui`](src/components/ui). All take `className`. It is merged with `cn()`, so later classes win over the defaults.

### Button and IconButton

```tsx
<Button>Search cars</Button>                            // primary · secondary · ghost · gold · outline-light · danger
<Button variant="secondary" size="lg" block loading={saving}>Save</Button>
<Button asChild><Link to="/cars">Browse cars</Link></Button>

<IconButton label="Open menu"><Menu aria-hidden="true" /></IconButton>   // label is required
<IconButton label="Refresh figures" tooltip="top">…</IconButton>        // bottom (default) · top · none
```

Buttons press to 98%, icon buttons to 94%. The gold variant has a sheen on hover; keep it to one per page, and wrap it in `Magnet` so it drifts towards the mouse.

Icon buttons show their label as a tooltip: after half a second of hover, or straight away on keyboard focus. It's pure CSS and only rendered while shown, so it never widens the page. Buttons inside an input (`size="inset"`) put it above. Screen readers skip it, because the button's `aria-label` already names it.

Arrow icons nudge towards where their link goes:

```tsx
<Link to="/become-a-host">
  Become a Host <ArrowRight aria-hidden="true" className="nudge-right" />
</Link>
```

### Card

```tsx
<Card>…</Card>                              // elevated: white, hairline, soft shadow
<Card variant="raised">…</Card>             // floats over imagery or colour (search panel)
<Card variant="flat">…</Card>               // hairline only, on white sections
<Card variant="tinted">…</Card>             // translucent on dark backgrounds

<Card asChild variant="flat" className="p-6">   // classes on the Card, not the child
  <li>…</li>
</Card>

<Card spotlight>…</Card>                    // a soft light follows the mouse (champagne on `tinted`)
```

Use `spotlight` on feature and figure cards (the How it works steps, dashboard figures), not on forms. For an element that isn't a Card, such as the destination tiles, add the `spotlight` class and `onPointerMove={trackSpotlight}`.

### Forms

```tsx
<Field label="Email address" error={errors.email?.message}>
  <Input type="email" {...register('email')} />
</Field>
<Field label="Password"><PasswordInput {...register('password')} /></Field>
<Input leadingIcon={<MapPin />} trailing={<IconButton size="inset" label="Clear">…</IconButton>} />
```

`Field` wires up the label, description, error and ARIA links, and the control shakes once when an error appears. While the input has focus, its label and leading icon turn green. Pass `trailing` on every render, even when hidden, so the input isn't remounted. Labels sit above inputs (no floating labels).

### Feedback and status

```tsx
<Alert variant="danger" title="We couldn't load the figures">…</Alert>
<Badge variant="gold">Instant Book</Badge>
<Skeleton className="h-4 w-40" />                       // match the size of what loads
<StatCard label="Active hosts" icon={KeyRound} value={12} format={formatNumber} />  // digits roll in

<EmptyState
  visual={<IconBadge size="xl"><WifiOff /></IconBadge>}
  title="We can't reach Rento Vroom right now"
  description="Check your connection, then try again."
  actions={<Button onClick={retry}>Try again</Button>}
/>
```

Use skeletons for content that is loading, and a `Spinner` only inside a busy button.

### Decoration and structure

```tsx
<IconBadge size="lg" tone="solid"><Search /></IconBadge>   // sm · md · lg · xl × soft · solid · muted · on-dark
<CheckList items={points} tone="dark" />                    // checks draw in one after another
<Divider tone="dark" />
```

Also: `Avatar`, `DropdownMenu`, `Sheet` (side panel), `SegmentedTabs` (sliding indicator), and in `components/layout` `SectionHeading`, `Container` and `UserMenuLabel`.

### Not built yet

Plan §12.3 also lists Toast, a bottom sheet with drag-to-close, Chip, ListItem, Checkbox/Switch and Modal. They will be built with the first feature that needs them (search filters, checkout, saved cars), from the same tokens. The drag gesture needs Motion's `domMax` features, so load that only on the pages that use it.

## Motion

### Presets ([`src/components/motion`](src/components/motion))

```tsx
<m.div {...fadeUp()} />                          // fades up on mount; fadeUp(delay, distance)
<AnimatePresence mode="wait">
  <m.div key={tab} {...swapUp} />               // tab panels and other content swaps
</AnimatePresence>
const timeline = heroTimeline(words.length);     // eyebrow → words → body → panel

<Reveal>…</Reveal>                               // fades up once on scroll into view
<Stagger as="ul"><StaggerItem as="li" index={i}>…</StaggerItem></Stagger>
<CheckDraw className="size-3.5" delay={0.2} />

// Adapted from React Bits (see below)
<h1 className="headline …"><BlurText text={headline} delay={0.12} /></h1>   // words rise and come into focus
<Counter value={1234} format={formatNumber} />   // digits roll like an odometer
<TiltedCard><Card spotlight>…</Card></TiltedCard> // decorative panels only
<Magnet><Button variant="gold" asChild>…</Button></Magnet>
<li className="stagger-in" style={staggerIndex(i)}>…</li>   // CSS stagger, e.g. menu links in a sheet
```

### CSS utilities ([`src/styles/globals.css`](src/styles/globals.css))

| Utility                                                                      | Effect                                                                                                                    |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lift-card`                                                                  | Lifts 4 px with a deeper shadow on hover; pair with `active:scale-98`                                                     |
| `link-underline`                                                             | Underline grows from the left on hover, focus and the current page                                                        |
| `nudge-right` / `nudge-left`                                                 | Arrow moves 2 px on parent hover or focus                                                                                 |
| `sheen`                                                                      | One band of light across on hover (gold button)                                                                           |
| `parallax` / `parallax-exit`                                                 | Desktop scroll parallax on CSS scroll timelines, with no JavaScript. `parallax-exit` is for heroes at the top of the page |
| `skeleton`, `glass`, `headline`, `eyebrow`                                   | Loading shimmer, sticky-bar blur, display font, small labels                                                              |
| `animate-fade-up`, `-fade-in`, `-pop-in`, `-shake`, `-breathe`, `-bar-in`, … | Keyframe animations                                                                                                       |
| `spotlight` / `spotlight-on-dark`                                            | A light that follows the mouse (driven by `trackSpotlight`; Cards use the `spotlight` prop)                               |
| `shiny-text`                                                                 | A glint crosses gold text every few seconds. Short labels on dark backgrounds only; keep `text-gold` on the element       |
| `gradient-text`                                                              | Slow green-to-bronze fill for one large figure (the 404); keep a text colour on the element                               |
| `stagger-in`                                                                 | Fade up in turn, with `style={staggerIndex(i)}`; first 6 items only                                                       |
| `tilt`, `magnet`, `tooltip`                                                  | Used by `TiltedCard`, `Magnet` and `IconButton`; you don't need to add them yourself                                      |

### Where motion is used

| Where              | What                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Page changes       | The old page fades out (200 ms) and the new one rises 8 px into place (320 ms), with View Transitions. The site header and staff frame have their own `view-transition-name`, so they stay still |
| Home hero          | Landscape drifts; a glint crosses the eyebrow; headline rises and comes into focus word by word; search panel glides up; landscape falls behind on scroll (desktop)                              |
| Sections           | Fade up once; lists stagger (first 6 items)                                                                                                                                                      |
| Destination tiles  | Lift on hover with a champagne spotlight, press in, ridges drift with the scroll (desktop)                                                                                                       |
| How it works steps | Green spotlight on hover                                                                                                                                                                         |
| Host section       | Listing preview tilts towards the mouse with a spotlight; the gold button drifts towards it; checks draw in, the progress bar fills                                                              |
| Forms              | Focus ring, label and icon turn green on focus, shake on error, clear button fades in, password eye cross-fades                                                                                  |
| Menus and sheets   | Dropdowns pop in from 96% and highlighted icons turn green; account chevron turns; sheet links fade up in turn; the close ✕ turns on hover; staff sidebar's gold bar grows in                    |
| Icon buttons       | Tooltip after half a second of hover, or at once on keyboard focus                                                                                                                               |
| Dashboards         | Figures roll in like an odometer, with a spotlight on hover; tab indicator slides                                                                                                                |
| Log-in pages       | Form fades up; the side panel's headline comes into focus word by word                                                                                                                           |
| 404                | The numeral's green-to-bronze gradient drifts slowly                                                                                                                                             |
| Loading            | Skeleton shimmer; brand mark breathes on first load; the account menu fades in over its placeholder                                                                                              |

### From React Bits

These effects are adapted from [React Bits](https://reactbits.dev). Its components are copied into a project and edited, not installed as a package. Each port was rebuilt to follow these rules: tokens instead of hard-coded colours and timings, `m.*` components for `LazyMotion strict`, and no re-renders while following the mouse. Wherever possible the work moved into CSS, so all of this adds about 0.5 KB to the homepage's gzipped JavaScript. Pointer effects only run with a mouse or trackpad, and everything respects reduced motion.

| React Bits                                                          | Here                                   | What changed                                                                                  |
| ------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| [SpotlightCard](https://reactbits.dev/components/spotlight-card)    | `spotlight` utility, `Card spotlight`  | CSS variables instead of React state on every mouse move; brand-green and champagne light     |
| [TiltedCard](https://reactbits.dev/components/tilted-card)          | `TiltedCard`                           | Wraps any content instead of an image; the browser eases the tilt, with no spring loop        |
| [Magnet](https://reactbits.dev/animations/magnet)                   | `Magnet`                               | Pull capped at 8 px; updates once per frame; off for touch and reduced motion                 |
| [BlurText](https://reactbits.dev/text-animations/blur-text)         | `BlurText`                             | Uses the hero timeline and tokens; renders words only, so the heading keeps its id and name   |
| [ShinyText](https://reactbits.dev/text-animations/shiny-text)       | `shiny-text` utility                   | A CSS animation instead of a per-frame JavaScript loop; gold and ivory                        |
| [GradientText](https://reactbits.dev/text-animations/gradient-text) | `gradient-text` utility                | CSS only; primary and gold-text, which both pass AA on ivory                                  |
| [Counter](https://reactbits.dev/components/counter)                 | `Counter` (replaced `CountUp`)         | Takes a formatter, so separators and currency stay still; screen readers hear the final value |
| [AnimatedList](https://reactbits.dev/components/animated-list)      | `stagger-in` utility, `staggerIndex()` | Just the entrance, in CSS                                                                     |

Not used, and why: anything built on GSAP (SplitText, ScrollReveal, AnimatedContent, CardNav, PillNav and others) because plan §12.4 allows one animation library, Motion. The WebGL backgrounds and cursors (Aurora, Particles, SplashCursor and others) are too heavy for the speed budget and too loud for the brand. Before adding another React Bits component, check it runs on Motion or CSS.

## Adding a token

1. Add it to the `@theme` block in `globals.css`, and to `tokens.ts` if it is a colour (the token test compares them).
2. If it is a new font size, radius, shadow or inset shadow, add its name to the lists in [`src/lib/cn.ts`](src/lib/cn.ts). Otherwise tailwind-merge misreads it: an unknown `text-*` class looks like a colour, and `cn('text-title-3', 'text-ink')` would drop the size.
3. Add a contrast pair to `textContrastPairs` if it is used for text.
