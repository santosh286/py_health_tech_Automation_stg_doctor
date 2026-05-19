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

test('Comparison section — heading visible', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Scrolling to comparison section');
  await page.evaluate(() => window.scrollBy(0, 600));

  console.log('[STEP 3] Verifying comparison/root-cause section heading');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const compHeading = page.getByRole('heading').filter({ hasText: /tried|root cause|managing|fix/i }).first();
  await expect(compHeading).toBeVisible({ timeout: 15000 });
});
