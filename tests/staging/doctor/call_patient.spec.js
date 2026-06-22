import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test('Call Patient - Sindhu → Select Santosh → Call', async ({ page }) => {

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

  // ============================================================
  // 🔍 SELECT "SANTOSH" FROM LIST (.mt-[21px])
  // ============================================================
  const santoshOption = page
    .locator('.mt-\\[21px\\]')
    .getByText('Santosh')
    .first();

  await expect(santoshOption).toBeVisible({ timeout: 10000 });
  await santoshOption.click();

  console.log('✅ Selected Santosh');

  // ============================================================
  // 🚫 CHECK APPOINTMENTS
  // ============================================================
  console.log('📌 Checking appointment availability');

  const appointments = page.locator('.flex.flex-col.gap-1');
  const count = await appointments.count();

  if (count === 0) {
    console.log('❌ No appointments available');
    throw new Error('No appointments available to proceed');
  }

  console.log(`✅ Total appointments found: ${count}`);

  // ============================================================
  // 🟢 CLICK FIRST AVAILABLE SLOT (DYNAMIC)
  // ============================================================
  const firstAppointment = appointments.first();

  const appointmentText = await firstAppointment.innerText();
  console.log(`📅 Selected Slot: ${appointmentText}`);

  await page.locator('.backdrop-blur-sm').waitFor({ state: 'hidden', timeout: 10000 });

  await firstAppointment.scrollIntoViewIfNeeded();
  await firstAppointment.click();

  console.log('✅ Clicked first available appointment');

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();

  // ============================================================
  // 📞 CALL API
  // ============================================================
  const [response] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('/api/v1/calls/connect') &&
      res.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'call Call' }).click()
  ]);

  console.log('📞 Call button clicked');

  // ============================================================
  // ✅ VERIFY API RESPONSE
  // ============================================================
  const status = response.status();
  console.log(`📞 Call API response status: ${status}`);
  expect(status, `❌ Call API failed — expected 200 but got ${status}`).toBe(200);
  console.log('✅ Call API passed — status 200');

});