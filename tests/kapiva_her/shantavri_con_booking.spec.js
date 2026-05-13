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
  // STEP 12 — Verify "Book Now" button and click
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn, '❌ "Book Now" button not visible').toBeVisible({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 12] ✅ "Book Now" clicked');

  // ============================================================
  // STEP 13 — Verify booking confirmation page
  // ============================================================
  await page.waitForURL(/\/booking\/confirmation/, { timeout: 30000 });
  await expect(page.getByText('Consultation Booked!'), '❌ "Consultation Booked!" not visible').toBeVisible({ timeout: 15000 });
  console.log(`[STEP 13] ✅ Booking confirmed: ${page.url()}`);

  // ============================================================
  // STEP 14 — Verify PCOSolve Quiz section + Start Your Assessment
  // ============================================================
  await expect(page.getByText(/PCOSolve Quiz|Help us know you better/i).first(), '❌ Quiz prompt section not visible').toBeVisible({ timeout: 10000 });
  const startAssessmentBtn = page.getByRole('link', { name: /start your assessment/i });
  await startAssessmentBtn.scrollIntoViewIfNeeded();
  await expect(startAssessmentBtn, '❌ Start Your Assessment not visible').toBeVisible({ timeout: 10000 });
  await startAssessmentBtn.click();
  console.log('[STEP 14] ✅ "Start Your Assessment" clicked');

  // ============================================================
  // STEP 15 — Verify quiz page loaded (Step 1/13)
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await expect(page.getByText('PCOS Assessment Form'), '❌ Quiz title not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 1'), '❌ Quiz Step 1 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 15] ✅ PCOS Assessment Form loaded — Step 1/13');

  // ============================================================
  // Helper: click option + assert Next becomes enabled + click Next
  // ============================================================
  const answerAndNext = async (optionText, step, type = 'radio') => {
    const option = page.getByRole('button', { name: new RegExp(optionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }).first();
    await expect(option, `❌ Q${step} option not visible: "${optionText}"`).toBeVisible({ timeout: 10000 });
    await option.click();
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextBtn, `❌ Next button disabled after Q${step} answer`).toBeEnabled({ timeout: 10000 });
    await nextBtn.click();
    console.log(`[STEP Q${step}] ✅ ${type === 'checkbox' ? '☑' : '🔘'} Answered Q${step}: "${optionText}"`);
  };

  // ============================================================
  // STEP 16 — Q1 (radio): How would you describe your body frame?
  // ============================================================
  await answerAndNext('I am overweight and find it difficult to lose weight', 1);

  // ============================================================
  // STEP 17 — Q2 (radio): Which lifestyle pattern best describes you?
  // ============================================================
  await answerAndNext('Sedentary — sitting most of the day', 2);

  // ============================================================
  // STEP 18 — Q3 (radio): Which best describes your usual state of mind?
  // ============================================================
  await answerAndNext('Anxious and stressed — mind races', 3);

  // ============================================================
  // STEP 19 — Q4 (radio): Which foods do you tend to gravitate towards?
  // ============================================================
  await answerAndNext('Spicy, hot and / or oily foods', 4);

  // ============================================================
  // STEP 20 — Q5 (radio): How would you describe your menstrual cycle?
  // ============================================================
  await answerAndNext('Regular (28–32 days) with normal flow', 5);

  // ============================================================
  // STEP 21 — Q6 (radio): How would you describe your menstrual discharge?
  // ============================================================
  await answerAndNext('Bright red, 40–60ml, normal consistency', 6);

  // ============================================================
  // STEP 22 — Q7 (checkbox): Pain during period — Select all that apply
  // ============================================================
  await page.getByRole('button', { name: /Minimal — only day 1/i }).first().click();
  await page.getByRole('button', { name: /Constant dull, throbbing pain/i }).first().click();
  await expect(page.getByRole('button', { name: 'Next', exact: true }), '❌ Next disabled after Q7').toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  console.log('[STEP Q7] ✅ ☑ Answered Q7 (checkbox): 2 options selected');

  // ============================================================
  // STEP 23 — Q8 (radio): How long have you experienced menstrual irregularities?
  // ============================================================
  await answerAndNext('In the last 3–4 years', 8);

  // ============================================================
  // STEP 24 — Q9 (radio): Bowel movements during period?
  // ============================================================
  await answerAndNext('Regular — no change during my period', 9);

  // ============================================================
  // STEP 25 — Q10 (checkbox): Day-to-day digestion — Select all that apply
  // ============================================================
  await page.getByRole('button', { name: /I have normal bowels/i }).first().click();
  await expect(page.getByRole('button', { name: 'Next', exact: true }), '❌ Next disabled after Q10').toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  console.log('[STEP Q10] ✅ ☑ Answered Q10 (checkbox): normal bowels selected');

  // ============================================================
  // STEP 26 — Q11 (radio): Pregnancy or fertility history?
  // ============================================================
  await answerAndNext('I am not trying to get pregnant', 11);

  // ============================================================
  // STEP 27 — Q12 (checkbox): Between periods — Select all that apply
  // ============================================================
  await page.getByRole('button', { name: /None of the above/i }).first().click();
  await expect(page.getByRole('button', { name: 'Next', exact: true }), '❌ Next disabled after Q12').toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  console.log('[STEP Q12] ✅ ☑ Answered Q12 (checkbox): None of the above');

  // ============================================================
  // STEP 28 — Q13 (checkbox): Pathological findings — Select all that apply
  // ============================================================
  await page.getByRole('button', { name: /All markers within normal range/i }).first().click();
  await expect(page.getByRole('button', { name: 'Next', exact: true }), '❌ Next disabled after Q13').toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  console.log('[STEP Q13] ✅ ☑ Answered Q13 (checkbox): All markers normal');

  // ============================================================
  // STEP 29 — Verify quiz result page
  // ============================================================
  await page.waitForURL(/\/quiz\/result/, { timeout: 15000 });
  await expect(page.getByText('Result Page'), '❌ Result Page header not visible').toBeVisible({ timeout: 15000 });
  const pcosType = page.locator('h1, h2, [class*="title"], [class*="heading"]').first();
  await expect(pcosType, '❌ PCOS type heading not visible').toBeVisible({ timeout: 10000 });
  const pcosTypeText = await pcosType.innerText().catch(() => 'Unknown');
  console.log(`[STEP 29] ✅ Quiz result page loaded — PCOS type: "${pcosTypeText}"`);

  await expect(page.getByText(/Dosha/i).first(), '❌ Dosha section not visible').toBeVisible({ timeout: 10000 });
  const downloadBtn = page.getByRole('button', { name: /download/i });
  await expect(downloadBtn, '❌ Download button not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 29] ✅ Dosha composition + Download button visible');

  console.log('🎉 Shantavri consultation booking + 13-question quiz flow complete');
});
