/** Public build-time settings. The frontend holds no secrets (plan §2.5). */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/+$/, ''),
  // The live site's address, for canonical URLs (plan §1.4). Must match what the build step uses.
  siteUrl: (import.meta.env.VITE_SITE_URL || 'https://www.rentovroom.com').replace(/\/+$/, ''),
  // Error monitoring (src/lib/monitoring.ts). The DSN is public by design: it only lets browsers send
  // events to this Sentry project.
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || undefined,
  sentryEnvironment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
  release: import.meta.env.VITE_RELEASE || undefined,
  // Stripe's publishable key (pk_test_… in the sandbox, pk_live_… at launch). Public by design: it can
  // only start payments the API has created (plan §8).
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || undefined,
} as const;
