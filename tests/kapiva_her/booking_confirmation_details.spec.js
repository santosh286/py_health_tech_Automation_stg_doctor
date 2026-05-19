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

test('Booking confirmation details — full booking flow', async ({ page }) => {
  test.setTimeout(120000);

  const ts = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // STEP 1 — Navigate to /booking
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // STEP 2 — Fill valid details
  await expect(page.getByText('Fill your Details')).toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);
  const stateSelect = page.locator('select').first();
  if (await stateSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stateSelect.selectOption({ index: 1 });
  }
  console.log(`[STEP 2] Filled details: name="${name}", email="${email}", phone="${phone}"`);

  // STEP 3 — Click Next (Step 1 -> Step 2)
  const nextBtn1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn1.scrollIntoViewIfNeeded();
  await expect(nextBtn1).toBeEnabled({ timeout: 10000 });
  await nextBtn1.click();
  console.log('[STEP 3] Clicked Next (Step 1 -> Step 2)');

  // STEP 4 — Select first time slot
  await expect(page.getByText(/select.*slot/i).first()).toBeVisible({ timeout: 15000 });
  const firstSlot = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i }).first();
  await expect(firstSlot).toBeVisible({ timeout: 15000 });
  const slotText = await firstSlot.innerText();
  await firstSlot.click();
  console.log(`[STEP 4] Selected slot: "${slotText}"`);

  // STEP 5 — Click Next (Step 2 -> Step 3)
  const nextBtn2 = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtn2).toBeEnabled({ timeout: 10000 });
  await nextBtn2.click();
  console.log('[STEP 5] Clicked Next (Step 2 -> Step 3)');

  // STEP 6 — Select first doctor and click Book Now
  await expect(page.getByText('Choose your Expert')).toBeVisible({ timeout: 15000 });
  const doctorCards = page.getByRole('button').filter({ hasText: /B\.A\.M\.S/i });
  await expect(doctorCards.first()).toBeVisible({ timeout: 15000 });
  const doctorName = await doctorCards.first().locator('p').first().innerText().catch(() => 'Unknown');
  await doctorCards.first().click();
  console.log(`[STEP 6] Selected first doctor: "${doctorName}"`);

  // STEP 7 — Click Book Now
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn).toBeVisible({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 7] Clicked Book Now');

  // STEP 8 — Verify URL contains /booking/confirmation
  await page.waitForURL(/\/booking\/confirmation/, { timeout: 60000 });
  expect(page.url(), 'URL should contain /booking/confirmation').toContain('/booking/confirmation');
  console.log(`[STEP 8] URL confirmed: ${page.url()}`);

  // STEP 9 — Verify "Consultation Booked!" visible
  await expect(page.getByText('Consultation Booked!'), '"Consultation Booked!" not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 9] "Consultation Booked!" visible');

  // STEP 10 — Verify doctor name visible (any element containing "Dr.")
  const doctorNameOnConfirmation = page.getByText(/Dr\./i).first();
  await expect(doctorNameOnConfirmation, 'Doctor name (Dr. prefix) not visible on confirmation').toBeVisible({ timeout: 10000 });
  const confirmedDrName = await doctorNameOnConfirmation.innerText();
  console.log(`[STEP 10] Doctor name visible: "${confirmedDrName}"`);

  // STEP 11 — Verify date/time visible
  const dateTimeLocator = page.locator('p, span, div').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i }).first();
  await expect(dateTimeLocator, 'Date/time not visible on confirmation page').toBeVisible({ timeout: 10000 });
  console.log('[STEP 11] Date/time visible on confirmation page');

  // STEP 12 — Verify PCOSolve Quiz section visible (replaces old "ONE MORE STEP" section)
  await expect(page.getByText(/PCOSolve Quiz|Help us know you better/i).first(), 'Quiz prompt section not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 12] PCOSolve Quiz prompt section visible');

  // STEP 13 — Verify "Start Your Assessment" link visible
  await expect(page.getByRole('link', { name: /Start Your Assessment/i }), '"Start Your Assessment" link not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 13] "Start Your Assessment" link visible');
});
