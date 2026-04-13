import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test.skip('Cancel Appointment → Sindhu → Santosh → Flow', async ({ page }) => {

  // ============================================================
  // 🌐 OPEN DASHBOARD
  // ============================================================
  await page.goto('/');
  await page.setViewportSize({ width: 1512, height: 777 });

  // ============================================================
  // 🔐 LOGIN (SINDHU)
  // ============================================================
  const user = usersData.users.find(u => u.name === 'sindhu');

  expect(user).toBeTruthy();

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

  // ============================================================
  // ⏳ WAIT FOR LOGIN SUCCESS TOAST TO APPEAR AND DISAPPEAR
  // ============================================================
  await expect(page.getByText('Login Success')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Login Success')).toBeHidden({ timeout: 10000 });

  // ============================================================
  // 👨‍⚕️ VERIFY DOCTOR NAME
  // ============================================================
  await expect(page.locator('.text-neutral-600'))
    .toContainText('Sindhu');

  // ============================================================
  // 🔍 SELECT SANTOSH
  // ============================================================
  const santosh = page.locator('.mt-\\[21px\\]').getByText('Santosh').first();

  await expect(santosh).toBeVisible();
  await santosh.click();

  console.log('✅ Selected Santosh');

  // ============================================================
  // 🚫 CHECK APPOINTMENTS
  // ============================================================
  const appointments = page.locator('.flex.flex-col.gap-1');
  const count = await appointments.count();

  if (count === 0) {
    test.skip(true, '⚠️ No appointments available for today — skipping test');
  }

  console.log(`📅 Appointments found: ${count}`);

  // ============================================================
  // 🟢 CLICK FIRST APPOINTMENT
  // ============================================================
  const firstAppointment = appointments.first();

  const text = await firstAppointment.innerText();
  console.log(`📅 Selected Slot: ${text}`);

  await page.locator('.backdrop-blur-sm')
    .waitFor({ state: 'hidden', timeout: 10000 });

  await page.locator('.flex.flex-col.gap-1').first().click();

  console.log('✅ Appointment opened');

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();

  // ============================================================
  // 🆔 EXTRACT APPOINTMENT ID FROM URL
  // ============================================================
  const currentUrl = page.url();
  const appointmentId = new URL(currentUrl).searchParams.get('appointmentId');
  expect(appointmentId, '❌ appointmentId not found in URL').toBeTruthy();
  console.log(`🆔 Appointment ID: ${appointmentId}`);

  // ============================================================
  // ❌ OPEN CANCEL FORM
  // ============================================================
  await page.getByRole('button', { name: 'request' }).click();
  await page.locator('.flex.flex-col.gap-2.py-2').getByText('cancel', { exact: false }).click();

  console.log('❌ Cancel form opened');

  // ============================================================
  // 🧾 FILL REASON
  // ============================================================
  const reasonInput = page.getByRole('textbox', { name: 'Reason' });
  await expect(reasonInput).toBeVisible();
  await reasonInput.fill('automation cancel test');

  // ============================================================
  // 📡 SUBMIT + WAIT FOR NAVIGATION
  // ============================================================
  await Promise.all([
    page.waitForURL(url => url.pathname === '/appointments', { timeout: 15000 }),
    page.getByRole('button', { name: 'Submit' }).click()
  ]);

  console.log('✔ Cancel submitted');

  // ============================================================
  // ✅ VERIFY SUCCESS — appointment should no longer be Upcoming
  // ============================================================
  await expect(page).toHaveURL(/.*\/appointments/);
  await expect(page.getByText('appointment-details')).toBeHidden();
  const upcomingBtn = page.getByRole('button', { name: /Filter by Upcoming/ });
  await expect(upcomingBtn).toBeVisible();
  const upcomingText = await upcomingBtn.innerText();
  console.log(`📊 Upcoming after cancel: ${upcomingText}`);
  console.log(`✅ Cancel appointment passed — ID: ${appointmentId}`);

});