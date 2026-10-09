# Rento Vroom UI system

How the website looks and moves, and how to build new screens that match. The design intent is in [IMPLEMENTATION_PLAN.md §12](../IMPLEMENTATION_PLAN.md): luxurious, calm and confident; a primary blue on a light grey canvas, with white cards, ink text and a pale blue accent used sparingly; quiet, quick motion.

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

| Token                                             | Value                 | Use                                                                                        |
| ------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------ |
| `primary` / `primary-hover`                       | `#0254C2` / `#0045A2` | Brand blue: primary buttons, links, eyebrows, focus, active states and brand               |
| `accent` / `accent-hover`                         | `#C1D9FE` / `#DFEBFE` | Pale blue: icons, eyebrows and highlights on dark or primary. Too light for text on canvas |
| `ink`                                             | `#08101D`             | Text, dark sections                                                                        |
| `muted`                                           | `#5D6470`             | Secondary text                                                                             |
| `canvas` / `surface`                              | `#EEEEEE` / `#FFFFFF` | Page background, also light text on dark / cards                                           |
| `line`                                            | `#D8DBE0`             | Hairlines and dividers                                                                     |
| `success` · `warning` · `danger` / `danger-hover` |                       | States                                                                                     |

On light backgrounds, coloured text is `primary`; on `ink` or `primary` backgrounds it is `accent`.

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
| `text-numeral` | 96 → 256 px, scene-fluid | The giant 404 in the not-found scene            |
| `text-ui`      | 15 px                    | Navigation links, medium buttons                |
| `eyebrow`      | 12 px, uppercase, 0.08em | Small labels above headings                     |

```tsx
<h1 className="headline text-title-3 font-medium">Welcome back</h1>
<p className="eyebrow text-primary">Popular destinations</p>
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
<Button>Search cars</Button>                            // primary · secondary · ghost · accent · outline-light · danger
<Button variant="secondary" size="lg" block loading={saving}>Save</Button>
<Button asChild><Link to="/cars">Browse cars</Link></Button>

<IconButton label="Open menu"><Menu aria-hidden="true" /></IconButton>   // label is required
<IconButton label="Refresh figures" tooltip="top">…</IconButton>        // bottom (default) · top · none
```

Buttons press to 98%, icon buttons to 94%. The accent variant has a sheen on hover; keep it to one per page, on a dark or primary background, and wrap it in `Magnet` so it drifts towards the mouse.

Icon buttons show their label as a tooltip: after half a second of hover, or straight away on keyboard focus. It's pure CSS and only rendered while shown, so it never widens the page. Buttons inside an input (`size="inset"`) put it above. Screen readers skip it, because the button's `aria-label` already names it.

Arrow icons nudge towards where their link goes:

```tsx
<Link to="/become-a-host">
  Become a Host <ArrowRight aria-hidden="true" className="nudge-right" />
</Link>
```

A page that the header, the account menu, the Host tabs and the staff sidebar don't link to gets a `BackLink` above its title, such as a trip, a booking, a car's listing or its calendar. Name the page it leads to. A page opened from several places takes `previous`, and returns to whichever page came before, or to `to` when opened directly:

```tsx
<BackLink to="/trips">All trips</BackLink>
<BackLink to={vehiclePath(car.id)} previous>Back</BackLink>
<HostPageHeader back={<BackLink to="/host">Hosting</BackLink>} title={…} />
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

<Card spotlight>…</Card>                    // a soft light follows the mouse (pale blue on `tinted`)
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

`Field` wires up the label, description, error and ARIA links, and the control shakes once when an error appears. While the input has focus, its label and leading icon turn blue. Pass `trailing` on every render, even when hidden, so the input isn't remounted. Labels sit above inputs (no floating labels).

#### Pickers and dropdowns

Don't use `<input type="date">`, `<input type="time">`, `<select>` or `<datalist>`: the browser draws those in its own style. Use these instead. They look like `Input`, work inside `Field`, and take react-hook-form through `Controller`. Pass `field.ref` so `setFocus` reaches them.

```tsx
<Field label="Pick-up date" error={errors.pickupDate?.message}>
  <Controller
    control={control}
    name="pickupDate"
    render={({ field }) => (
      <DatePicker
        ref={field.ref}
        value={field.value}           // "2026-10-12", as <input type="date">
        onChange={field.onChange}
        onBlur={field.onBlur}
        min={today}
        range={[pickupDate, returnDate]}   // optional: shows the trip as a band
        calendarLabel="Choose a pick-up date"
      />
    )}
  />
