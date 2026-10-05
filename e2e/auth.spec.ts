import { expect, test } from '@playwright/test';
import { demoPassword, logIn } from './helpers';

/* Sign-up and log-in (plan §9, Day 15), on the desktop and on a phone. */

test('a visitor signs up and is signed in, with a link sent to confirm their email', async ({
  page,
}, testInfo) => {
  const email = `e2e.${testInfo.project.name}.${Date.now()}@rentovroom.test`;
  await page.goto('/signup');
  await page.getByLabel('First name').fill('Tama');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('a quiet harbour at dawn');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/verify-email/);
  await expect(page.getByText(email)).toBeVisible();
});

test('a demo Guest logs in and out', async ({ page }) => {
  await logIn(page, 'guest@rentovroom.test', demoPassword());
  const menu = page.getByRole('button', { name: 'Account menu for Kiri' });
  await expect(menu).toBeVisible();
  await menu.click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();
});

// An address with no account gets the same message, and repeated runs never lock a demo account.
test('a wrong email or password is refused with a clear message', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill('nobody.e2e@rentovroom.test');
  await page.getByLabel('Password', { exact: true }).fill('not the right password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toContainText("don't match our records");
});
