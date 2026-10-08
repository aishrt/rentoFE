import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

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

/**
 * Different dates on each run, so an earlier run that stopped halfway can't be in the way. Three to ten
 * weeks ahead: far enough for a full refund, and before the demo cars' registration and WOF run out.
 */
export function tripQuery(): string {
  const offset = 21 + Math.floor(Math.random() * 50);
  return `start=${nzDay(offset)}&end=${nzDay(offset + 3)}`;
}

/**
 * Trip dates the car is free for: random ones as `tripQuery` picks them, tried again while the API's quote
 * says the car is taken then (a booking from an earlier run that stopped halfway, for instance).
 */
export async function freeTripQuery(request: APIRequestContext, slug: string): Promise<string> {
  const { vehicle } = await (await request.get(`${API_URL}/api/v1/vehicles/${slug}`)).json();
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const query = tripQuery();
    const dates = new URLSearchParams(query);
    const { quote } = await (
      await request.post(`${API_URL}/api/v1/vehicles/${vehicle.id}/quote`, {
        data: { start: dates.get('start'), end: dates.get('end') },
      })
    ).json();
    if (quote?.available) return query;
  }
  throw new Error(`No free dates found for ${slug} in 10 tries`);
}

/** Stripe's card fields live in its own iframe. A saved card from an earlier run needs nothing typed. */
export async function payByCard(page: Page) {
  const stripe = page.frameLocator('iframe[title="Secure payment input frame"]').first();
  const number = stripe.getByLabel('Card number');
  const saved = stripe.getByText(/•••• 4242/).first();
  await expect(number.or(saved).first()).toBeVisible({ timeout: 30_000 });
  if (await number.isVisible()) {
    await number.fill('4242 4242 4242 4242');
    await stripe.getByRole('textbox', { name: /Expiration date|Expiry date/ }).fill('12 / 34');
    await stripe.getByRole('textbox', { name: 'Security code' }).fill('123');
  }
}

/** From the listing to the trip page: Book, the checkout's steps, the Guest Agreement and the card. */
export async function bookFromListing(page: Page, slug: string, action: 'Book' | 'Request to book') {
  const heading = action === 'Book' ? 'Confirm and pay' : 'Request to book';
  const payLabel = action === 'Book' ? 'Confirm and pay' : 'Request to book';

  // The listing prices the trip, then its button opens checkout with the same dates.
  await page.getByRole('link', { name: action, exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/book/${slug}\\?`));
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

  // Trip, protection, then the policies and price. Logged in and verified, so payment opens next.
  for (const step of ['checkout-trip', 'checkout-protection', 'checkout-details']) {
    await page.locator(`#${step}`).getByRole('button', { name: 'Continue' }).click();
  }
  const payment = page.locator('#checkout-payment');
  await expect(payment.getByText('We’re holding these dates for you')).toBeVisible({ timeout: 30_000 });

  await payment.getByRole('checkbox', { name: /I agree to the Guest Agreement/ }).check();
  await payByCard(page);
  await payment.getByRole('button', { name: payLabel }).click();

  await expect(page).toHaveURL(/\/trips\/RV-[A-Z0-9]+$/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split('/').pop()!;
}

/** Cancelling shows the refund first. Weeks ahead, it's all of it. */
export async function cancelForFullRefund(page: Page) {
  await page.getByRole('button', { name: 'Cancel trip' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel this booking?' });
  await expect(dialog.getByText('Refund to your card')).toBeVisible();
  await expect(dialog.getByText('Kept under the cancellation policy')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel booking' }).click();

  await expect(page.getByText('You cancelled this trip')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Refunded in full/)).toBeVisible();
}
