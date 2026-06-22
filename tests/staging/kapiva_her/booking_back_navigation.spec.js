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

test('Booking — back navigation between steps', async ({ page }) => {
  test.setTimeout(120000);

  const ts = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // STEP 1 — Navigate to /booking
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // STEP 2 — Verify Step 1 heading and fill details
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible on Step 1').toBeVisible({ timeout: 15000 });
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
  await expect(nextBtn1, 'Next button should be enabled after filling details').toBeEnabled({ timeout: 10000 });
  await nextBtn1.click();
  console.log('[STEP 3] Clicked Next (Step 1 -> Step 2)');

  // STEP 4 — Verify Step 2 slot selection visible
  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection heading not visible on Step 2').toBeVisible({ timeout: 15000 });
  console.log('[STEP 4] Step 2 slot selection visible');

  // STEP 5 — Click Back and verify Step 1 "Fill your Details" visible again
  const backBtn1 = page.getByRole('button', { name: /back/i });
  await expect(backBtn1, 'Back button not visible on Step 2').toBeVisible({ timeout: 10000 });
  await backBtn1.click();
  console.log('[STEP 5] Clicked Back (Step 2 -> Step 1)');

  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible after going back to Step 1').toBeVisible({ timeout: 15000 });
  console.log('[STEP 5] Step 1 "Fill your Details" visible again after Back');

  // STEP 6 — Fill details again and click Next to return to Step 2
  const ts2 = Date.now();
  const name2  = `Test User${ts2.toString().slice(-4)}`;
  const email2 = `testuser${ts2}@kapiva.test`;
  const phone2 = `9${ts2.toString().slice(-9)}`;

  await page.getByPlaceholder('Enter your name').fill(name2);
  await page.getByPlaceholder('Enter your email').fill(email2);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone2);
  const stateSelect2 = page.locator('select').first();
  if (await stateSelect2.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stateSelect2.selectOption({ index: 1 });
  }
  console.log(`[STEP 6] Re-filled details: name="${name2}", email="${email2}", phone="${phone2}"`);

  const nextBtn2 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn2.scrollIntoViewIfNeeded();
  await expect(nextBtn2, 'Next button should be enabled after re-filling details').toBeEnabled({ timeout: 10000 });
  await nextBtn2.click();
  console.log('[STEP 6] Clicked Next again (Step 1 -> Step 2)');

  // STEP 7 — Select a slot on Step 2
  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection heading not visible on Step 2 (second visit)').toBeVisible({ timeout: 15000 });
  const firstSlot = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}(am|pm)$/i }).first();
  await expect(firstSlot, 'No time slot buttons visible').toBeVisible({ timeout: 15000 });
  const slotText = await firstSlot.innerText();
  await firstSlot.click();
  console.log(`[STEP 7] Selected slot: "${slotText}"`);

  // STEP 8 — Click Next (Step 2 -> Step 3)
  const nextBtn3 = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtn3, 'Next button should be enabled after selecting a slot').toBeEnabled({ timeout: 10000 });
  await nextBtn3.click();
  console.log('[STEP 8] Clicked Next (Step 2 -> Step 3)');

  // STEP 9 — Verify Step 3 "Choose your Expert" visible
  await expect(page.getByText('Choose your Expert'), '"Choose your Expert" not visible on Step 3').toBeVisible({ timeout: 15000 });
  console.log('[STEP 9] Step 3 "Choose your Expert" visible');

  // STEP 10 — Click Back and verify Step 2 slot selection visible again
  const backBtn2 = page.getByRole('button', { name: /back/i });
  await expect(backBtn2, 'Back button not visible on Step 3').toBeVisible({ timeout: 10000 });
  await backBtn2.click();
  console.log('[STEP 10] Clicked Back (Step 3 -> Step 2)');

  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection heading not visible after going back from Step 3').toBeVisible({ timeout: 15000 });
  console.log('[STEP 10] Step 2 slot selection visible again after Back from Step 3');
});