</Field>

<TimePicker value={time} onChange={setTime} step={30} align="end" />            // "10:00", listed as "10:00 am"
<Select value={size} onChange={setSize} options={sizes} icon={<Car />} listLabel="Car sizes" />
<Combobox value={where} onValueChange={setWhere} options={places} optionIcon={placeIcon} leadingIcon={<MapPin />} />
```

| Component    | Replaces                      | Behaviour                                                                                                                                                             |
| ------------ | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DatePicker` | `<input type="date">`         | Calendar with Monday first. Today has a dot and the chosen day is solid blue. Days outside `min`/`max` are faded. Arrows, Page Up/Down and Home/End move between days |
| `TimePicker` | `<input type="time">`         | A list of times in `step` minutes (30 by default). Typing jumps to a time. Built on `Select`                                                                          |
| `Select`     | `<select>`                    | Themed list with a check on the chosen option. Arrows, Home/End, Page keys, typeahead, and Enter or Space to choose                                                   |
| `Combobox`   | `<input list>` + `<datalist>` | Suggestions filter as you type, ignoring accents ("taupo" finds Taupō). Focus stays in the input. Any text can still be entered                                       |
| `Popover`    | (building block)              | The floating panel under all four. See below                                                                                                                          |

`Popover` renders into the page body, so a parent with `overflow: hidden`, such as the home hero, can't clip it. It opens below its anchor, or above when there is more room there. If it fits neither way, it scrolls the page just enough to fit. It closes on Escape and on a press or focus outside. It is written by hand instead of using Radix Popover, because Radix's positioning engine would add about 10 KB to the homepage.

### Feedback and status

