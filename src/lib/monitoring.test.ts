import { afterEach, describe, expect, it, vi } from 'vitest';
import { reportError, resetMonitoring, startMonitoring, type MonitoringOptions } from './monitoring';

const DSN = 'https://publickey@o1.ingest.us.sentry.io/2';

function fakeSentry() {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    browserTracingIntegration: vi.fn(() => 'browser-tracing'),
  };
}

/** Options where the test decides when "the page has loaded". */
function setup(overrides: Partial<MonitoringOptions> = {}) {
  const sentry = fakeSentry();
  let pageLoaded: () => void = () => {};
  const options: MonitoringOptions = {
    dsn: DSN,
    environment: 'production',
    release: 'rento-vroom-frontend@abc1234',
    hostname: 'www.rentovroom.com',
    loadSdk: vi.fn(async () => sentry),
    afterLoad: (start) => {
      pageLoaded = start;
    },
    ...overrides,
  };
  return { sentry, options, loadPage: () => pageLoaded() };
}

afterEach(() => {
  resetMonitoring();
});

describe('error monitoring', () => {
  it('downloads Sentry only after the page has loaded, with no personal data', async () => {
    const { sentry, options, loadPage } = setup();
    const started = startMonitoring(options);
    expect(options.loadSdk).not.toHaveBeenCalled();

    loadPage();
    await started;

    expect(sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: 'production',
        release: 'rento-vroom-frontend@abc1234',
        integrations: ['browser-tracing'],
        tracesSampleRate: 0.1,
        dataCollection: expect.objectContaining({ userInfo: false, cookies: false, urlQueryParams: false }),
      }),
    );
  });

  it('keeps errors from before Sentry loaded and sends them once it has', async () => {
    const { sentry, options, loadPage } = setup();
    const started = startMonitoring(options);
    const early = new Error('Hero failed to render');
    reportError(early);
    // An uncaught error in those first moments is kept too.
    const uncaught = new Error('Unhandled in a click handler');
    window.dispatchEvent(new ErrorEvent('error', { error: uncaught }));

    loadPage();
    await started;
    expect(sentry.captureException.mock.calls.map(([error]) => error)).toEqual([early, uncaught]);

    const later = new Error('Later');
    reportError(later);
    expect(sentry.captureException).toHaveBeenLastCalledWith(later);
  });

  it("doesn't report a page that failed to download: that's the visitor's connection", async () => {
    const { sentry, options, loadPage } = setup();
    const started = startMonitoring(options);
    loadPage();
    await started;

    reportError(new TypeError('Failed to fetch dynamically imported module: /assets/page.js'));
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it('stays off without a DSN, and on localhost', async () => {
    for (const overrides of [{ dsn: undefined }, { hostname: 'localhost' }, { hostname: '127.0.0.1' }]) {
      const { options, loadPage } = setup(overrides);
      await startMonitoring(options);
      loadPage();
      reportError(new Error('Not sent'));
      expect(options.loadSdk).not.toHaveBeenCalled();
    }
  });

  it('carries on without Sentry when its script is blocked or offline', async () => {
    const { options, loadPage } = setup({ loadSdk: vi.fn(async () => Promise.reject(new Error('blocked'))) });
    const started = startMonitoring(options);
    loadPage();
    await expect(started).resolves.toBeUndefined();
    expect(() => reportError(new Error('Kept quietly'))).not.toThrow();
  });
});
