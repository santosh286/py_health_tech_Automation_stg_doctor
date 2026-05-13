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

test('Booking slot selection — Step 2/3', async ({ page }) => {
  test.setTimeout(120000);

  // STEP 1 — Navigate to /booking and fill valid details
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // STEP 2 — Fill valid details
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible').toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('Enter your name').fill('Test User');
  await page.getByPlaceholder('Enter your email').fill('test@kapiva.test');
  await page.getByPlaceholder('Enter 10-digit number').fill('9876543210');
  console.log('[STEP 2] Filled: name="Test User", email="test@kapiva.test", phone="9876543210"');

  // STEP 3 — Click Next to go to Step 2
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtn, 'Next button should be enabled').toBeEnabled({ timeout: 10000 });
  await nextBtn.click();
  console.log('[STEP 3] Clicked Next');

  // STEP 4 — Verify "Select your slot" heading visible (Step 2/3)
  await expect(page.getByText('Select your slot'), '"Select your slot" heading not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 4] "Select your slot" heading visible (Step 2/3)');

  // STEP 5 — Verify date picker shows at least 1 date button
  const dateButtons = page.locator('button').filter({ hasText: /\d/ });
  const dateCount = await dateButtons.count();
  expect(dateCount, 'No date buttons visible').toBeGreaterThan(0);
  console.log(`[STEP 5] Date picker visible — ${dateCount} date button(s) found`);

  // STEP 6 — Verify at least 1 time slot button visible (regex /\d{1,2}:\d{2}(am|pm)/i)
  const timeSlots = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i });
  await expect(timeSlots.first(), 'No time slot buttons visible').toBeVisible({ timeout: 15000 });
  const slotCount = await timeSlots.count();
  console.log(`[STEP 6] ${slotCount} time slot(s) visible`);

  // STEP 7 — Click first time slot
  const firstSlotText = await timeSlots.first().innerText();
  await timeSlots.first().click();
  console.log(`[STEP 7] Clicked first time slot: "${firstSlotText}"`);

  // STEP 8 — Verify Next button becomes enabled
  const nextBtnStep2 = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtnStep2, 'Next button should be enabled after selecting a time slot').toBeEnabled({ timeout: 10000 });
  console.log('[STEP 8] Next button is ENABLED after slot selection');
});
