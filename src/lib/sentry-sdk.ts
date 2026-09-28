/**
 * The parts of the Sentry SDK the site uses, loaded on demand by monitoring.ts. Importing them by
 * name lets the bundler leave out the rest of the package (session replay, feedback widget and so
 * on), which would otherwise be over 100 KB more for every visitor.
 */
export { browserTracingIntegration, captureException, init } from '@sentry/react';
