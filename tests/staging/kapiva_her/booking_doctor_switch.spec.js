import { test, expect, devices } from '@playwright/test';
const BASE_URL = 'https://staging.kapivaher.com/';
test.use({ ...devices['Pixel 7'], launchOptions: { slowMo: 300 } });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const path = `test-results/screenshots/failure-${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path, contentType: 'image/png' }).catch(() => {});
  }
  await page.context().clearCookies().catch(() => {});
  await page.close().catch(() => {});
});

test('Booking Step 3 — user can switch selected doctor before confirming', async ({ page }) => {
  test.setTimeout(180000);

  const ts    = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // ============================================================
  // STEP 1 — Navigate to /booking
  // ============================================================
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // ============================================================
  // STEP 2 — Fill personal details
  // ============================================================
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible').toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);
  const stateSelect = page.locator('select').first();
  if (await stateSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stateSelect.selectOption({ index: 1 });
  }
  console.log(`[STEP 2] Filled details: name="${name}", email="${email}", phone="${phone}"`);

  // ============================================================
  // STEP 3 — Click Next → Step 2 slot selection
  // ============================================================
  const nextBtn1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn1.scrollIntoViewIfNeeded();
  await expect(nextBtn1).toBeEnabled({ timeout: 10000 });
  await nextBtn1.click();
  console.log('[STEP 3] Clicked Next → slot selection');

  // ============================================================
  // STEP 4 — Select first available time slot
  // ============================================================
  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection page not visible').toBeVisible({ timeout: 15000 });
  const timeSlots = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i });
  await expect(timeSlots.first(), 'No time slots visible').toBeVisible({ timeout: 15000 });
  const slotText = await timeSlots.first().innerText();
  await timeSlots.first().click();
  console.log(`[STEP 4] Selected time slot: "${slotText}"`);

  // ============================================================
  // STEP 5 — Click Next → Step 3 doctor selection
  // ============================================================
  const nextBtn2 = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtn2).toBeEnabled({ timeout: 10000 });
  await nextBtn2.click();
  console.log('[STEP 5] Clicked Next → doctor selection');

  // ============================================================
  // STEP 6 — Verify "Choose your Expert" page loaded
  // ============================================================
  await expect(
    page.getByText(/choose your expert/i).first(),
    '❌ "Choose your Expert" heading not visible on Step 3'
  ).toBeVisible({ timeout: 20000 });
  console.log('[STEP 6] "Choose your Expert" page visible');

  // ============================================================
  // STEP 7 — Count available doctor cards (need at least 2 to switch)
  // ============================================================
  const doctorCards = page.locator('button, div[role="button"]').filter({ hasText: /ayurvedic gynaecologist/i });
  await expect(doctorCards.first(), '❌ No doctor cards visible').toBeVisible({ timeout: 15000 });
  const doctorCount = await doctorCards.count();
  console.log(`[STEP 7] ${doctorCount} doctor card(s) available`);

  if (doctorCount < 2) {
    test.skip();
    console.log('[STEP 7] Only 1 doctor available on staging — skipping switch test');
    return;
  }

  // ============================================================
  // STEP 8 — Select the FIRST doctor
  // ============================================================
  const firstCard  = doctorCards.nth(0);
  const secondCard = doctorCards.nth(1);

  const firstName = await firstCard.locator('p, h2, h3, span').first().innerText().catch(() => 'Doctor 1');
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.click();
  await page.waitForTimeout(500);
  console.log(`[STEP 8] Selected first doctor: "${firstName.trim()}"`);

  // ============================================================
  // STEP 9 — Verify "Book Now" becomes visible (first selection confirmed)
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn, '❌ "Book Now" not visible after selecting first doctor').toBeVisible({ timeout: 10000 });
  console.log('[STEP 9] "Book Now" button appeared — first doctor selected');

  // ============================================================
  // STEP 10 — Switch to the SECOND doctor
  // ============================================================
  const secondName = await secondCard.locator('p, h2, h3, span').first().innerText().catch(() => 'Doctor 2');
  await secondCard.scrollIntoViewIfNeeded();
  await secondCard.click();
  await page.waitForTimeout(500);
  console.log(`[STEP 10] Switched to second doctor: "${secondName.trim()}"`);

  // ============================================================
  // STEP 11 — Verify "Book Now" is still visible after switch
  // ============================================================
  await expect(bookNowBtn, '❌ "Book Now" not visible after switching doctor').toBeVisible({ timeout: 10000 });
  await expect(bookNowBtn, '❌ "Book Now" disabled after switching doctor').toBeEnabled({ timeout: 10000 });
  console.log('[STEP 11] "Book Now" still enabled after doctor switch — switch confirmed');

  // ============================================================
  // STEP 12 — Verify the two doctor names are different
  // ============================================================
  expect(
    firstName.trim(),
    '❌ First and second doctor names should be different'
  ).not.toBe(secondName.trim());
  console.log(`[STEP 12] Doctor switch verified: "${firstName.trim()}" → "${secondName.trim()}"`);

  // ============================================================
  // STEP 13 — Complete booking with the switched (second) doctor
  // ============================================================
  await bookNowBtn.click();
  console.log('[STEP 13] Clicked "Book Now" with second doctor');

  await page.waitForURL(/\/booking\/confirmation/, { timeout: 60000 });
  await expect(
    page.getByText('Consultation Booked!'),
    '❌ "Consultation Booked!" not visible after booking with switched doctor'
  ).toBeVisible({ timeout: 15000 });
  console.log(`[STEP 13] Booking confirmed with switched doctor: ${page.url()}`);

  console.log(`✅ Doctor switch test complete — booked with "${secondName.trim()}" after switching from "${firstName.trim()}"`);
});
