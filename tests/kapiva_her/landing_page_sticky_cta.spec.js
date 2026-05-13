import { test, expect, devices } from '@playwright/test';
const BASE_URL = 'https://staging.kapivaher.com/';
test.use({ ...devices['Pixel 7'], launchOptions: { slowMo: 300 } });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = `test-results/screenshots/failure-${testInfo.title.replace(/\s+/g, '_')}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
  }
  await page.close().catch(() => {});
});

test('Sticky CTA — price, Free label, 100% OFF text', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to /booking (sticky CTA is on the booking page)');
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Verifying ₹399 is visible in sticky CTA');
  await expect(page.getByText('₹399').first()).toBeVisible({ timeout: 15000 });

  console.log('[STEP 3] Verifying Free text is visible alongside ₹399');
  await expect(page.getByText('Free').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 4] Verifying 100% OFF text is visible');
  await expect(page.getByText('100% OFF').first()).toBeVisible({ timeout: 10000 });
});
