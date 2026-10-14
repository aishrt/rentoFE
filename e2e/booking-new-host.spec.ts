import { execSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { bookFromListing, cancelForFullRefund, demoPassword, logIn, tripQuery } from './helpers';

/*
 * The Phase 2 deliverable from start to finish (MILESTONES.md, Day 15): "a test Host can list a car and
 * receive the booking, and a test Guest can find the car and book it." A new Host signs up, confirms their
 * email, applies, verifies their identity, and lists a car through all six steps with its documents and
 * photos. The admin approves the Host and the car, which waits for the Host's payout setup before it goes live (plan §8.2). Once that's
 * done, the demo Guest finds it in search, sends a request and pays. The Host accepts, the Guest is booked and
 * gets a receipt, then cancels for a full refund, and the Host hides the car again.
 *
 * Runs against a local API with the console mailer (its emails are read from backend/.mail), the stand-in
 * SMS driver (SMS_DRIVER=dummy, its SMS_DUMMY_CODE passed here as E2E_SMS_CODE), the seeded demo data and
 * Stripe's sandbox. Stripe's hosted identity check and payout setup can't be filled in by a test, so
 * backend/scripts/e2e-identity-check.ts and e2e-payout-setup.ts stand in for them, on the database in
 * backend/.env (the local API's).
 */

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
const MAIL_DIR = resolve(process.env.E2E_MAIL_DIR ?? '../backend/.mail');
const BACKEND_DIR = resolve(process.env.E2E_BACKEND_DIR ?? '../backend');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@rentovroom.test';
const GUEST_EMAIL = 'guest@rentovroom.test';
/** Any picture will do: the photo checks only flag small or dark photos, they never block them. */
const IMAGE = resolve('public/og-image.png');

const PHOTOS = [
  'Front',
  'Driver side',
  'Rear',
  'Passenger side',
  'Interior',
  'Dashboard and odometer',
  'Boot',
  'Tyres',
];
const DOCUMENTS = ['Registration (rego)', 'Warrant of Fitness (WOF)', 'Insurance'];

function smsCode(): string {
  const code = process.env.E2E_SMS_CODE;
  if (!code) throw new Error('Set E2E_SMS_CODE to the API’s SMS_DUMMY_CODE (run it with SMS_DRIVER=dummy).');
  return code;
}

const pick = (characters: string, length: number) =>
  Array.from({ length }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
// Plates and VINs leave out I, O and Q, which a VIN may not contain.
const PLATE_CHARACTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';

/** The newest email confirmation link written since `since`. The tests run one at a time, so it's ours. */
async function confirmationPath(since: number): Promise<string> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const names = await readdir(MAIL_DIR).catch(() => [] as string[]);
    const fresh = (
      await Promise.all(
        names.map(async (name) => ({ name, time: (await stat(join(MAIL_DIR, name))).mtimeMs })),
      )
    )
      .filter((file) => file.time >= since)
      .sort((a, b) => b.time - a.time);
    for (const { name } of fresh) {
      const link = /href="([^"]*\/verify-email\?token=[^"]+)"/.exec(
        await readFile(join(MAIL_DIR, name), 'utf8'),
      )?.[1];
      if (link) {
        const url = new URL(link.replace(/&amp;/g, '&'));
        return `${url.pathname}${url.search}`;
      }
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`No email confirmation link arrived in ${MAIL_DIR}`);
}

/** Whether an email containing every one of `texts` was written since `since`. */
async function emailArrived(since: number, texts: string[]): Promise<boolean> {
  const names = await readdir(MAIL_DIR).catch(() => [] as string[]);
  for (const name of names) {
    if ((await stat(join(MAIL_DIR, name))).mtimeMs < since) continue;
    const html = await readFile(join(MAIL_DIR, name), 'utf8');
    if (texts.every((text) => html.includes(text))) return true;
  }
  return false;
}

/** A text field by its label. (Some forms share their field's label, so the role matters.) */
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

/** The site's themed dropdowns, named by their label then their value: open one, choose the option. */
async function choose(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click();
  await page.getByRole('option', { name: option }).first().click();
}

/** A date picker: a few months ahead, on the 15th. */
async function pickDate(page: Page, label: RegExp, monthsAhead: number) {
  await page.getByRole('button', { name: label }).click();
  const calendar = page.getByRole('dialog');
  for (let month = 0; month < monthsAhead; month += 1) {
    await calendar.getByRole('button', { name: 'Next month' }).click();
  }
  await calendar.getByRole('button', { name: /, 15 [A-Z][a-z]+ \d{4}$/ }).click();
}

/** The upload buttons open the file picker; answer it with the test image. */
async function upload(page: Page, button: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: button, exact: true }).click();
  await (await chooser).setFiles(IMAGE);
}

const next = (page: Page, label = 'Continue') =>
  page.getByRole('button', { name: label, exact: true }).click();

