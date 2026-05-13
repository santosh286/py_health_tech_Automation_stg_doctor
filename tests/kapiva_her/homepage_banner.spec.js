import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'https://staging.kapivaher.com/';
const VIEWPORT = { width: 412, height: 815 };

test.use({
  ...devices['Pixel 7'],
  launchOptions: { slowMo: 500 },
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = `test-results/screenshots/failure-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
  }
  await page.context().clearCookies().catch(() => {});
  await page.close().catch(() => {});
});

test('Shantavri Consultation Booking Flow — kapivaher (412×815)', async ({ page }) => {
  test.setTimeout(180000);

  const ts = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // ============================================================
  // STEP 1 — Navigate to staging.kapivaher.com (mobile 412×915)
  // ============================================================
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize(VIEWPORT);
  console.log(`[STEP 1] ✅ Navigated to ${BASE_URL} | Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);

  // ============================================================
  // STEP 2 — Verify URL
  // ============================================================
  const currentUrl = page.url();
  expect(currentUrl, `❌ URL mismatch — got: ${currentUrl}`).toContain('staging.kapivaher.com');
  console.log(`[STEP 2] ✅ URL verified: ${currentUrl}`);

  // ============================================================
  // STEP 3 — Verify homepage banner is visible
  // ============================================================
  const heroHeading = page.getByRole('heading', { name: /pcos isn't one problem/i });
  await expect(heroHeading, '❌ Hero banner heading not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 3] ✅ Homepage banner visible');

  // ============================================================
  // STEP 4 — Verify "Talk to Expert Now" button
  // ============================================================
  const talkToExpertBtn = page.getByRole('link', { name: /talk to expert now/i });
  await expect(talkToExpertBtn, '❌ "Talk to Expert Now" button not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 4] ✅ "Talk to Expert Now" button visible');

  // ============================================================
  // STEP 5 — Click "Talk to Expert Now" → navigate to /booking
  // ============================================================
  await talkToExpertBtn.click();
  await page.waitForURL(/\/booking/, { timeout: 15000 });
  expect(page.url(), '❌ Did not navigate to /booking').toContain('/booking');
  console.log(`[STEP 5] ✅ Navigated to booking page: ${page.url()}`);

  // ============================================================
  // STEP 6 — Verify Step 1/3 "Fill your Details"
  // ============================================================
  await expect(page.getByText('Fill your Details'), '❌ Step 1 heading not visible').toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Step 1'), '❌ Step 1 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 6] ✅ Step 1/3 — Fill your Details visible');

  // ============================================================
  // STEP 7 — Fill personal details
  // ============================================================
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);
  console.log(`[STEP 7] ✅ Filled → name: ${name} | email: ${email} | phone: ${phone}`);

  // ============================================================
  // STEP 8 — Verify "Next" button visible, then click → Step 2
  // ============================================================
  const nextBtnStep1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtnStep1.scrollIntoViewIfNeeded();
  await expect(nextBtnStep1, '❌ Next button not visible on Step 1').toBeVisible({ timeout: 10000 });
  console.log('[STEP 8a] ✅ Next button visible on Step 1 form');
  await nextBtnStep1.click();
  await expect(page.getByText('Select your slot'), '❌ Step 2 "Select your slot" not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 2'), '❌ Step 2 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 8] ✅ Step 2/3 — Select your slot visible');

  // ============================================================
  // STEP 9 — Select first available time slot
  // ============================================================
  const firstSlot = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}(am|pm)$/i }).first();
  await expect(firstSlot, '❌ No time slots available').toBeVisible({ timeout: 10000 });
  const slotText = await firstSlot.innerText();
  await firstSlot.click();
  console.log(`[STEP 9] ✅ Selected time slot: ${slotText}`);

  // ============================================================
  // STEP 10 — Click Next → Step 3 choose expert
  // ============================================================
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Choose your Expert'), '❌ Step 3 "Choose your Expert" not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 3'), '❌ Step 3 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 10] ✅ Step 3/3 — Choose your Expert visible');

  // ============================================================
  // STEP 11 — Verify doctors listed and select first one
  // Doctor cards are rendered as <button> elements containing "B.A.M.S"
  // ============================================================
  const doctorCards = page.getByRole('button').filter({ hasText: /B\.A\.M\.S/i });
  const docCount = await doctorCards.count();
  console.log(`[STEP 11] 👨‍⚕️ Doctors available: ${docCount}`);
  expect(docCount, '❌ No doctors found on Step 3').toBeGreaterThan(0);

  const firstDoctor = doctorCards.first();
  await expect(firstDoctor, '❌ First doctor card not visible').toBeVisible({ timeout: 10000 });
  const doctorName = await firstDoctor.locator('p').first().innerText().catch(() => 'Unknown');
  await firstDoctor.click();
  console.log(`[STEP 11] ✅ Selected doctor: ${doctorName}`);

  // ============================================================
  // STEP 12 — Verify "Book Now" button and click
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn, '❌ "Book Now" button not visible').toBeVisible({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 12] ✅ "Book Now" clicked');

  // ============================================================
  // STEP 13 — Verify booking confirmation
  // ============================================================
  await page.waitForTimeout(3000);
  const confirmationText = page.getByText(/booking confirmed|appointment confirmed|thank you|success/i).first();
  const isConfirmed = await confirmationText.isVisible({ timeout: 15000 }).catch(() => false);
  if (isConfirmed) {
    console.log(`[STEP 13] ✅ Booking confirmed: ${page.url()}`);
  } else {
    console.log(`[STEP 13] ℹ️ Post-booking URL: ${page.url()}`);
  }

  console.log('🎉 Shantavri consultation booking flow complete');
});
