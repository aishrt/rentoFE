import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end tests (plan §9, Day 15): sign-up, log-in and a full Guest booking, in a real browser
 * against a running backend (plan §2.4: "the backend must be running"). They use the installed
 * Microsoft Edge, so nothing extra is downloaded.
 *
 *   cd backend && npm run dev            # the API, with the frontend's e2e port in FRONTEND_ORIGINS
 *   cd frontend && npm run e2e
 *
 * E2E_API_URL is the API (http://localhost:4000 by default); E2E_DEMO_PASSWORD is the backend's
 * SEED_DEMO_PASSWORD, for the demo accounts. The booking test pays with Stripe's sandbox test card, so
 * the backend needs sandbox keys (sk_test_) and this build a pk_test_ key.
 */

const port = Number(process.env.E2E_PORT ?? 4330);
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:4000';

export default defineConfig({
  testDir: 'e2e',
  // Real payments with the sandbox and real emails queued; one test at a time keeps them apart.
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge',
    locale: 'en-NZ',
    timezoneId: 'Pacific/Auckland',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Edge'], channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge' },
    },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'], channel: process.env.E2E_BROWSER_CHANNEL ?? 'msedge' },
      // The booking runs once, on the desktop; phones check sign-up and log-in.
      testIgnore: /booking/,
    },
  ],
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    env: { VITE_API_URL: apiUrl },
    timeout: 60_000,
  },
});
