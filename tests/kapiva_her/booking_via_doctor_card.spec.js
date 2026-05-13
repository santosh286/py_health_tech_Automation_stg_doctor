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

test('Booking via doctor card — "Consult Now" link leads to booking', async ({ page }) => {
  test.setTimeout(120000);

  // STEP 1 — Navigate to homepage
  await page.goto(BASE_URL, { waitUntil: 'load', timeout: 45000 });
  await page.setViewportSize({ width: 412, height: 915 });
  await page.waitForLoadState('networkidle').catch(() => {});
  console.log('[STEP 1] Navigated to homepage (412x915)');

  // STEP 2 — Scroll down to trigger lazy-loaded doctors section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);
  const expertsSection = page.locator('h2, h3').filter({ hasText: 'Meet our Ayurvedic Experts' }).first();
  await expect(expertsSection, '"Meet our Ayurvedic Experts" section not found').toBeVisible({ timeout: 20000 });
  await expertsSection.scrollIntoViewIfNeeded();
  console.log('[STEP 2] Scrolled to "Meet our Ayurvedic Experts" section');

  // STEP 3 — Find first "Consult Now" link
  const consultNowLinks = page.getByRole('link', { name: /Consult Now/i });
  await expect(consultNowLinks.first(), 'No "Consult Now" links found').toBeVisible({ timeout: 15000 });
  const count = await consultNowLinks.count();
  console.log(`[STEP 3] Found ${count} "Consult Now" link(s)`);

  // STEP 4 — Verify href contains /booking
  const firstConsultLink = consultNowLinks.first();
  const href = await firstConsultLink.getAttribute('href');
  console.log(`[STEP 4] "Consult Now" href: ${href}`);
  expect(href, 'href should contain /booking').toContain('/booking');

  // STEP 5 — Click the "Consult Now" link
  await firstConsultLink.click();
  console.log('[STEP 5] Clicked "Consult Now"');

  // STEP 6 — Verify navigated to /booking
  await page.waitForURL(/\/booking/, { timeout: 15000 });
  expect(page.url(), 'Should navigate to /booking').toContain('/booking');
  console.log(`[STEP 6] Navigated to: ${page.url()}`);

  // STEP 7 — Verify booking form heading visible (varies by doctorId: "Fill your Details" or "Personal Details")
  const bookingHeading = page.getByText(/Fill your Details|Personal Details/i).first();
  await expect(bookingHeading, 'Booking form heading not visible').toBeVisible({ timeout: 15000 });
  console.log(`[STEP 7] Booking form heading visible: "${await bookingHeading.innerText()}"`);
});
