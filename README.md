# Rento Vroom: Frontend

App 1 of 2. The Rento Vroom website: React 19 + Vite + TypeScript.

- Deployed on its own as static files on AWS S3 + CloudFront (`www.<domain>`).
- Talks to the backend only through its REST API and Socket.IO (`VITE_API_URL`).
- Holds no secrets. Only public `VITE_` values are built into the bundle.
- Shares no code with `backend/`. API types will be generated from `backend/openapi.json` (for now they are written by hand in `src/api/types.ts`).

See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), sections 1.4 (SEO), 2 (structure and commands), 12 (design) and 13 (deployment).

## Run it locally

Start the backend first (see `backend/README.md`), then:

```bash
cd frontend
npm install
cp .env.example .env.local   # VITE_API_URL=http://localhost:4000
npm run dev                  # http://localhost:5173
```

| Page                                  | URL            |
| ------------------------------------- | -------------- |
| Home                                  | `/`            |
| Log in                                | `/login`       |
| Staff log-in                          | `/admin/login` |
| Staff portal (admin and support only) | `/admin`       |

Pages linked from the header and footer that later milestones build (Browse cars, How it works, legal pages and so on) show a "Coming soon" page. They are the entries marked `comingSoon` in `src/seo/pages.ts`; remove the flag when the real page is added.

## SEO (plan §1.4)

- **One table:** `src/seo/pages.ts` holds each static public page's title, description and search rule (indexed, or `noindex` for sign-in pages, search results and pages still coming soon).
- **Build step:** `npm run build` ends with `scripts/prerender-meta.ts`, which writes `dist/pages/<page>.html` for every page in the table. Each has its own title, description, link-preview tags (`public/og-image.png`) and, for indexed pages, a canonical URL and JSON-LD, so WhatsApp, Facebook and crawlers that don't run JavaScript see the right page. `VITE_SITE_URL` sets the site address (default `https://www.rentovroom.com`).
- **Routing:** the CloudFront Function in `infra/web-router.js` serves each page's file for its URL, and `index.html` for every other app URL. It is published by hand (see DEPLOYING_UPDATES.md); a test fails if its page list and the table differ.
- **While the app runs:** `PageMeta` sets the same tags from the table as the visitor navigates.

## Error monitoring

Sentry (`src/lib/monitoring.ts`) records errors and real-user Core Web Vitals on the live site. Its SDK downloads only after the page has loaded, so it doesn't count against the JavaScript budget, and errors from before then are sent once it's ready. It is off on `localhost` and without `VITE_SENTRY_DSN`; the pipeline sets the DSN, the environment and the release (the commit). No user details, cookies, headers or query strings are sent.

## Commands

| Command                                           | What it does                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                                     | Dev server with hot reload                                                                                                                                         |
| `npm run build` / `npm run preview`               | Production build to `dist/`, including the SEO page files / serve it locally                                                                                       |
| `npm run lint` · `npm run typecheck` · `npm test` | Checks (Vitest + Testing Library)                                                                                                                                  |
| `npm run api:types`                               | Regenerates `src/api/schema.d.ts` from `../backend/openapi.json` after an API change (plan §2.3). The pipeline fails while it doesn't match the backend on master. |
| `npm run size`                                    | After a build: the homepage's first-load JavaScript against the 170 KB budget (plan §12.5)                                                                         |
| `npm run format`                                  | Prettier                                                                                                                                                           |

## Folder map

```
src/
  main.tsx, app/        Entry, providers (TanStack Query, Motion), router with lazy-loaded routes
  routes/               Pages: public/ (home, coming soon), auth/, admin/, errors/
  features/             Feature code: auth/ (session, login form, staff guard), admin/, search/
  components/
    ui/                 Design system: Button, IconButton, Input, Field, PasswordInput, Card, Badge,
                        IconBadge, Alert, EmptyState, CheckList, Divider, Skeleton, Spinner, Sheet,
                        DropdownMenu, SegmentedTabs, StatCard, Avatar
    motion/             MotionProvider, presets (fadeUp, swapUp, heroTimeline, staggerIndex), Reveal,
                        Stagger, CheckDraw, and the React Bits ports: BlurText, Counter, TiltedCard,
                        Magnet, trackSpotlight
    layout/             Site header and footer, auth and public layouts, Container, PageMeta
    brand/              Logo (placeholder until the client's logo arrives), landscape art
  api/                  Typed client (openapi-fetch: cookies, one shared token refresh) and the API types
                        generated from the backend's openapi.json (schema.d.ts)
  lib/                  cn, formatters (NZD, NZ dates), dates, safe redirects, Socket.IO connection, Sentry monitoring
  seo/                  SEO table (pages.ts) and the head tags the build writes (head.ts)
  styles/               tokens.ts + globals.css (Tailwind v4 theme); tokens.test.ts checks they match
                        and that text colours pass WCAG AA
scripts/                prerender-meta.ts (the SEO build step), check-bundle-size.ts (the JavaScript budget)
infra/                  web-router.js: the CloudFront Function that routes page URLs
```

## Design and motion

- **[UI_SYSTEM.md](UI_SYSTEM.md)** documents the tokens, components and motion presets, with usage examples. Read it before building a new screen.
- Tokens from plan §12.2: primary blue `#0254C2` on a `#EEEEEE` canvas, with white cards, ink and a pale blue accent; Fraunces for headlines and Inter for text, self-hosted. `design-system.test.ts` rejects hardcoded colours, type sizes, radii and off-token durations in components.
- Motion (`motion/react`) loads through `LazyMotion`, with its features in a separate chunk. Only `transform` and `opacity` are animated, and `prefers-reduced-motion` turns movement off. Page changes cross-fade with the View Transitions API.
- A few effects are adapted from [React Bits](https://reactbits.dev) (spotlight cards, tilt, magnet, blur-in headline, shiny and gradient text, rolling counter, staggered menus). Only components built on Motion or CSS are used, because the plan allows no GSAP (§12.4). UI_SYSTEM.md lists each one and what changed.
- The homepage's first load is about 186 KB of gzipped JavaScript. The plan's budget is 170 KB (§12.5), checked in CI once the pipelines are set up. The biggest single item that could go is tailwind-merge (8.6 KB).
