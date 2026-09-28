import { useEffect } from 'react';
import { env } from '@/lib/env';
import { isChunkLoadError } from '@/lib/errors';

/*
 * Error monitoring and real-user Core Web Vitals with Sentry (plan §1.2, §12.5). The SDK downloads
 * only after the page has loaded and the browser is idle, so it never slows the first paint or counts
 * against the JavaScript budget. Errors from before then are kept and sent once it's ready.
 * It stays off on localhost (development, the pipeline's Lighthouse runs) and without a DSN.
 */

interface SentryLike {
  init(options: Record<string, unknown>): unknown;
  captureException(error: unknown): unknown;
  browserTracingIntegration(): unknown;
}

export interface MonitoringOptions {
  dsn?: string;
  environment: string;
  release?: string;
  hostname: string;
  /** Downloads the Sentry SDK. */
  loadSdk: () => Promise<SentryLike>;
  /** Runs `start` once the page has loaded and the browser is idle. */
  afterLoad: (start: () => void) => void;
}

const MAX_EARLY_ERRORS = 10;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

let capture: ((error: unknown) => void) | undefined;
let enabled = false;
const earlyErrors: unknown[] = [];

function afterPageLoad(start: () => void) {
  const whenIdle = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(start, { timeout: 5_000 })
      : setTimeout(start, 1_000);
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

const defaults = (): MonitoringOptions => ({
  dsn: env.sentryDsn,
  environment: env.sentryEnvironment,
  release: env.release,
  hostname: window.location.hostname,
  loadSdk: () => import('./sentry-sdk'),
  afterLoad: afterPageLoad,
});

/** Sends an error to Sentry, or keeps it until Sentry has loaded. Does nothing when monitoring is off. */
export function reportError(error: unknown): void {
  // A chunk that didn't download is the visitor's connection, and the page already says so.
  if (!enabled || error == null || isChunkLoadError(error)) return;
  if (capture) capture(error);
  else if (earlyErrors.length < MAX_EARLY_ERRORS) earlyErrors.push(error);
}

/** Reports an error that a route error page or boundary is showing, once. */
export function useReportError(error: unknown): void {
  useEffect(() => reportError(error), [error]);
}

/** Starts monitoring; call once, before the app renders. Resolves once Sentry is running (for tests). */
export function startMonitoring(options: MonitoringOptions = defaults()): Promise<void> {
  if (!options.dsn || LOCAL_HOSTS.has(options.hostname)) return Promise.resolve();
  enabled = true;

  // Until Sentry is loaded, catch uncaught errors here so the first moments aren't lost.
  const onError = (event: ErrorEvent) => reportError(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  return new Promise((resolve) => {
    options.afterLoad(() => {
      options
        .loadSdk()
        .then((Sentry) => {
          Sentry.init({
            dsn: options.dsn,
            environment: options.environment,
            release: options.release,
            // Core Web Vitals and page timings from 1 in 10 visits.
            integrations: [Sentry.browserTracingIntegration()],
            tracesSampleRate: 0.1,
            // Errors, stack traces and timings only: no user details, cookies, headers, bodies or
            // query strings (search URLs carry places and dates). NZ Privacy Act, plan §14.
            dataCollection: {
              userInfo: false,
              cookies: false,
              httpHeaders: false,
              httpBodies: [],
              urlQueryParams: false,
            },
          });
          // Sentry catches uncaught errors itself from here on.
          window.removeEventListener('error', onError);
          window.removeEventListener('unhandledrejection', onRejection);
          capture = (error) => Sentry.captureException(error);
          earlyErrors.splice(0).forEach(capture);
        })
        // The SDK didn't download (offline, ad blocker): the site works the same without it.
        .catch(() => {})
        .finally(resolve);
    });
  });
}

/** Test helper: back to the state before startMonitoring(). */
export function resetMonitoring(): void {
  capture = undefined;
  enabled = false;
  earlyErrors.length = 0;
}
