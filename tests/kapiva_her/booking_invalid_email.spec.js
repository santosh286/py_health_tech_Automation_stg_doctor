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

test('Booking form — invalid email (no @) keeps Next disabled', async ({ page }) => {
  test.setTimeout(120000);

  // STEP 1 — Navigate to /booking
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize({ width: 412, height: 915 });
  console.log('[STEP 1] Navigated to /booking (412x915)');

  // STEP 2 — Verify "Fill your Details" heading visible
  await expect(page.getByText('Fill your Details')).toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] "Fill your Details" heading visible');

  // STEP 3 — Fill name, invalid email (no @), and valid phone
  await page.getByPlaceholder('Enter your name').fill('Test');
  await page.getByPlaceholder('Enter your email').fill('notvalid');
  await page.getByPlaceholder('Enter 10-digit number').fill('9876543210');
  console.log('[STEP 3] Filled: name="Test", email="notvalid" (no @), phone="9876543210"');

  // STEP 4 — Verify Next button stays DISABLED (email validation)
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn.scrollIntoViewIfNeeded();
  await expect(nextBtn, 'Next should be DISABLED when email has no @ symbol').toBeDisabled({ timeout: 10000 });
  console.log('[STEP 4] Next button is DISABLED (email without @ rejected by validation)');
});
