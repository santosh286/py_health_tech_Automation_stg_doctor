import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test('Transfer → Sindhu → Santosh → With Next Day Fallback', async ({ page }) => {

  // ============================================================
  // ⚙️ CONFIG — change these as needed
  // ============================================================
  const TRANSFER_LANGUAGE = 'Kannada';   // Options: 'English', 'Kannada', 'Telugu'
  const TRANSFER_REASON   = 'testing for transfer';

  // ============================================================
  // 🌐 OPEN DASHBOARD
  // ============================================================
  await page.goto('/');
  await page.setViewportSize({ width: 1512, height: 777 });

  // ============================================================
  // 🔐 LOGIN
  // ============================================================
  const user = usersData.users.find(u => u.name === 'sindhu');
  expect(user).toBeTruthy();

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

  await expect(page.getByText('Login Success')).toBeVisible({ timeout: 10000 });
  console.log('✅ Login Success toast visible');
  await expect(page.getByText('Login Success')).toBeHidden({ timeout: 15000 });
  console.log('✅ Login Success toast dismissed');

  // ============================================================
  // 👨‍⚕️ SELECT SANTOSH
  // ============================================================
  await expect(page.locator('.text-neutral-600')).toContainText('Sindhu');
  console.log('✅ Verified doctor: Sindhu');

  await page.locator('.mt-\\[21px\\]')
    .getByText('Santosh')
    .first()
    .click();

  console.log('✅ Selected Santosh');

  // ============================================================
  // 🟢 OPEN APPOINTMENT — detect direct nav vs list
  // ============================================================
  // Wait for URL to move away from the dashboard first
  await page.waitForURL(url => url.pathname !== '/', { timeout: 15000 });

  const isOnDetail = page.url().includes('appointment-details');

  if (!isOnDetail) {
    // Landed on appointments list — click first appointment
    await page.locator('.backdrop-blur-sm').waitFor({ state: 'hidden', timeout: 10000 });
    await page.locator('.flex.flex-col.gap-1').first().click();
    console.log('✅ Appointment opened from list');
    await page.waitForURL(url => url.pathname.includes('appointment-details'), { timeout: 15000 });
  } else {
    console.log('✅ Already on consultation detail page');
  }

  await expect(page.getByText('Active Consultation')).toBeVisible({ timeout: 15000 });

  // ============================================================
  // 🆔 EXTRACT APPOINTMENT ID
  // ============================================================
  const appointmentId = new URL(page.url()).searchParams.get('appointmentId');
  expect(appointmentId, '❌ appointmentId not found in URL').toBeTruthy();
  console.log(`🆔 Appointment ID: ${appointmentId}`);

  // ============================================================
  // 🔘 REQUEST → TRANSFER
  // ============================================================
  await page.getByRole('button', { name: /request/i }).click();
  console.log('🔘 Request menu opened');

  await page.locator('.flex.flex-col.gap-2.py-2')
    .getByText(/transfer/i)
    .click();

  console.log('🔁 Transfer form opened');

  // ============================================================
  // 📅 DATE + SLOT — pick today if future slot exists, else next day
  // ============================================================
  const timeToMinutes = (timeStr) => {
    const [time, meridian] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const getDateString = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dateInput = page.locator('input[type="date"]');
  const slotSelect = page.getByRole('combobox', { name: 'Start Time' });

  // Check if today has any future slot
  await expect(slotSelect.locator('option').first()).toBeAttached({ timeout: 10000 });
  const todayOptions = await slotSelect.locator('option').allInnerTexts();
  const hasFutureSlot = todayOptions.some(s => timeToMinutes(s.split(' - ')[0]) > currentMinutes);

  let chosenDate = getDateString(0);
  if (!hasFutureSlot) {
    chosenDate = getDateString(1);
    await dateInput.fill(chosenDate);
    await expect(dateInput).toHaveValue(chosenDate);
    console.log(`📅 No future slots today — switched to next day: ${chosenDate}`);
  } else {
    console.log(`📅 Using today: ${chosenDate}`);
  }

  // Wait for slots to reload after potential date change
  await expect(slotSelect.locator('option').first()).toBeAttached({ timeout: 10000 });
  const allOptions = await slotSelect.locator('option').allInnerTexts();
  console.log(`🕒 Available slots: ${allOptions.join(', ')}`);

  const selected = allOptions.find(s => timeToMinutes(s.split(' - ')[0]) > currentMinutes) || allOptions[0];
  await slotSelect.selectOption({ label: selected });
  console.log(`✅ Selected Slot: ${selected}`);

  // ============================================================
  // 🌐 LANGUAGE + REASON
  // ============================================================
  // Language is a native <select> with no accessible name — target by its placeholder option
  await page.locator('select').filter({ hasText: 'Select language' })
    .selectOption({ label: TRANSFER_LANGUAGE });
  console.log(`🌐 Language set: ${TRANSFER_LANGUAGE}`);

  await page.getByRole('textbox', { name: 'Reason' })
    .fill(TRANSFER_REASON);
  console.log(`📝 Reason filled: ${TRANSFER_REASON}`);

  // ============================================================
  // 🚀 SUBMIT
  // ============================================================
  console.log('🚀 Submitting transfer...');
  const [res] = await Promise.all([
    page.waitForResponse(r =>
      r.url().includes('/bookings/') && r.url().includes('/transfer') &&
      r.request().method() === 'POST',
      { timeout: 15000 }
    ),
    page.getByRole('button', { name: 'Submit' }).click()
  ]);

  const status = res.status();
  expect(status, `❌ Transfer failed with status ${status}`).toBe(200);
  console.log(`✅ Transfer success — date: ${chosenDate}, slot: ${selected}, status: ${status}`);

});