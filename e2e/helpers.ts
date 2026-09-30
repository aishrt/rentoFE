import { expect, type Page } from '@playwright/test';

/** The backend's SEED_DEMO_PASSWORD, for the demo accounts `npm run seed` creates. */
export function demoPassword(): string {
  const password = process.env.E2E_DEMO_PASSWORD;
  if (!password)
    throw new Error('Set E2E_DEMO_PASSWORD to the backend’s SEED_DEMO_PASSWORD to run this test.');
  return password;
}

/** Logs in through the website, landing on `next` (the homepage by default). */
export async function logIn(page: Page, email: string, password: string, next = '/') {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/[?]/g, '\\?')}$`));
}

/** A date and time a number of days from now, in NZ time, as the website puts it in URLs. */
export function nzDay(daysFromNow: number, time = '10:00'): string {
  const date = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland' }).format(date);
  return `${day}T${time}`;
}