```tsx
<Alert variant="danger" title="We couldn't load the figures">…</Alert>
<Badge variant="accent">Instant Book</Badge>
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

Also: `Avatar`, `DropdownMenu` (action menus; for choosing a value use `Select`), `Sheet` (side panel), `SegmentedTabs` (sliding indicator), and in `components/layout` `SectionHeading`, `Container` and `UserMenuLabel`.

### Page backgrounds

Every page has its own background art, about what the page is for. The home hero's landscape (`LandscapeArt`) belongs to the home page alone.

- **Scenes** ([`components/brand/scenes`](src/components/brand/scenes)) are night illustrations in the landscape's palette, for `PageHero tone="dark"` and the sign-in panel. They are artwork, so the design-system test lets them use hex colours.
- **Line patterns** ([`components/brand/patterns`](src/components/brand/patterns)) are drawn in `currentColor` (faint `primary`), for `PageHero tone="light"` and for `PageBackdrop`.
- `PageHero` takes the page's art as `art={…}`. App pages put `<PageBackdrop art={…} />` first inside their outer `Container`. It positions itself against `<main>` and fades into the canvas before the content.

| Page                                                                                         | Art                                                 |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Home                                                                                         | `LandscapeArt`: alpine road at blue hour            |
| How it works                                                                                 | `JourneyArt`: from a farmhouse driveway to the road |
| Safety                                                                                       | `LighthouseArt`: its beam sweeps (`animate-sweep`)  |
| About                                                                                        | `HarbourArt`: a harbour town with its lights on     |
| Become a host                                                                                | `StreetArt`: a street with a car under a carport    |
| Insurance                                                                                    | `CoverRings`: rings of cover around a shield        |
| FAQs, the help centre and its guides                                                         | `ContourLines`: a contour map                       |
| Contact, Help and support, a support request, incidents                                      | `ConnectionArcs`: places linked by arcs             |
| Legal pages                                                                                  | `RuledLines`: ruled paper and a seal                |
| Browse cars, search, Saved cars                                                              | `StreetMap`: streets with cars pinned               |
| Trips, a trip, its receipt, its handover, check-in and check-out, writing a review, Messages | `TripRoute`: a route across hill country            |
| Hosting (overview, bookings, cars, apply, earnings, profile, maintenance)                    | `ParkingBays`: a car park from above                |
| Account, its settings, payments and reviews                                                  | `DotGrid`: dots and switches                        |
| Notifications, unsubscribe                                                                   | `SignalArcs`: a bell sending out arcs               |
| Checkout, paying a charge after a trip                                                       | `CalmWaves`: slow, even waves                       |
| Log in, sign up and the other guest sign-ins                                                 | `CoastArt`: a coast road under the moon             |
| Staff log-in and invitation                                                                  | `CityArt`: the city at night                        |
| Destinations                                                                                 | Their `tone-*` gradients                            |

A new page picks a scene or pattern that suits it, or adds one. Keep it to a few KB of inline SVG, and keep focal points on the right, clear of the text.

### Errors

Errors are caught at four levels, so a fault takes out as little of the site as possible:

| Level      | Where                                                                                                            | What the visitor sees                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| App        | `ErrorBoundary` around the providers and router in `main.tsx`                                                    | `AppCrashScreen`: logo, message, Reload, and a plain link home (it sits outside the router)           |
| Root route | `errorElement: <RouteErrorPage />` in `router.tsx`                                                               | A standalone page, for a layout, the header or a page outside the layouts (log-in) that fails         |
| Page       | Pathless routes with `errorElement` inside `PublicLayout` (`PageError`) and the staff portal (`AdminRouteError`) | The message in the page's place; the site header and footer, or the portal's sidebar and header, stay |
| Section    | `ErrorBoundary` around parts of a page                                                                           | `SectionError` (an alert with Try again), or nothing at all for decorative sections                   |

```tsx
<ErrorBoundary fallback={({ reset }) => <SectionError title="We couldn't show the figures" onRetry={reset} />}>
  <Figures />
</ErrorBoundary>
<ErrorBoundary fallback={null}>{/* hides quietly */}<TrustStrip /></ErrorBoundary>
```

Page-level messages come from `ErrorMessage`. When a page's code fails to download (`isChunkLoadError`), it says the connection may have dropped instead of "Something went wrong", and development builds show the error itself. Boundaries only catch errors thrown while rendering. Errors in event handlers and requests are shown by the form or query that made them, as they are today.

### Added in Phase 2

```tsx
toast('Saved to your cars');                                  // success · danger · neutral; <Toaster /> is in the root layout
<Slider value={[min, max]} onValueChange={setRange} onValueCommit={search} min={0} max={500}
  thumbLabels={['Minimum price', 'Maximum price']} formatValue={(v) => `${v} a day`} />
