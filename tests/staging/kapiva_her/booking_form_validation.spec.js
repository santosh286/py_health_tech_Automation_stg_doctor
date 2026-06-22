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

test('Booking form validation — Next button state', async ({ page }) => {
  test.setTimeout(120000);

  // STEP 1 — Navigate to /booking
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize({ width: 412, height: 915 });
  console.log('[STEP 1] Navigated to /booking (412x915)');

  // STEP 2 — Verify "Fill your Details" heading visible
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] "Fill your Details" heading visible');

  // STEP 3 — Next button is DISABLED when all fields are empty
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn.scrollIntoViewIfNeeded();
  await expect(nextBtn, 'Next should be disabled when all fields are empty').toBeDisabled({ timeout: 10000 });
  console.log('[STEP 3] Next button is DISABLED (all fields empty)');

  // STEP 4 — Fill only name -> Next still disabled
  await page.getByPlaceholder('Enter your name').fill('Test User');
  await expect(nextBtn, 'Next should still be disabled with only name filled').toBeDisabled({ timeout: 5000 });
  console.log('[STEP 4] Next still DISABLED (only name filled)');

  // STEP 5 — Fill name + invalid email -> Next still disabled
  await page.getByPlaceholder('Enter your email').fill('notanemail');
  await expect(nextBtn, 'Next should still be disabled with invalid email').toBeDisabled({ timeout: 5000 });
  console.log('[STEP 5] Next still DISABLED (invalid email "notanemail")');

  // STEP 6 — Fill name + valid email + phone -> Next becomes ENABLED
  await page.getByPlaceholder('Enter your email').fill('valid@kapiva.test');
  await page.getByPlaceholder('Enter 10-digit number').fill('9876543210');
  await expect(nextBtn, 'Next should be enabled after filling all valid fields').toBeEnabled({ timeout: 10000 });
  console.log('[STEP 6] Next button is ENABLED (name + valid email + phone)');
});
