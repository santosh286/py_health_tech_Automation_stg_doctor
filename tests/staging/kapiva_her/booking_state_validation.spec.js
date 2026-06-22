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

test('Booking form — State dropdown present, has options, and Next enabled after selection', async ({ page }) => {
  test.setTimeout(60000);

  const ts = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // STEP 1 — Navigate to /booking
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // STEP 2 — Verify Step 1 heading visible
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] "Fill your Details" heading visible');

  // STEP 3 — Fill name, email, phone
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);
  console.log(`[STEP 3] Filled name="${name}", email="${email}", phone="${phone}"`);

  // STEP 4 — Verify State dropdown is present and has at least 2 options
  const stateSelect = page.locator('select').first();
  await expect(stateSelect, 'State dropdown not visible').toBeVisible({ timeout: 10000 });
  const optionCount = await stateSelect.locator('option').count();
  console.log(`[STEP 4] State dropdown has ${optionCount} options`);
  expect(optionCount, 'State dropdown should have at least 2 options (placeholder + states)').toBeGreaterThanOrEqual(2);

  // STEP 5 — Select state option (index 1 = first real state)
  await stateSelect.selectOption({ index: 1 });
  const selectedState = await stateSelect.inputValue();
  console.log(`[STEP 5] Selected state value: "${selectedState}"`);
  expect(selectedState, 'A state value should be selected').toBeTruthy();

  // STEP 6 — Verify Next button is ENABLED after state selection
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn.scrollIntoViewIfNeeded();
  await expect(nextBtn, 'Next button should be ENABLED after filling all fields including state').toBeEnabled({ timeout: 10000 });
  console.log('[STEP 6] Next button is ENABLED — booking Step 1 state field verified');
});
