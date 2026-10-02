import { expect, test } from '@playwright/test';
import { bookFromListing, cancelForFullRefund, demoPassword, logIn, tripQuery } from './helpers';

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
