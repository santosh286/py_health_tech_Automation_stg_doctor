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

test('Hero section — headings, trust badges, CTA link', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize({ width: 412, height: 915 });

  console.log('[STEP 2] Verifying URL contains staging.kapivaher.com');
  expect(page.url()).toContain('staging.kapivaher.com');

  console.log('[STEP 3] Verifying hero heading');
  await expect(page.getByRole('heading', { name: /pcos isn't one problem/i })).toBeVisible({ timeout: 15000 });

  console.log('[STEP 4] Verifying 82% success rate badge');
  await expect(page.getByText('82%').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('success rate').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying 4.7/5 average rating badge');
  await expect(page.getByText('4.7/5').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('average rating').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 6] Verifying 100+ research papers badge');
  await expect(page.getByText('100+').first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('research papers').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 7] Verifying Talk to Expert Now link is visible');
  await expect(page.getByRole('link', { name: /talk to expert now/i }).first()).toBeVisible({ timeout: 10000 });
});
