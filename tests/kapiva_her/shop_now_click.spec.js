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

test('Shop Products link — visible and points to womens-health', async ({ page }) => {
  test.setTimeout(120000);

  // STEP 1 — Navigate to homepage
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize({ width: 412, height: 915 });
  console.log('[STEP 1] Navigated to homepage (412x915)');

  // STEP 2 — Find "Shop Products" link
  const shopLink = page.getByRole('link', { name: /Shop Products/i });
  await expect(shopLink.first(), '"Shop Products" link not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 2] "Shop Products" link is visible');

  // STEP 3 — Verify href contains "kapiva.in/solution/womens-health"
  const href = await shopLink.first().getAttribute('href');
  console.log(`[STEP 3] Shop Products href: ${href}`);
  expect(href, 'href should contain kapiva.in/solution/womens-health').toContain('kapiva.in/solution/womens-health');
  console.log('[STEP 3] href verified: contains "kapiva.in/solution/womens-health"');
});
