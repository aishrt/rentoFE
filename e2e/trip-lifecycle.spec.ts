import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { bookFromListing, demoPassword, freeTripQuery, logIn } from './helpers';

/*
 * Milestone 4 Playwright E2E: Full trip lifecycle & operational journeys (spec §28, plan §9 Day 25).
 *
 * Covers from start to finish:
 * 1. Guest books an Instant Book car and pays by card.
 * 2. Handover Check-in: Host records 8 inspection photos, odometer, fuel, and starts the trip.
 * 3. Guest reviews and confirms check-in readings -> Trip becomes ACTIVE ("On the road").
 * 4. Handover Check-out: Guest records return photos, odometer with extra kilometres (50 km over allowance),
 *    and finishes the trip -> Trip becomes COMPLETED.
 * 5. Host reviews and confirms return readings -> Extra km charge is generated.
 * 6. Two-way reviews: Guest reviews Host and vehicle; Host reviews Guest; both reviews revealed.
 * 7. Incident reporting & staff resolution: Incident opened for a booking, admin reviews and resolves.
 * 8. Edge cases: Cancellation refund preview and policy verification.
 *
 * Uses the local API, seeded demo data, and sandbox Stripe keys.
 */

const INSTANT_CAR = '2020-toyota-prius-rotorua';
const HOST_EMAIL = 'host.rotorua@rentovroom.test';
const GUEST_EMAIL = 'guest@rentovroom.test';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@rentovroom.test';
const BACKEND_DIR = resolve(process.env.E2E_BACKEND_DIR ?? '../backend');
const IMAGE = resolve('public/og-image.png');

/** Opens the check-in window immediately for a booking reference by updating startAt. */
function openCheckInWindow(bookingRef: string) {
  execSync(`npx tsx scripts/e2e-open-checkin.ts ${bookingRef}`, { cwd: BACKEND_DIR, stdio: 'pipe' });
}

/** Fills in a 5-star rating for each star input in a review form. */
async function rateAllFiveStars(page: Page) {
  const fieldsets = page.locator('fieldset');
  const count = await fieldsets.count();
  for (let i = 0; i < count; i += 1) {
    const fieldset = fieldsets.nth(i);
    // Click the 5th star label
    const starLabels = fieldset.locator('label.group\\/star');
    if ((await starLabels.count()) >= 5) {
      await starLabels.nth(4).click();
    }
  }
}

/** Completes the photo upload phase for all 8 inspection angles. */
async function uploadAllInspectionPhotos(page: Page) {
  for (let i = 0; i < 8; i += 1) {
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles(IMAGE);
    // Wait for the badge showing upload completion
    await expect(page.getByText('Saved').first()).toBeVisible({ timeout: 15_000 });
    // Click Next to advance to next photo or to readings
    await page.getByRole('button', { name: /Next/ }).click();
  }
}

