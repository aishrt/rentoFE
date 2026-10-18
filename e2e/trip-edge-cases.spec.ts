import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { bookFromListing, demoPassword, freeTripQuery, logIn } from './helpers';

/*
 * Milestone 4 Playwright E2E: Operational Edge Cases (spec §28, plan §9 Day 25, plan §8.2).
 *
 * Covers:
 * 1. Guest cancellation preview & policy verification (full refund when far in advance).
 * 2. Missing check-out completed by support staff with Host's odometer and fuel readings.
 * 3. Guest no-show cancellation by support staff for a trip where guest never arrived.
 */

const INSTANT_CAR = '2020-toyota-prius-rotorua';
const GUEST_EMAIL = 'guest@rentovroom.test';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@rentovroom.test';
const BACKEND_DIR = resolve(process.env.E2E_BACKEND_DIR ?? '../backend');

/** Helper to mark a booking ACTIVE with check-in readings so check-out is missing. */
function setBookingActive(bookingRef: string) {
  execSync(`npx tsx scripts/e2e-set-booking-active.ts ${bookingRef}`, {
    cwd: BACKEND_DIR,
    stdio: 'pipe',
  });
}

test.describe('Milestone 4: Operational Edge Cases & Policy Workflows', () => {
  test('edge case 1: guest cancellation refund preview and policy adherence', async ({ page }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(25_000);

    // 1. Guest books an Instant Book car weeks ahead
    await logIn(
      page,
      GUEST_EMAIL,
      demoPassword(),
      `/cars/${INSTANT_CAR}?${await freeTripQuery(page.request, INSTANT_CAR)}`,
    );

    const _ref = await bookFromListing(page, INSTANT_CAR, 'Book');
    await expect(page.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();

    // 2. Open trip cancellation dialog
    await page.getByRole('button', { name: 'Cancel trip' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancel this booking?' });
    await expect(dialog).toBeVisible();

    // 3. Verify refund breakdown adheres to cancellation tier (100% refund when weeks in advance)
    await expect(dialog.getByText('Refund to your card')).toBeVisible();
    await expect(dialog.getByText('Kept under the cancellation policy')).toHaveCount(0);

    // 4. Confirm cancellation
    await dialog.getByRole('button', { name: 'Confirm cancellation' }).click();

    // 5. Verify booking page reflects CANCELLED status
    await expect(page.getByText('Cancelled').first()).toBeVisible({ timeout: 20_000 });
  });

  test('edge case 2: support completes a trip whose check-out is missing', async ({ page, browser }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(25_000);

    // 1. Create a booking
    await logIn(
      page,
      GUEST_EMAIL,
      demoPassword(),
      `/cars/${INSTANT_CAR}?${await freeTripQuery(page.request, INSTANT_CAR)}`,
    );

    const ref = await bookFromListing(page, INSTANT_CAR, 'Book');

    // 2. Mark the trip active with check-in readings
    setBookingActive(ref);

    // 3. Staff opens the booking in the staff portal
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    admin.setDefaultTimeout(25_000);

    await admin.goto(`/admin/login?next=/admin/bookings/${ref}`);
    await admin.getByLabel('Email address').fill(ADMIN_EMAIL);
    await admin.getByLabel('Password', { exact: true }).fill(demoPassword());
    await admin.getByRole('button', { name: 'Log in to the staff portal' }).click();

    await expect(admin.getByRole('heading', { level: 1, name: new RegExp(ref) })).toBeVisible({
      timeout: 25_000,
    });

    // 4. Verify Handover section shows "Complete trip" form for missing check-out
    await expect(admin.getByRole('heading', { name: 'Complete trip' })).toBeVisible();

    // 5. Staff enters Host's final odometer and fuel readings
    await admin.getByLabel('Odometer (km)').fill('45250');
    await admin.getByLabel(/Fuel level|Battery level/i).fill('100');
    await admin.getByLabel(/Notes/i).fill('Host called to confirm vehicle returned in clean condition.');

    // 6. Complete trip
    await admin.getByRole('button', { name: 'Complete trip' }).click();

    // 7. Verify toast and completed status
    await expect(admin.getByText(/Trip completed/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(admin.getByText('Completed').first()).toBeVisible();

    await adminContext.close();
  });

  test('edge case 3: support cancels active trip as guest no-show', async ({ page, browser }) => {
    test.setTimeout(180_000);
    page.setDefaultTimeout(25_000);

    // 1. Create a booking
    await logIn(
      page,
      GUEST_EMAIL,
      demoPassword(),
      `/cars/${INSTANT_CAR}?${await freeTripQuery(page.request, INSTANT_CAR)}`,
    );

    const ref = await bookFromListing(page, INSTANT_CAR, 'Book');

    // 2. Mark active (e.g. host completed check-in, but guest never arrived)
    setBookingActive(ref);

    // 3. Staff opens the booking in staff portal
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    admin.setDefaultTimeout(25_000);

    await admin.goto(`/admin/login?next=/admin/bookings/${ref}`);
    await admin.getByLabel('Email address').fill(ADMIN_EMAIL);
    await admin.getByLabel('Password', { exact: true }).fill(demoPassword());
    await admin.getByRole('button', { name: 'Log in to the staff portal' }).click();

    await expect(admin.getByRole('heading', { level: 1, name: new RegExp(ref) })).toBeVisible({
      timeout: 25_000,
    });

    // 4. Staff clicks "Cancel as a no-show"
    await admin.getByRole('button', { name: 'Cancel as a no-show' }).click();

    const dialog = admin.getByRole('dialog', { name: 'Cancel this booking?' });
    await expect(dialog).toBeVisible();

    // 5. Staff adds an explanation note for the audit log
    await dialog.getByLabel(/Add a note/i).fill('Guest failed to appear at scheduled vehicle pickup time.');

    // 6. Confirm no-show cancellation
    await dialog.getByRole('button', { name: 'Cancel booking' }).click();

    // 7. Verify status updates to Cancelled
    await expect(admin.getByText(/Booking cancelled/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(admin.getByText('Cancelled').first()).toBeVisible();

    await adminContext.close();
  });
});
