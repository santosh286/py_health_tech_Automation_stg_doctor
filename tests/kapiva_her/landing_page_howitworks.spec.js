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

test('How it works — PCOSolve plan heading and step images', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Scrolling to PCOSolve plan section');
  await page.locator('#pcosolve-plan').scrollIntoViewIfNeeded().catch(() => page.evaluate(() => window.scrollBy(0, 1200)));

  console.log('[STEP 3] Verifying PCOSolve Holistic Plan heading');
  await expect(
    page.getByRole('heading', { name: /kapiva's pcosolve holistic plan/i })
  ).toBeVisible({ timeout: 15000 });

  console.log('[STEP 4] Verifying Step 01 image is visible');
  await expect(page.locator('img[alt*="Step 01"], img[src*="step-01"], img[src*="step_01"]').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying Step 02 image is visible');
  await expect(page.locator('img[alt*="Step 02"], img[src*="step-02"], img[src*="step_02"]').first()).toBeVisible({ timeout: 10000 });
});
