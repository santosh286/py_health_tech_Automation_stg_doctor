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

test('Doctors section — heading, BAMS badge, Consult Now link', async ({ page }) => {
  test.setTimeout(60000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Scrolling to Meet our Ayurvedic Experts section');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1500);

  console.log('[STEP 3] Verifying Meet our Ayurvedic Experts heading is visible');
  await expect(
    page.getByRole('heading', { name: /meet our ayurvedic experts/i })
  ).toBeVisible({ timeout: 20000 });

  console.log('[STEP 4] Verifying at least one doctor card with B.A.M.S badge is visible');
  const doctorCard = page.getByText('B.A.M.S').first();
  await expect(doctorCard).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying Consult Now link is visible');
  await expect(page.getByRole('link', { name: /consult now/i }).first()).toBeVisible({ timeout: 10000 });
});
