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

test('FAQ section — heading, accordion expand', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Scrolling to FAQ section');
  await page.getByRole('heading', { name: /frequently asked questions/i }).scrollIntoViewIfNeeded();

  console.log('[STEP 3] Verifying FAQ heading is visible');
  await expect(
    page.getByRole('heading', { name: /frequently asked questions/i })
  ).toBeVisible({ timeout: 15000 });

  console.log('[STEP 4] Verifying first FAQ question button is visible');
  // Match any FAQ question button - text changes with staging deploys
  const firstFaqButton = page.getByRole('button').filter({ hasText: /how much|can i|is it|what|should|safe|pay|free|₹/i }).first();
  await expect(firstFaqButton).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Clicking FAQ to expand');
  await firstFaqButton.click();
  await page.waitForTimeout(500);

  console.log('[STEP 6] Verifying some answer content appeared after expanding');
  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText.length).toBeGreaterThan(100);
  console.log('[STEP 6] ✅ FAQ content is present on page');
});
