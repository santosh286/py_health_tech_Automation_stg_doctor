import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'https://staging.kapivaher.com/';
const VIEWPORT = { width: 412, height: 915 };

test.use({
  ...devices['Pixel 7'], // 📱 Mobile device
  launchOptions: {
    slowMo: 1000, // 1s delay between every action
  },
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
  const heroHeading = page.getByRole('heading').filter({ hasText: /pcos|pmos/i }).first();
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
  const stateSelect = page.locator('select').first();
  if (await stateSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stateSelect.selectOption({ index: 1 });
  }
  console.log(`[STEP 7] ✅ Filled → name: ${name} | email: ${email} | phone: ${phone}`);

  // ============================================================
  // STEP 8 — Verify "Next" button visible + enabled, then click
  // Button stays disabled until all required fields are filled
  // ============================================================
  const nextBtnStep1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtnStep1.scrollIntoViewIfNeeded();
  await expect(nextBtnStep1, '❌ Next button not visible on Step 1').toBeVisible({ timeout: 10000 });
  await expect(nextBtnStep1, '❌ Next button is disabled — form fields may not be filled').toBeEnabled({ timeout: 10000 });
  console.log('[STEP 8a] ✅ Next button visible and enabled on Step 1 form');
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
  // STEP 12 — Verify "Book Now" button and click (retry if booking fails)
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn, '❌ "Book Now" button not visible').toBeVisible({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 12] ✅ "Book Now" clicked');

  // Retry once if "Booking failed" toast appears
  await page.waitForTimeout(2000);
  const bookingFailed = await page.getByText(/booking failed/i).isVisible({ timeout: 3000 }).catch(() => false);
  if (bookingFailed) {
    console.log('[STEP 12] ⚠️ Booking failed — retrying with next doctor');
    const nextDoctor = page.getByRole('button').filter({ hasText: /B\.A\.M\.S/i }).nth(1);
    if (await nextDoctor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextDoctor.click();
    }
    await bookNowBtn.click();
    console.log('[STEP 12] ✅ "Book Now" retry clicked');
  }

  // ============================================================
  // STEP 13 — Verify booking confirmation page
  // ============================================================
  await page.waitForURL(/\/booking\/confirmation/, { timeout: 60000 });
  await expect(page.getByText('Consultation Booked!'), '❌ "Consultation Booked!" not visible').toBeVisible({ timeout: 15000 });
  console.log(`[STEP 13] ✅ Booking confirmed: ${page.url()}`);

  // ============================================================
  // STEP 14 — Verify PCOSolve Quiz section + Start Your Assessment
  // ============================================================
  await expect(page.getByText(/PCOSolve Quiz|PMOSolve Quiz|Help us know you better/i).first(), '❌ Quiz prompt section not visible').toBeVisible({ timeout: 10000 });
  const startAssessmentBtn = page.getByRole('link', { name: /start your assessment/i });
  await startAssessmentBtn.scrollIntoViewIfNeeded();
  await expect(startAssessmentBtn, '❌ Start Your Assessment not visible').toBeVisible({ timeout: 10000 });
  await startAssessmentBtn.click();
  console.log('[STEP 14] ✅ "Start Your Assessment" clicked');

  // ============================================================
  // STEP 15 — Verify quiz page loaded (Step 1/13)
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await expect(page.getByText(/PCOS Assessment Form|PMOS Assessment Form/i), '❌ Quiz title not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 1'), '❌ Quiz Step 1 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 15] ✅ Assessment Form loaded — Step 1');

  // ============================================================
  // Quiz helper — picks first visible option, handles Next/Submit
  // ============================================================
  const EXCLUDED = /^(next|back|skip|preparing|loading|generating|download|submit|book|consult|start|shop)/i;

  const pickFirstOption = async (step) => {
    await expect(page.getByText(`Step ${step}`)).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const candidates = page.locator('button, div[role="button"], label, li');
    const count = await candidates.count();
    let answered = false;
    for (let i = 0; i < count; i++) {
      const opt = candidates.nth(i);
      if (!await opt.isVisible({ timeout: 1000 }).catch(() => false)) continue;
      const txt = (await opt.innerText().catch(() => '')).trim();
      if (!txt || txt.length < 3 || EXCLUDED.test(txt)) continue;
      await opt.click();
      console.log(`[Q${step}] ✅ Selected: "${txt.substring(0, 50)}"`);
      answered = true;
      break;
    }
    expect(answered, `❌ Q${step}: no option found`).toBe(true);
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    const submitBtn = page.getByRole('button', { name: 'Submit', exact: true });
    const hasNext = await nextBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    if (hasNext) { await nextBtn.click(); return false; }
    const hasSubmit = await submitBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    if (hasSubmit) { await submitBtn.click(); return true; }
    throw new Error(`Q${step}: Neither Next nor Submit enabled`);
  };

  // Answer all quiz questions until result page or Submit
  for (let q = 1; q <= 13; q++) {
    const url = page.url();
    if (url.includes('/quiz/result')) { console.log(`[Quiz] Result page at Q${q}`); break; }
    const done = await pickFirstOption(q);
    if (done) { console.log(`[Quiz] Submitted at Q${q}`); break; }
  }

  // ============================================================
  // STEP 29 — Verify quiz result page
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
  const resultHeading = page.locator('h1, h2, h3').first();
  await expect(resultHeading, '❌ Result heading not visible').toBeVisible({ timeout: 15000 });
  const pcosTypeText = await resultHeading.innerText().catch(() => 'Unknown');
  console.log(`[STEP 29] ✅ Quiz result — PCOS type: "${pcosTypeText}"`);

  console.log('🎉 Shantavri consultation booking + quiz flow complete');
});
