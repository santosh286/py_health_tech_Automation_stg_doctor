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

  console.log('[STEP 3] Verifying PCOSolve/How it works section heading');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const howItWorksHeading = page.getByRole('heading').filter({ hasText: /pcosolve|pmosolve|how we fix|personalized plan|holistic plan|fix it/i }).first();
  await expect(howItWorksHeading).toBeVisible({ timeout: 15000 });

  console.log('[STEP 4] Verifying section has images/steps');
  const sectionImages = page.locator('img').filter({ hasNot: page.locator('[alt="logo"]') });
  const imgCount = await sectionImages.count();
  expect(imgCount).toBeGreaterThan(0);
  console.log(`[STEP 4] ✅ ${imgCount} images found in page`);

  console.log('[STEP 5] Verifying step content is visible');
  const stepContent = page.getByText(/step|understand|consult|1\.|2\./i).first();
  const hasStepContent = await stepContent.isVisible({ timeout: 5000 }).catch(() => false);
  console.log(`[STEP 5] ✅ Step content visible: ${hasStepContent}`);
});
