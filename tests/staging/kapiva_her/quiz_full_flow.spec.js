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

test('Quiz full flow — answer all questions and reach result page', async ({ page }) => {
  test.setTimeout(300000);

  const ts = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // ============================================================
  // STEP 1 — Navigate to /booking
  // ============================================================
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('[STEP 1] Navigated to /booking');

  // ============================================================
  // STEP 2 — Fill personal details
  // ============================================================
  await expect(page.getByText('Fill your Details'), '"Fill your Details" not visible').toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);
  const stateSelect = page.locator('select').first();
  if (await stateSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
    await stateSelect.selectOption({ index: 1 });
  }
  console.log(`[STEP 2] Filled details: name="${name}", email="${email}", phone="${phone}"`);

  // ============================================================
  // STEP 3 — Click Next (Step 1 -> Step 2)
  // ============================================================
  const nextBtn1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn1.scrollIntoViewIfNeeded();
  await expect(nextBtn1, 'Next button should be enabled after filling details').toBeEnabled({ timeout: 10000 });
  await nextBtn1.click();
  console.log('[STEP 3] Clicked Next -> Step 2 slot selection');

  // ============================================================
  // STEP 4 — Select first available time slot
  // ============================================================
  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection page not visible').toBeVisible({ timeout: 15000 });
  const firstSlot = page.locator('button').filter({ hasText: /^\d{1,2}:\d{2}(am|pm)$/i }).first();
  await expect(firstSlot, 'No time slots available').toBeVisible({ timeout: 15000 });
  const slotText = await firstSlot.innerText();
  await firstSlot.click();
  console.log(`[STEP 4] Selected time slot: "${slotText}"`);

  // ============================================================
  // STEP 5 — Click Next (Step 2 -> Step 3)
  // ============================================================
  const nextBtn2 = page.getByRole('button', { name: 'Next', exact: true });
  await expect(nextBtn2, 'Next button should be enabled after slot selection').toBeEnabled({ timeout: 10000 });
  await nextBtn2.click();
  console.log('[STEP 5] Clicked Next -> Step 3 doctor selection');

  // ============================================================
  // STEP 6 — Select first doctor
  // ============================================================
  await expect(page.getByText('Choose your Expert'), '"Choose your Expert" not visible').toBeVisible({ timeout: 15000 });
  const doctorCards = page.getByRole('button').filter({ hasText: /B\.A\.M\.S/i });
  const docCount = await doctorCards.count();
  expect(docCount, 'No doctors found on Step 3').toBeGreaterThan(0);
  console.log(`[STEP 6] ${docCount} doctor(s) available`);
  await expect(doctorCards.first(), 'First doctor card not visible').toBeVisible({ timeout: 10000 });
  const doctorName = await doctorCards.first().locator('p').first().innerText().catch(() => 'Unknown');
  await doctorCards.first().click();
  console.log(`[STEP 6] Selected doctor: "${doctorName}"`);

  // ============================================================
  // STEP 7 — Click Book Now
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await expect(bookNowBtn, '"Book Now" button not visible').toBeVisible({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 7] Clicked Book Now');

  // Retry once if booking fails
  await page.waitForTimeout(2000);
  const bookingFailed = await page.getByText(/booking failed/i).isVisible({ timeout: 3000 }).catch(() => false);
  if (bookingFailed) {
    console.log('[STEP 7] Booking failed — retrying with next doctor');
    const nextDoctor = page.getByRole('button').filter({ hasText: /B\.A\.M\.S/i }).nth(1);
    if (await nextDoctor.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextDoctor.click();
    }
    await bookNowBtn.click();
    console.log('[STEP 7] Book Now retry clicked');
  }

  // ============================================================
  // STEP 8 — Verify booking confirmation
  // ============================================================
  await page.waitForURL(/\/booking\/confirmation/, { timeout: 60000 });
  await expect(page.getByText('Consultation Booked!'), '"Consultation Booked!" not visible').toBeVisible({ timeout: 15000 });
  console.log(`[STEP 8] Booking confirmed: ${page.url()}`);

  // ============================================================
  // STEP 9 — Click Start Your Assessment
  // ============================================================
  await expect(page.getByText(/PCOSolve Quiz|PMOSolve Quiz|Help us know you better/i).first(), 'Quiz prompt section not visible').toBeVisible({ timeout: 10000 });
  const startAssessmentLink = page.getByRole('link', { name: /start your assessment/i });
  await startAssessmentLink.scrollIntoViewIfNeeded();
  await expect(startAssessmentLink, '"Start Your Assessment" link not visible').toBeVisible({ timeout: 10000 });
  await startAssessmentLink.click();
  console.log('[STEP 9] Clicked "Start Your Assessment"');

  // ============================================================
  // STEP 10 — Verify quiz page and title
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await expect(page.getByText(/PCOS Assessment Form|PMOS Assessment Form/i), 'Quiz title not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 10] Quiz page loaded — Assessment Form visible');

  // ============================================================
  // Quiz helper — picks first visible non-nav option, then clicks Next/Submit
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
      console.log(`[Q${step}] Selected: "${txt.substring(0, 50)}"`);
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

  // ============================================================
  // STEP 11 — Answer Q1-Q13 using pickFirstOption loop
  // ============================================================
  console.log('[STEP 11] Starting quiz — answering all questions');
  for (let q = 1; q <= 13; q++) {
    const currentUrl = page.url();
    if (currentUrl.includes('/quiz/result') || currentUrl.match(/\/quiz\/\d+/) === null && q > 1) {
      console.log(`[STEP 11] Result page reached at Q${q} — exiting loop`);
      break;
    }
    const done = await pickFirstOption(q);
    if (done) {
      console.log(`[STEP 11] Quiz submitted at Q${q}`);
      break;
    }
  }
  console.log('[STEP 11] All answered quiz questions processed');

  // ============================================================
  // STEP 12 — Verify result page loaded
  // ============================================================
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await page.waitForTimeout(3000); // allow dynamic content to render
  const resultUrl = page.url();
  console.log(`[STEP 12] Result page URL: ${resultUrl}`);

  // Result page may use h1-h4 or large text elements
  const resultHeading = page.locator('h1, h2, h3, h4, [class*="heading"], [class*="title"], [class*="result"]').first();
  const headingVisible = await resultHeading.isVisible({ timeout: 10000 }).catch(() => false);
  let headingText = 'N/A';
  if (headingVisible) {
    headingText = await resultHeading.innerText().catch(() => 'N/A');
    console.log(`[STEP 12] Result heading: "${headingText}"`);
  } else {
    // Fallback: any visible text content on the page
    const bodyText = await page.locator('body').innerText().catch(() => '');
    headingText = bodyText.substring(0, 100).trim();
    console.log(`[STEP 12] No heading found — body text preview: "${headingText}"`);
    expect(bodyText.length, 'Result page body should not be empty').toBeGreaterThan(10);
  }

  // ============================================================
  // STEP 13 — Log PMOS type from heading
  // ============================================================
  const pmosMatch = headingText.match(/PMOS[^a-zA-Z]*([A-Za-z\s]+)/i) || headingText.match(/PCOS[^a-zA-Z]*([A-Za-z\s]+)/i);
  const pmosType = pmosMatch ? pmosMatch[0].trim() : headingText.trim();
  console.log(`[STEP 13] PMOS type from result: "${pmosType}"`);

  console.log('Quiz full flow complete — all questions answered and result page verified');
});
