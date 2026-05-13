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

test('Symptoms section — tiles and section heading', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Verifying section heading');
  await expect(
    page.getByRole('heading', { name: /pcos doesn't start where you see it/i })
  ).toBeVisible({ timeout: 15000 });

  console.log('[STEP 3] Verifying Acne & Hirsutism symptom tile');
  await expect(page.getByText('Acne & Hirsutism').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 4] Verifying Irregular Cycles symptom tile');
  await expect(page.getByText('Irregular Cycles').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying Weight Gain symptom tile');
  await expect(page.getByText('Weight Gain', { exact: true }).first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 6] Verifying Mood & Motivation symptom tile');
  await expect(page.getByText('Mood & Motivation').first()).toBeVisible({ timeout: 10000 });
});
