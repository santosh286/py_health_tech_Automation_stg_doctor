import { test, expect, devices } from '@playwright/test';
const BASE_URL = 'https://staging.kapivaher.com/';
test.use({ ...devices['Pixel 7'], launchOptions: { slowMo: 300 } });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const path = `test-results/screenshots/failure-${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path, contentType: 'image/png' }).catch(() => {});
  }
  await page.context().clearCookies().catch(() => {});
  await page.close().catch(() => {});
});

test('Quiz without booking — shows "No active booking found" message', async ({ browser }) => {
  test.setTimeout(120000);

  // STEP 1 — Open fresh context (no cookies) and navigate to /quiz
  const freshContext = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await freshContext.newPage();
  await page.setViewportSize({ width: 412, height: 915 });

  await page.goto(`${BASE_URL}quiz`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`[STEP 1] Navigated to /quiz in fresh context (no cookies): ${page.url()}`);

  // STEP 2 — Verify "No active booking found" text visible
  await expect(
    page.getByText(/No active booking found/i),
    '"No active booking found" not visible'
  ).toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] "No active booking found" message visible');

  // STEP 3 — Verify "Please complete a booking before taking the quiz" visible
  await expect(
    page.getByText(/Please complete a booking before taking the quiz/i),
    '"Please complete a booking before taking the quiz" not visible'
  ).toBeVisible({ timeout: 10000 });
  console.log('[STEP 3] "Please complete a booking before taking the quiz" message visible');

  await freshContext.close();
  console.log('[STEP 3] Fresh context closed');
});
