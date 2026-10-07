/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin, e.g. http://localhost:4000 or https://api.<domain>. */
  readonly VITE_API_URL?: string;
  /** The site's own address for canonical URLs, e.g. https://www.<domain>. Defaults to the live site. */
  readonly VITE_SITE_URL?: string;
  /** Sentry DSN of the website's project. Unset: no error monitoring. */
  readonly VITE_SENTRY_DSN?: string;
  /** "production" (default) or "staging". */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** The deployed version, e.g. rento-vroom-frontend@abc1234; the pipeline sets it. */
  readonly VITE_RELEASE?: string;
  /** Stripe publishable key, pk_test_… or pk_live_…. Unset: payments show as not set up. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
