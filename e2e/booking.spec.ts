import { expect, test, type Page } from '@playwright/test';
import { demoPassword, logIn, nzDay } from './helpers';

/*
 * A full Guest booking (plan §9, Day 15): a demo Guest opens a car with dates, goes through checkout, pays
 * with Stripe's sandbox test card and lands on the trip. One test books an Instant Book car; the other sends
 * a request that the car's Host accepts, which captures the payment. Both then cancel the trip, which checks
 * the refund preview and frees the dates for the next run.
 *
 * Needs the seeded demo data (`npm run seed` in the backend), sandbox Stripe keys on both sides, and the
 * demo Guest's verified mobile and approved licence, which the seed sets up.
 */

const INSTANT_CAR = '2020-toyota-prius-rotorua';
const REQUEST_CAR = { slug: '2018-honda-jazz-rotorua', hostEmail: 'host.rotorua@rentovroom.test' };
const GUEST_EMAIL = 'guest@rentovroom.test';

/**
 * Different dates on each run, so an earlier run that stopped halfway can't be in the way. Three to ten
 * weeks ahead: far enough for a full refund, and before the demo cars' registration and WOF run out.
 */
function tripQuery(): string {
  const offset = 21 + Math.floor(Math.random() * 50);
  return `start=${nzDay(offset)}&end=${nzDay(offset + 3)}`;
}

/** Stripe's card fields live in its own iframe. A saved card from an earlier run needs nothing typed. */
async function payByCard(page: Page) {
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
async function bookFromListing(page: Page, slug: string, action: 'Book' | 'Request to book') {
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
async function cancelForFullRefund(page: Page) {
  await page.getByRole('button', { name: 'Cancel trip' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel this booking?' });
  await expect(dialog.getByText('Refund to your card')).toBeVisible();
  await expect(dialog.getByText('Kept under the cancellation policy')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel booking' }).click();

  await expect(page.getByText('You cancelled this trip')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Refunded in full/)).toBeVisible();
}

test('a Guest books an Instant Book car with a card, then cancels for a full refund', async ({ page }) => {
  test.setTimeout(240_000);
  await logIn(page, GUEST_EMAIL, demoPassword(), `/cars/${INSTANT_CAR}?${tripQuery()}`);

  const ref = await bookFromListing(page, INSTANT_CAR, 'Book');

  // Paid: the trip page, confirmed, with the details that were held back until now.
  await expect(page.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Receipt' }).getByText('Paid')).toBeVisible();
  await expect(page.getByText(/^Number plate/)).toBeVisible();

  // It's in the Guest's trips.
  await page.getByRole('link', { name: 'All trips' }).click();
  await page.locator(`a[href="/trips/${ref}"]`).click();

  await cancelForFullRefund(page);
});

test('a Guest’s request is authorised, the Host accepts it, and the Guest is charged and booked', async ({
  page,
  browser,
}) => {
  test.setTimeout(300_000);
  await logIn(page, GUEST_EMAIL, demoPassword(), `/cars/${REQUEST_CAR.slug}?${tripQuery()}`);

  const ref = await bookFromListing(page, REQUEST_CAR.slug, 'Request to book');

  // Authorised, not charged, and the exact address stays back until the Host accepts.
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: /^Waiting for/ })
      .first(),
  ).toBeVisible();
  await expect(page.getByText('Authorised on your card, not charged yet')).toBeVisible();
  await expect(page.getByText(/^Number plate/)).toHaveCount(0);

  // The Host, in their own browser, finds the request and accepts it.
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  await logIn(hostPage, REQUEST_CAR.hostEmail, demoPassword(), '/host/bookings');
  const request = hostPage
    .getByRole('listitem')
    .filter({ has: hostPage.locator(`a[href="/host/bookings/${ref}"]`) });
  await expect(request.getByText('Request to answer')).toBeVisible();
  await request.getByRole('button', { name: 'Accept' }).click();
  await expect(request).toHaveCount(0, { timeout: 30_000 });

  // Accepted: the Host sees it confirmed, with the Guest's mobile.
  await hostPage.goto(`/host/bookings/${ref}`);
  await expect(hostPage.getByRole('status').filter({ hasText: 'Confirmed' }).first()).toBeVisible();
  await expect(hostPage.getByRole('link', { name: /^\+64/ })).toBeVisible();
  await hostContext.close();

  // The Guest is charged and booked, and can still cancel for a full refund.
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Receipt' }).getByText('Paid')).toBeVisible();
  await expect(page.getByText(/^Number plate/)).toBeVisible();

  await cancelForFullRefund(page);
});
