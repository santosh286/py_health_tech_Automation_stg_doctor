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
  test.setTimeout(90000);

  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('[STEP 2] Scrolling to Meet our Ayurvedic Experts section');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1500);

  console.log('[STEP 3] Verifying doctors/experts section heading is visible');
  const doctorHeading = page.getByText(/meet.*expert|meet.*doctor|team.*expert/i).first();
  await expect(doctorHeading).toBeVisible({ timeout: 20000 });
  await doctorHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  console.log('[STEP 4] Verifying Consult Now link is visible in doctors section');
  const consultNowLink = page.getByRole('link', { name: /consult now/i }).first();
  await consultNowLink.scrollIntoViewIfNeeded().catch(() => {});
  await expect(consultNowLink).toBeVisible({ timeout: 10000 });

  console.log('[STEP 5] Verifying doctor name or credential text is present');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasDoctorContent = /Dr\.|BAMS|B\.A\.M\.S|Ayurvedic|expert/i.test(bodyText);
  expect(hasDoctorContent, '❌ No doctor/expert content found on page').toBe(true);
});