/** The car's slug if it's in search near Ponsonby, where the Host lists it. */
async function findInSearch(page: Page, vehicleId: string): Promise<string | undefined> {
  const found = await (
    await page.request.get(`${API_URL}/api/v1/search?where=Ponsonby&sort=newest&pageSize=48`)
  ).json();
  return (found.results as { id: string; slug: string }[]).find((car) => car.id === vehicleId)?.slug;
}

/** What a passed check leaves behind when the Host verifies their identity on Stripe's pages. */
function passIdentityCheck(email: string) {
  execSync(`npx tsx scripts/e2e-identity-check.ts ${email}`, { cwd: BACKEND_DIR, stdio: 'pipe' });
}

/** What Stripe's `account.updated` webhook does when the Host finishes payout setup on Stripe's pages. */
function finishPayoutSetup(email: string) {
  execSync(`npx tsx scripts/e2e-payout-setup.ts ${email}`, { cwd: BACKEND_DIR, stdio: 'pipe' });
}

test('a new Host lists a car, the admin approves it, and a Guest books it', async ({ page, browser }) => {
  test.setTimeout(480_000);
  // A step that can't go on fails within seconds, not at the end of the test's time.
  page.setDefaultTimeout(20_000);
  const lastName = `Tester${pick(LETTERS, 6)}`;
  const hostName = `Rawiri ${lastName}`;
  const hostEmail = `e2e.host.${Date.now()}@rentovroom.test`;
  const plate = `E${pick(PLATE_CHARACTERS, 5)}`;

  // 1. The Host signs up and confirms their email (the admin can't approve an unconfirmed Host).
  const signedUpAt = Date.now() - 1000;
  await page.goto('/signup');
  await page.getByLabel('First name').fill('Rawiri');
  await page.getByLabel('Last name').fill(lastName);
  await page.getByLabel('Email address').fill(hostEmail);
  await page.getByLabel('Password', { exact: true }).fill('a long drive to the cape');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/verify-email/);
  await page.goto(await confirmationPath(signedUpAt));
  await expect(page.getByRole('heading', { name: 'Email confirmed' })).toBeVisible();

  // 2. The Host application: a verified mobile and the Host Agreement.
  await page.goto('/host/apply');
  await field(page, 'Mobile number').fill(`021 ${pick('0123456789', 3)} ${pick('0123456789', 4)}`);
  await page.getByRole('button', { name: 'Text me a code' }).click();
  await field(page, 'Code').fill(smsCode());
  await page.getByRole('button', { name: 'Verify number' }).click();
  await expect(page.getByText(/is verified\./)).toBeVisible();
  await page.getByRole('checkbox', { name: /Host Agreement/ }).check();
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page).toHaveURL(/\/host\/vehicles\/[a-f0-9]{24}/, { timeout: 30_000 });
  const vehicleId = /\/host\/vehicles\/([a-f0-9]{24})/.exec(page.url())![1]!;
  // Hosts pass the identity check before they're approved (the identityForHosts setting).
  passIdentityCheck(hostEmail);

  // 3. The six steps. Step 1: the car.
  await field(page, 'Number plate').fill(plate);
  await field(page, 'VIN').fill(pick(PLATE_CHARACTERS, 17));
  await page.getByRole('combobox', { name: 'Make', exact: true }).fill('Toyota');
  await page.getByRole('option', { name: 'Toyota', exact: true }).click();
  await field(page, 'Model').fill('Corolla');
  await field(page, 'Year').fill('2021');
  await choose(page, 'Body type', 'Hatchback');
  await choose(page, 'Fuel type', 'Petrol');
  // The choice cards hide their radio button; a person clicks the card.
  await page
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: /^Automatic/ }) })
    .click();
  await expect(page.getByRole('radio', { name: /^Automatic/ })).toBeChecked();
  await choose(page, 'Seats', /^5\b/);
  await choose(page, 'Doors', /^5\b/);
  await next(page);

  // Step 2: rego and WOF expiry (well after the trip), and the three required documents.
  await expect(page.getByRole('heading', { name: 'Documents', exact: true })).toBeVisible();
  await pickDate(page, /^Registration expires/, 5);
  await pickDate(page, /^WOF expires/, 5);
  for (const label of DOCUMENTS) {
    await upload(page, `Upload ${label}`);
    await expect(page.getByRole('button', { name: `Upload another ${label}`, exact: true })).toBeVisible({
      timeout: 30_000,
    });
  }
  await next(page);

  // Step 3: the eight required photos.
  await expect(page.getByRole('heading', { name: 'Photos', exact: true })).toBeVisible();
  for (const label of PHOTOS) {
    await upload(page, `Choose the ${label.toLowerCase()} photo`);
    await expect(page.getByRole('button', { name: `Replace the ${label.toLowerCase()} photo` })).toBeVisible({
      timeout: 30_000,
    });
  }
  await expect(page.getByText('8 of 8 required photos added.')).toBeVisible();
  await next(page);

  // Step 4: the price, with unlimited kilometres.
  await field(page, 'Price per day (NZD)').fill('89');
  const unlimited = page.getByRole('switch', { name: 'Unlimited kilometres' });
  if ((await unlimited.getAttribute('aria-checked')) !== 'true') await unlimited.click();
  await next(page);

  // Step 5: availability as it comes, with Instant Book off, so the Guest's booking is a request.
  await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeVisible();
  await next(page);

  // Step 6: where guests pick the car up.
  await field(page, 'Street number').fill('12');
  await field(page, 'Street').fill('Ponsonby Road');
  await page.getByRole('combobox', { name: 'Suburb or town', exact: true }).fill('Ponsonby');
  await page
    .getByRole('option', { name: /Ponsonby/ })
    .first()
    .click();
  await choose(page, 'Region', 'Auckland');
  await field(page, 'Postcode').fill('1011');
  await next(page, 'Review');

  // Review and submit.
  await expect(page.getByText(/^Everything.s in place/)).toBeVisible();
  await next(page, 'Submit for review');
  await expect(page.getByText('Under review').first()).toBeVisible({ timeout: 30_000 });

  // 4. The admin approves the Host, then the car.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  admin.setDefaultTimeout(20_000);
  // The log-in page is under /admin too, so wait for the page it sends the admin on to.
  await admin.goto('/admin/login?next=/admin/host-applications');
  await admin.getByLabel('Email address').fill(ADMIN_EMAIL);
  await admin.getByLabel('Password', { exact: true }).fill(demoPassword());
  await admin.getByRole('button', { name: 'Log in to the staff portal' }).click();
  await expect(admin).toHaveURL(/\/admin\/host-applications$/);
  await admin.getByRole('button', { name: `Approve ${hostName}`, exact: true }).click();
  await admin
    .getByRole('dialog', { name: `Approve ${hostName}?` })
    .getByRole('button', { name: 'Approve', exact: true })
    .click();
  await expect(admin.getByText(/is approved to host/).first()).toBeVisible();

  await admin.goto(`/admin/vehicles/${vehicleId}`);
  await admin.getByRole('button', { name: 'Approve listing' }).click();
  await admin
    .getByRole('dialog', { name: 'Approve this listing?' })
    .getByRole('button', { name: 'Approve listing' })
    .click();
  await expect(admin.getByText(/Listing approved/).first()).toBeVisible();
  await adminContext.close();

  // 5. Approved, the car waits for payout setup, so the Host can be paid for its trips (plan §8.2).
  expect(await findInSearch(page, vehicleId), 'the car waits for payout setup').toBeUndefined();
  await page.goto('/host/earnings');
  await expect(page.getByRole('button', { name: 'Set up payouts' })).toBeVisible();
  finishPayoutSetup(hostEmail);
  await page.reload();
  await expect(page.getByText('Payouts are set up')).toBeVisible();

  // 6. The car is in search now; the demo Guest finds it there and sends a request.
  const slug = await findInSearch(page, vehicleId);
  expect(slug, 'the approved car is in search').toBeTruthy();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  guest.setDefaultTimeout(20_000);
  await logIn(guest, GUEST_EMAIL, demoPassword(), `/cars/${slug}?${tripQuery()}`);
  const requestedAt = Date.now() - 1000;
  const ref = await bookFromListing(guest, slug!, 'Request to book');
  await expect(guest.getByText('Authorised on your card, not charged yet')).toBeVisible();

  // 7. The Host receives the booking, by email and on their bookings page, and accepts it.
  await expect
    .poll(() => emailArrived(requestedAt, [ref, 'Accept or decline']), { timeout: 30_000 })
    .toBe(true);
  await page.goto('/host/bookings');
  const request = page.getByRole('listitem').filter({ has: page.locator(`a[href="/host/bookings/${ref}"]`) });
  await expect(request.getByText('Request to answer')).toBeVisible();
  await request.getByRole('button', { name: 'Accept' }).click();
  await expect(request).toHaveCount(0, { timeout: 30_000 });

  // The Guest is charged and booked, and gets a receipt.
  await guest.reload();
  await expect(guest.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();
  await expect(guest.getByRole('region', { name: 'Receipt' }).getByText('Paid')).toBeVisible();
  await expect
    .poll(() => emailArrived(requestedAt, [`Receipt for booking ${ref}`]), { timeout: 30_000 })
    .toBe(true);

  // 8. Tidy up: the Guest cancels for a full refund, and the Host takes the car out of search.
  await cancelForFullRefund(guest);
  await guestContext.close();
  await page.goto(`/host/vehicles/${vehicleId}`);
  await page.getByRole('button', { name: 'Hide from search' }).click();
  await expect(page.getByRole('button', { name: 'Show in search' })).toBeVisible();
});