<Switch checked={instant} onCheckedChange={setInstant} label="Instant Book" description="Book without waiting" />
<RatingStars value={4.6} size="sm" />                       // part stars fill in proportion
<Gallery photos={photos} index={i} onIndexChange={setI} onOpen={() => setOpen(true)} label="Photos of the RAV4" />
<Lightbox photos={photos} open={open} index={i} onIndexChange={setI} onClose={close} originRef={frameRef} label="…" />
<BottomSheet open={open} onOpenChange={setOpen} title="Filters" footer={<Button>Show 12 cars</Button>}>…</BottomSheet>
<Stepper steps={steps} current={2} onSelect={saveAndGo} label="Listing progress" finishedLabel="Review" />
<DatePicker … isDateDisabled={(day) => booked.has(day)} />   // e.g. a car's fully booked days
```

| Component                | Use                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Toast`                  | Short confirmations that leave on their own (a polite live region). Errors that need action stay in an `Alert` on the page.                             |
| `Slider`                 | One or two thumbs (a range). Keyboard: arrows, Page keys, Home/End; the thumbs never cross.                                                             |
| `Switch`                 | On/off settings and filters, with the label beside it.                                                                                                  |
| `RatingStars`            | Average ratings. A car with no reviews shows the **New** label instead (the VehicleCard does this).                                                     |
| `Gallery` / `SwipeTrack` | Swipeable photos with momentum, arrow buttons and keys, thumbnails and a counter.                                                                       |
| `Lightbox`               | Full-screen photos that grow out of the tapped one.                                                                                                     |
| `BottomSheet`            | The phone sheet with drag-to-close (search filters, the listing's booking panel).                                                                       |
| `ModalPanel`             | The hand-written modal behind BottomSheet and Lightbox. Not Radix: Radix blocks clicks outside its panel, and the site's pickers open in the page body. |
| `Stepper`                | Multi-step flows (Host onboarding), marking done steps and steps with something missing.                                                                |

Drag and layout animations need Motion's `domMax` features. Wrap the pages that use them in `MaxMotion` (`src/features/vehicles/max-motion.tsx`), never the homepage, which keeps the small `domAnimation` set (plan §12.5).

Marketplace components live in `src/features`: `VehicleCard` and the listing's parts (`features/vehicles`), `LocationAutocomplete` and the filters (`features/search`), `PriceBreakdown` (`features/booking`, used by the listing, checkout and trips).

### Added in Phase 3

```tsx
<Container className="py-8 sm:py-12">
  <PageBackdrop art={DotGrid} />
  <AccountShell>                                  {/* the Guest dashboard's sidebar, and its tab bar on phones */}
    <AccountPageHeader title="Payments" description="…" actions={…} />
    …
  </AccountShell>
</Container>
```

`AccountShell` (`features/account/account-shell.tsx`) frames every Guest dashboard page (plan §12.6): a sidebar from tablets up, and a tab bar (Trips · Messages · Saved · Account) that sticks to the bottom of a phone while the page is in view, then scrolls away above the footer. Pages opened from a list, such as a trip, its receipt or a support request, use a `BackLink` instead. `print:hidden` keeps the header, footer and backgrounds off printed pages, such as receipts. `HostShell` (`features/host/host-shell.tsx`) frames every Host page the same way: a sidebar from tablets up (Today, Vehicles, Bookings, Calendar, Earnings, Inbox, Reviews, Profile), and on phones a tab bar with Today · Vehicles · Calendar · Earnings · Inbox, the other sections reached from Today. Both shells share their sidebar group, tab bar and frame (`features/account/dashboard-frame.tsx`), so Host pages don't load the Guest navigation. Each Host page keeps `HostPageHeader` (`features/host/host-nav.tsx`) for its heading. Pages Hosts share with Guests, the inbox and reviews, use `AreaShell` (`features/host/area-shell.tsx`): the Host frame when opened with `?as=host` (`host-links.ts`), the Guest frame otherwise. The listing steps and a new car keep their focused layout, and someone who hasn't applied to host sees `/host` and the application without the Host frame. Two-column layouts inside a framed page switch at `xl`, beside the sidebar. Staff pages use `AdminPageHeader` (`features/admin/ops`).

| Component                                       | Where                                   | Use                                                                     |
| ----------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| `DataTable`, `Th`, `Td`, `Tr`, `Pagination`     | `features/admin/ops/admin-table.tsx`    | The staff portal's tables: a card that scrolls sideways on a phone      |
| `ListSkeleton`, `LoadError`, `EmptyList`        | `features/admin/ops/query-feedback.tsx` | A staff list loading, failing (with Try again) or empty                 |
| `EarningsChart`                                 | `features/host/earnings-chart.tsx`      | Monthly bars with round axis steps, and Show as table                   |
| `StarInput`, `ReviewCard`, `ReportReviewButton` | `features/reviews`                      | Rating a trip, showing a review, reporting one                          |
| `CarDiagram`, `DamageEditor`, `PhotoCapture`    | `features/handover`                     | Damage pinned on a car outline, and guided photos with their time taken |
| `Composer`, `MessageList`                       | `features/messages`                     | A conversation: photos, Enter to send on a computer, report a message   |
| `ExtraCharges`                                  | `features/booking/extra-charges.tsx`    | Charges after a trip, on the trip and booking pages                     |

Pickers inside a `DialogContent` open their list inside the dialog (`PopoverRootContext`), because a modal dialog won't let a list in the page body be clicked or focused. Two layout traps found in Phase 3's polish pass:

- **Truncated text in a grid.** A grid's implicit column is `auto`, so a `truncate`d line's full width can still widen the page. Give the grid an explicit `grid-cols-1` (`minmax(0, 1fr)`), as the inbox and conversation do.
- **A sideways scroller must be `relative`.** Absolutely positioned parts inside it, such as `sr-only` headings, are only clipped when the scroller is their containing block. Otherwise they widen the page (`DataTable` is `relative` for this reason).

Actions that only appear on hover also show on touch screens (`pointer-coarse:opacity-100`), which have no hover.

### Not built yet

Plan §12.3 also lists Chip and ListItem. They will be built when a screen needs them, from the same tokens.

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
<Magnet><Button variant="accent" asChild>…</Button></Magnet>
<li className="stagger-in" style={staggerIndex(i)}>…</li>   // CSS stagger, e.g. menu links in a sheet
```

### CSS utilities ([`src/styles/globals.css`](src/styles/globals.css))

| Utility                                                                           | Effect                                                                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `lift-card`                                                                       | Lifts 4 px with a deeper shadow on hover; pair with `active:scale-98`                                                     |
| `link-underline`                                                                  | Underline grows from the left on hover, focus and the current page                                                        |
| `nudge-right` / `nudge-left`                                                      | Arrow moves 2 px on parent hover or focus                                                                                 |
| `sheen`                                                                           | One band of light across on hover (accent button)                                                                         |
| `parallax` / `parallax-exit`                                                      | Desktop scroll parallax on CSS scroll timelines, with no JavaScript. `parallax-exit` is for heroes at the top of the page |
| `skeleton`, `glass`, `headline`, `eyebrow`                                        | Loading shimmer, sticky-bar blur, display font, small labels                                                              |
| `animate-fade-up`, `-fade-in`, `-pop-in`, `-shake`, `-breathe`, `-bar-in`, …      | Keyframe animations                                                                                                       |
| `spotlight` / `spotlight-on-dark`                                                 | A light that follows the mouse (driven by `trackSpotlight`; Cards use the `spotlight` prop)                               |
| `shiny-text`                                                                      | A glint crosses accent text every few seconds. Short labels on dark backgrounds only; keep `text-accent` on the element   |
| `gradient-text`                                                                   | Slow blue-to-ink fill for one large figure; keep a text colour on the element                                             |
| `stagger-in`                                                                      | Fade up in turn, with `style={staggerIndex(i)}`; first 6 items only                                                       |
| `tilt`, `magnet`, `tooltip`                                                       | Used by `TiltedCard`, `Magnet` and `IconButton`; you don't need to add them yourself                                      |
| `road-dashes`, `roadside-posts`, `animate-drive-in`, `-wheel-spin`, `-pan-far`, … | The 404's `RoadTripScene`. Ground-level motion runs at one speed (12rem/s); farther hills pan slower                      |
| `animate-sweep`                                                                   | The Safety hero's lighthouse beam swings slowly back and forth (set its `origin-*` on the lamp)                           |

### Where motion is used

| Where              | What                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page changes       | The old page fades out (200 ms) and the new one rises 8 px into place (320 ms), with View Transitions. The site header and staff frame have their own `view-transition-name`, so they stay still                                                                        |
| Home hero          | Landscape drifts; a glint crosses the eyebrow; headline rises and comes into focus word by word; search panel glides up; landscape falls behind on scroll (desktop)                                                                                                     |
| Sections           | Fade up once; lists stagger (first 6 items)                                                                                                                                                                                                                             |
| Destination tiles  | Lift on hover with a pale blue spotlight, press in, ridges drift with the scroll (desktop)                                                                                                                                                                              |
| How it works steps | Blue spotlight on hover                                                                                                                                                                                                                                                 |
| Host section       | Listing preview tilts towards the mouse with a spotlight; the accent button drifts towards it; checks draw in, the progress bar fills                                                                                                                                   |
| Forms              | Focus ring, label and icon turn blue on focus, shake on error, clear button fades in, password eye cross-fades. Pickers pop in from 96%, a new month fades in, a select's chevron turns                                                                                 |
| Menus and sheets   | Dropdowns pop in from 96% and highlighted icons turn blue; account chevron turns; sheet links fade up in turn; the close ✕ turns on hover; staff sidebar's accent bar grows in                                                                                          |
| Icon buttons       | Tooltip after half a second of hover, or at once on keyboard focus                                                                                                                                                                                                      |
| Dashboards         | Figures roll in like an odometer, with a spotlight on hover; tab indicator slides                                                                                                                                                                                       |
| Log-in pages       | Form fades up; the side panel's headline comes into focus word by word                                                                                                                                                                                                  |
| 404                | A night drive: the car drives in, then cruises with turning wheels, a gentle suspension bob and puffs of exhaust; lane markings and marker posts stream past; two ranges of hills pan at their own speeds under a glowing 404; stars twinkle. Still with reduced motion |
| Loading            | Skeleton shimmer; brand mark breathes on first load; the account menu fades in over its placeholder                                                                                                                                                                     |

### From React Bits

These effects are adapted from [React Bits](https://reactbits.dev). Its components are copied into a project and edited, not installed as a package. Each port was rebuilt to follow these rules: tokens instead of hard-coded colours and timings, `m.*` components for `LazyMotion strict`, and no re-renders while following the mouse. Wherever possible the work moved into CSS, so all of this adds about 0.5 KB to the homepage's gzipped JavaScript. Pointer effects only run with a mouse or trackpad, and everything respects reduced motion.

| React Bits                                                          | Here                                   | What changed                                                                                  |
| ------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| [SpotlightCard](https://reactbits.dev/components/spotlight-card)    | `spotlight` utility, `Card spotlight`  | CSS variables instead of React state on every mouse move; brand-blue and pale blue light      |
| [TiltedCard](https://reactbits.dev/components/tilted-card)          | `TiltedCard`                           | Wraps any content instead of an image; the browser eases the tilt, with no spring loop        |
| [Magnet](https://reactbits.dev/animations/magnet)                   | `Magnet`                               | Pull capped at 8 px; updates once per frame; off for touch and reduced motion                 |
| [BlurText](https://reactbits.dev/text-animations/blur-text)         | `BlurText`                             | Uses the hero timeline and tokens; renders words only, so the heading keeps its id and name   |
| [ShinyText](https://reactbits.dev/text-animations/shiny-text)       | `shiny-text` utility                   | A CSS animation instead of a per-frame JavaScript loop; accent and white                      |
| [GradientText](https://reactbits.dev/text-animations/gradient-text) | `gradient-text` utility                | CSS only; primary and ink, which both pass AA on the canvas                                   |
| [Counter](https://reactbits.dev/components/counter)                 | `Counter` (replaced `CountUp`)         | Takes a formatter, so separators and currency stay still; screen readers hear the final value |
| [AnimatedList](https://reactbits.dev/components/animated-list)      | `stagger-in` utility, `staggerIndex()` | Just the entrance, in CSS                                                                     |

Not used, and why: anything built on GSAP (SplitText, ScrollReveal, AnimatedContent, CardNav, PillNav and others) because plan §12.4 allows one animation library, Motion. The WebGL backgrounds and cursors (Aurora, Particles, SplashCursor and others) are too heavy for the speed budget and too loud for the brand. Before adding another React Bits component, check it runs on Motion or CSS.

## Adding a token

1. Add it to the `@theme` block in `globals.css`, and to `tokens.ts` if it is a colour (the token test compares them).
2. If it is a new font size, radius, shadow or inset shadow, add its name to the lists in [`src/lib/cn.ts`](src/lib/cn.ts). Otherwise tailwind-merge misreads it: an unknown `text-*` class looks like a colour, and `cn('text-title-3', 'text-ink')` would drop the size.
3. Add a contrast pair to `textContrastPairs` if it is used for text.
