import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test('Send Reminder - Sindhu → Santosh → Reminder', async ({ page }) => {

  // ============================================================
  // 🌐 OPEN DASHBOARD
  // ============================================================
  await page.goto('/');
  await page.setViewportSize({ width: 1512, height: 777 });

  // ============================================================
  // 🔐 LOGIN (SINDHU)
  // ============================================================
  const user = usersData.users.find(u => u.name === 'sindhu');

  expect(user, 'User should exist').toBeTruthy();

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

  // ============================================================
  // 👨‍⚕️ VERIFY DOCTOR NAME
  // ============================================================
  await expect(page.locator('.text-neutral-600'))
    .toContainText('Sindhu', { timeout: 10000 });

  console.log('✅ Login successful — Sindhu verified');

  // ============================================================
  // 🔍 SELECT "SANTOSH"
  // ============================================================
  const santoshOption = page
    .locator('.mt-\\[21px\\]')
    .getByText('Santosh')
    .first();

  await expect(santoshOption).toBeVisible({ timeout: 10000 });
  await santoshOption.click();

  console.log('✅ Selected Santosh — navigated to consultation page');

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();

  console.log('✅ Consultation page verified');

  // ============================================================
  // 📩 SEND REMINDER
  // ============================================================
  const [response] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('/events') &&
      res.request().method() === 'POST'
    ),
    page.getByRole('button', { name: /Send Reminder/i }).click()
  ]);

  console.log('📩 Send Reminder button clicked');

  // ============================================================
  // ✅ VERIFY API RESPONSE
  // ============================================================
  const status = response.status();
  console.log(`📡 Send Reminder API response status: ${status}`);
  expect(status, `❌ Send Reminder API failed — expected 200 but got ${status}`).toBe(200);
  console.log('✅ Send Reminder passed — status 200');

});