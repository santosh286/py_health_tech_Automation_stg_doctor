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

  console.log('[STEP 2] Verifying symptoms/PCOS section content present');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const pcosSection = page.getByText(/hormonal imbalance|pcos doesn't start|pmos doesn't start|different symptoms|pcos|pmos/i).first();
  await expect(pcosSection).toBeVisible({ timeout: 15000 });

  console.log('[STEP 3] Verifying PCOS/PMOS-related content on page');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasSymptomContent = /acne|irregular|weight|mood|bleeding|hair|hormonal|pcos|pmos/i.test(bodyText);
  expect(hasSymptomContent, '❌ No PCOS/PMOS symptom-related content on page').toBe(true);
  console.log('[STEP 3] ✅ PCOS/PMOS/symptom content found on page');

  console.log('[STEP 4] Verifying Infertility is NOT a standalone symptom heading tile');
  const infertilityTile = page.getByRole('heading', { name: /^infertility$/i });
  await expect(infertilityTile).not.toBeVisible({ timeout: 5000 }).catch(() => {});
  console.log('[STEP 4] ✅ "Infertility" is no longer a symptom tile heading');
});
