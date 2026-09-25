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

| Page | URL |
|---|---|
| Home | `/` |
| Log in | `/login` |
| Staff log-in | `/admin/login` |
| Staff portal (admin and support only) | `/admin` |

Pages linked from the header and footer that later milestones build (Browse cars, How it works, legal pages and so on) show a "Coming soon" page. The list is in `src/routes/public/planned-pages.ts`; remove an entry when its real page is added.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` / `npm run preview` | Production build to `dist/` / serve it locally |
| `npm run lint` · `npm run typecheck` · `npm test` | Checks (Vitest + Testing Library) |
| `npm run format` | Prettier |

## Folder map

```
src/
  main.tsx, app/        Entry, providers (TanStack Query, Motion), router with lazy-loaded routes
  routes/               Pages: public/ (home, coming soon), auth/, admin/, errors/
  features/             Feature code: auth/ (session, login form, staff guard), admin/, search/
  components/
    ui/                 Design system: Button, Input, Field, PasswordInput, Card, Badge, Alert,
                        Skeleton, Spinner, Sheet, DropdownMenu, SegmentedTabs, StatCard, Avatar
    motion/             MotionProvider, Reveal, Stagger, CountUp
    layout/             Site header and footer, auth and public layouts, Container, PageMeta
    brand/              Logo (placeholder until the client's logo arrives), landscape art
  api/                  Typed fetch client (cookies, one shared token refresh) and API types
  lib/                  cn, formatters (NZD, NZ dates), dates, safe redirects
  styles/               tokens.ts + globals.css (Tailwind v4 theme); tokens.test.ts checks they match
                        and that text colours pass WCAG AA
```

## Design and motion

- Tokens from plan §12.2: pounamu green, ivory, ink and champagne gold; Fraunces for headlines and Inter for text, self-hosted.
- Motion (`motion/react`) loads through `LazyMotion`, with its features in a separate chunk. Only `transform` and `opacity` are animated, and `prefers-reduced-motion` turns movement off. Page changes cross-fade with the View Transitions API.
- The homepage's first load is about 184 KB of gzipped JavaScript. The plan's budget is 170 KB (§12.5), checked in CI once the pipelines are set up.