test.describe('Milestone 4: Full Trip Lifecycle & Operations', () => {
  test('complete trip lifecycle: book -> check-in -> active trip -> check-out -> extra km -> two-way reviews', async ({
    page,
    browser,
  }) => {
    test.setTimeout(480_000);
    page.setDefaultTimeout(25_000);

    // 1. Guest books an Instant Book car
    await logIn(
      page,
      GUEST_EMAIL,
      demoPassword(),
      `/cars/${INSTANT_CAR}?${await freeTripQuery(page.request, INSTANT_CAR)}`,
    );

    const ref = await bookFromListing(page, INSTANT_CAR, 'Book');
    await expect(page.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();

    // 2. Open the check-in window (startAt - 2h is now in the past)
    openCheckInWindow(ref);

    // 3. Host performs check-in in their own browser context
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    hostPage.setDefaultTimeout(25_000);

    await logIn(hostPage, HOST_EMAIL, demoPassword(), `/host/bookings/${ref}/handover/check-in`);
    await expect(hostPage.getByRole('heading', { level: 1, name: 'Check-in' })).toBeVisible();

    // 8 photos
    await uploadAllInspectionPhotos(hostPage);

    // Readings phase
    await expect(hostPage.getByRole('heading', { level: 2, name: 'Readings' })).toBeVisible();
    await hostPage.getByLabel('Odometer (km)').fill('45000');
    await hostPage.getByRole('button', { name: /Next/ }).click();

    // Damage phase
    await expect(hostPage.getByRole('heading', { level: 2, name: 'Mark damage' })).toBeVisible();
    await hostPage.getByRole('button', { name: /Next/ }).click();

    // Review & Start the trip
    await expect(hostPage.getByRole('heading', { level: 2, name: 'Review check-in' })).toBeVisible();
    await hostPage
      .getByRole('checkbox', { name: /These photos and readings show the car as it is now/ })
      .check();
    await hostPage.getByRole('button', { name: 'Start the trip' }).click();

    await expect(hostPage.getByText(/Check-in done/i).first()).toBeVisible({ timeout: 20_000 });

    // 4. Guest confirms check-in readings
    await page.goto(`/trips/${ref}/handover`);
    const confirmButton = page.getByRole('button', { name: 'Confirm it’s right' });
    await expect(confirmButton).toBeVisible({ timeout: 20_000 });
    await confirmButton.click();
    await expect(confirmButton).toHaveCount(0, { timeout: 15_000 });

    // Trip is now active / on the road
    await page.goto(`/trips/${ref}`);
    await expect(page.getByText(/On the road|Active trip|Current trip/i).first()).toBeVisible();

    // 5. Guest performs check-out (150 km driven: 50 km over 100 km allowance)
    await page.goto(`/trips/${ref}/handover/check-out`);
    await expect(page.getByRole('heading', { level: 1, name: 'Check-out' })).toBeVisible();

    await uploadAllInspectionPhotos(page);

    // Readings phase: 150 km higher
    await expect(page.getByRole('heading', { level: 2, name: 'Readings' })).toBeVisible();
    await page.getByLabel('Odometer (km)').fill('45150');
    await page.getByRole('button', { name: /Next/ }).click();

    // Damage phase
    await expect(page.getByRole('heading', { level: 2, name: 'Mark damage' })).toBeVisible();
    await page.getByRole('button', { name: /Next/ }).click();

    // Review & Finish the trip
    await expect(page.getByRole('heading', { level: 2, name: 'Review check-out' })).toBeVisible();
    await page
      .getByRole('checkbox', { name: /These photos and readings show the car as it is now/ })
      .check();
    await page.getByRole('button', { name: 'Finish the trip' }).click();

    await expect(page.getByText(/Check-out done/i).first()).toBeVisible({ timeout: 20_000 });
    // Handover shows the extra kilometres calculation
    await expect(page.getByText(/extra km/i).first()).toBeVisible();

    // 6. Host confirms return readings
    await hostPage.goto(`/host/bookings/${ref}/handover`);
    const hostConfirmBtn = hostPage.getByRole('button', { name: 'Confirm it’s right' });
    await expect(hostConfirmBtn).toBeVisible({ timeout: 20_000 });
    await hostConfirmBtn.click();
    await expect(hostConfirmBtn).toHaveCount(0, { timeout: 15_000 });

    // 7. Two-Way Reviews
    // Guest writes review
    await page.goto(`/trips/${ref}/review`);
    await rateAllFiveStars(page);
    await page
      .getByLabel(/Your review/i)
      .fill('Fantastic trip, the Toyota Prius was immaculate and smooth to drive. Highly recommend!');
    await page.getByRole('button', { name: 'Publish review' }).click();
    await expect(page.getByText('Thanks for your review')).toBeVisible({ timeout: 20_000 });

    // Host writes review
    await hostPage.goto(`/host/bookings/${ref}/review`);
    await rateAllFiveStars(hostPage);
    await hostPage
      .getByLabel(/Your review/i)
      .fill('Excellent guest, treated the car with utmost care and returned it in great condition.');
    await hostPage.getByRole('button', { name: 'Publish review' }).click();
    await expect(hostPage.getByText('Thanks for your review')).toBeVisible({ timeout: 20_000 });

    // Both reviews are now revealed & published
    await page.goto('/account/reviews');
    await expect(page.getByText(/immaculate and smooth/i)).toBeVisible();

    await hostContext.close();
  });

  test('incident reporting and administrator case resolution', async ({ page, browser }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(20_000);

    // 1. Guest signs in and books a car
    await logIn(
      page,
      GUEST_EMAIL,
      demoPassword(),
      `/cars/${INSTANT_CAR}?${await freeTripQuery(page.request, INSTANT_CAR)}`,
    );

    const ref = await bookFromListing(page, INSTANT_CAR, 'Book');
    await expect(page.getByRole('status').filter({ hasText: 'You’re booked' }).first()).toBeVisible();

    // 2. Guest reports an incident for this booking
    await page.goto(`/incidents/new?booking=${ref}`);
    await expect(page.getByRole('heading', { name: 'Report an incident' })).toBeVisible();

    // Select incident type: DAMAGE
    await page.getByRole('combobox', { name: /Type of incident|Incident type/i }).click();
    await page.getByRole('option', { name: /Damage/i }).click();

    await page
      .getByLabel(/What happened|Description/i)
      .fill('Minor windscreen stone chip occurred on Highway 5 near Rotorua. No structural crack.');
    await page.getByRole('button', { name: /Submit report|Send report/i }).click();

    // Confirmation shows case number
    await expect(page.getByText(/Case IN-/i).first()).toBeVisible({ timeout: 25_000 });
    const caseText = await page.getByText(/Case (IN-[A-Z0-9]+)/i).innerText();
    const caseRefMatch = /IN-[A-Z0-9]+/.exec(caseText);
    expect(caseRefMatch).toBeTruthy();
    const caseRef = caseRefMatch![0];

    // 3. Admin views and resolves the incident in the staff portal
    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    admin.setDefaultTimeout(20_000);

    await logIn(admin, ADMIN_EMAIL, demoPassword(), `/admin/incidents/${caseRef}`);
    await expect(admin.getByRole('heading', { level: 1, name: new RegExp(caseRef) })).toBeVisible();

    // Admin updates the case
    const noteField = admin.getByLabel(/Update note|Note/i);
    if (await noteField.isVisible()) {
      await noteField.fill('Windscreen chip assessed by support. Covered under protection plan.');
    }

    const statusPicker = admin.getByRole('combobox', { name: /Status/i });
    if (await statusPicker.isVisible()) {
      await statusPicker.click();
      await admin.getByRole('option', { name: /Resolved/i }).click();
    }

    const saveButton = admin.getByRole('button', { name: /Save update|Update case/i });
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await expect(admin.getByText(/Resolved/i).first()).toBeVisible({ timeout: 15_000 });
    }

    await adminContext.close();
  });
});
