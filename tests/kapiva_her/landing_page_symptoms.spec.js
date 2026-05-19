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

  console.log('[STEP 2] Verifying symptoms / hormonal imbalance section is present');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // The section heading or nearby text describing PCOS symptoms
  const symptomsSection = page.getByText(/hormonal imbalance|different symptoms|pcos doesn't start|symptoms/i).first();
  await expect(symptomsSection).toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] ✅ Symptoms/Hormonal Imbalance section visible');

  console.log('[STEP 3] Verifying PCOS-related content is visible on page');
  const pcosContent = page.getByText(/pcos/i).first();
  await expect(pcosContent).toBeVisible({ timeout: 10000 });
  console.log('[STEP 3] ✅ PCOS content visible');

  console.log('[STEP 4] Verifying page has symptom or condition content');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasSymptomContent = /acne|irregular|weight|mood|bleeding|hair|fertility|hormonal/i.test(bodyText);
  expect(hasSymptomContent, '❌ No symptom-related content found on page').toBe(true);
  console.log('[STEP 4] ✅ Symptom-related content found on page');
});
