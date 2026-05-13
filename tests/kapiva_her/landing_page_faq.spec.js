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

  console.log('[STEP 4] Verifying first FAQ button is visible');
  const firstFaqButton = page.getByRole('button', { name: /Can I take this|Should I talk|diabetes medication/i }).first();
  await expect(firstFaqButton).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Expanding FAQ (click only if not already expanded)');
  const faqAnswer = page.getByText(/Kapiva PCOSolve is safe/i).first();
  const alreadyExpanded = await faqAnswer.isVisible();
  if (!alreadyExpanded) {
    await firstFaqButton.click();
  }

  console.log('[STEP 6] Verifying answer text visible after expanding');
  await expect(faqAnswer).toBeVisible({ timeout: 10000 });
});
