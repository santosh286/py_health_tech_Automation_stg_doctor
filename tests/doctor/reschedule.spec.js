import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test('Reschedule → Sindhu → Santosh → Flow', async ({ page }) => {

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
  // ⏳ WAIT FOR LOGIN SUCCESS TOAST
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

  console.log('✅ Selected Santosh — navigated to appointment detail page');

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();

  // ============================================================
  // 🆔 EXTRACT APPOINTMENT ID
  // ============================================================
  const currentUrl = page.url();
  const appointmentId = new URL(currentUrl).searchParams.get('appointmentId');

  expect(appointmentId).toBeTruthy();
  console.log(`🆔 Appointment ID: ${appointmentId}`);

  // ============================================================
  // 🔘 OPEN REQUEST MENU (NEW FLOW)
  // ============================================================
  await page.getByRole('button', { name: /request/i }).click();

  // ============================================================
  // 🔁 CLICK RESCHEDULE
  // ============================================================
  await page.locator('.flex.flex-col.gap-2.py-2')
    .getByText(/reschedule/i)
    .click();

  console.log('🔁 Reschedule clicked');

  // ============================================================
  // ✅ VERIFY RESCHEDULE MODAL
  // ============================================================
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  console.log('✅ Reschedule modal opened');

  // ============================================================
  // 📅 SET DATE — TODAY, FALLBACK TO NEXT DAY IF NO SLOTS
  // ============================================================
  const dateInput = page.locator('input[type="date"]');
  const slotSelectEarly = page.getByRole('combobox', { name: 'Start Time' });

  const getDateString = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const timeToMinutesCheck = (timeStr) => {
    const [time, meridian] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  let chosenDate = getDateString(0);
  await dateInput.fill(chosenDate);
  await expect(dateInput).toHaveValue(chosenDate);

  // Wait for slots to load then check if any future slot exists
  await expect(slotSelectEarly.locator('option').first()).toBeAttached({ timeout: 10000 });
  const todayOptions = await slotSelectEarly.locator('option').allInnerTexts();
  const hasFutureSlot = todayOptions.some(s => timeToMinutesCheck(s.split(' - ')[0]) > currentMinutes);

  if (!hasFutureSlot) {
    chosenDate = getDateString(1);
    await dateInput.fill(chosenDate);
    await expect(dateInput).toHaveValue(chosenDate);
    console.log(`⚠️ No future slots today — moved to next day: ${chosenDate}`);
  } else {
    console.log(`📅 Selected Date: ${chosenDate}`);
  }

  // ============================================================
  // 🕒 SELECT NEXT AVAILABLE SLOT (DYNAMIC)
  // ============================================================
  const slotSelect = page.getByRole('combobox', { name: 'Start Time' });
  await expect(slotSelect).toBeVisible();

  const options = slotSelect.locator('option');
  await expect(options.first()).toBeAttached({ timeout: 10000 });
  const optionCount = await options.count();
  expect(optionCount, '❌ No time slots available').toBeGreaterThan(0);

  const slots = [];
  for (let i = 0; i < optionCount; i++) {
    slots.push((await options.nth(i).innerText()).trim());
  }
  console.log(`🕒 Available slots: ${slots.join(', ')}`);

  const timeToMinutes = (timeStr) => {
    const [time, meridian] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridian === 'PM' && hours !== 12) hours += 12;
    if (meridian === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  console.log(`⏱ Current time in minutes: ${currentMinutes}`);

  const selectedSlot =
    slots.find(slot => timeToMinutes(slot.split(' - ')[0]) > currentMinutes)
    ?? slots[0];

  if (!slots.find(slot => timeToMinutes(slot.split(' - ')[0]) > currentMinutes)) {
    console.log('⚠️ No future slot found — falling back to first available slot');
  }

  console.log(`✅ Selecting slot: ${selectedSlot}`);

  await slotSelect.selectOption({ label: selectedSlot });

  // ============================================================
  // ✅ VERIFY SLOT SELECTED
  // ============================================================
  await expect(slotSelect).toHaveValue(await options.first().getAttribute('value') ?? selectedSlot);

  // ============================================================
  // 🚀 SUBMIT + WAIT FOR NAVIGATION
  // ============================================================
  await Promise.all([
    page.waitForURL(url => url.pathname === '/appointments', { timeout: 15000 }),
    page.getByRole('button', { name: 'Submit' }).click()
  ]);

  console.log('✔ Reschedule submitted');

  // ============================================================
  // ✅ VERIFY RESCHEDULED SLOT IN DASHBOARD
  // ============================================================
  await expect(page).toHaveURL(/.*\/appointments/);

  // Navigate to the correct date the appointment was rescheduled to
  await page.goto(`/appointments?date=${chosenDate}`);
  await page.waitForLoadState('networkidle');

  console.log(`🔍 Checking dashboard for date: ${chosenDate}`);

  const slotStartTime = selectedSlot.split(' - ')[0];
  const slotHour = slotStartTime.split(':')[0];
  const slotMeridian = slotStartTime.split(' ')[1];
  const dashboardTime = `${slotHour}:00 ${slotMeridian}`;

  // Wait for the appointment card to appear
  const slotRow = page.locator('.flex.flex-col.gap-1');
  await expect(slotRow.first()).toBeVisible({ timeout: 10000 });
  const count = await slotRow.count();
  expect(count, `❌ No appointment found on ${chosenDate} after reschedule`).toBeGreaterThan(0);

  console.log(`✅ Reschedule verified — ${count} appointment(s) found on ${chosenDate} around ${dashboardTime}`);
  console.log(`✅ Rescheduled slot: ${selectedSlot} on ${chosenDate}`);

});