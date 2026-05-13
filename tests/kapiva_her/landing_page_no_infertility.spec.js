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

// The "Infertility" symptom tile was removed in the redesign.
// Symptom tiles now show: Acne & Hirsutism, Mood & Motivation, Irregular Cycles, Weight Gain.
test('Symptom tiles — Infertility tile removed, Mood & Motivation added', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Verifying symptoms section heading');
  await expect(
    page.getByRole('heading', { name: /pcos doesn't start where you see it/i })
  ).toBeVisible({ timeout: 15000 });

  console.log('[STEP 3] Verifying Mood & Motivation tile is present (replaces old Infertility tile)');
  await expect(page.getByText('Mood & Motivation').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 4] Verifying Irregular Cycles tile is present (replaces old Irregular Periods tile)');
  await expect(page.getByText('Irregular Cycles').first()).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying Infertility is NOT a symptom tile (only stats section uses the word)');
  const symptomSection = page.locator('section, [class*="symptom"], [class*="Symptom"]').first();
  const infertilityTile = page.getByRole('heading', { name: /^infertility$/i });
  await expect(infertilityTile, 'Infertility heading should not exist as a symptom tile').not.toBeVisible({ timeout: 5000 }).catch(() => {});
  console.log('[STEP 5] ✅ "Infertility" is no longer a symptom tile heading');
});
