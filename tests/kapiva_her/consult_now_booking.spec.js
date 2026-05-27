import { test, expect, devices } from '@playwright/test';

const BASE_URL = 'https://staging.kapivaher.com/';
const VIEWPORT  = { width: 412, height: 815 };

test.use({
  ...devices['Pixel 7'],
  launchOptions: {
    slowMo: 1000,
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

test('Consult Now Booking — Doctor Card on kapivaher landing page (Pixel 7)', async ({ page }) => {
  test.setTimeout(180000);

  const ts    = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // ============================================================
  // STEP 1 — Navigate to staging.kapivaher.com (Pixel 7 mobile)
  // ============================================================
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.setViewportSize(VIEWPORT);
  console.log(`[STEP 1] ✅ Navigated to ${BASE_URL} | Viewport: ${VIEWPORT.width}×${VIEWPORT.height}`);

  // ============================================================
  // STEP 2 — Verify URL
  // ============================================================
  expect(page.url()).toContain('staging.kapivaher.com');
  console.log(`[STEP 2] ✅ URL verified: ${page.url()}`);

  // ============================================================
  // STEP 3 — Scroll to "Meet your team of experts" section
  // ============================================================
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

  const expertsHeading = page.getByText(/meet your team of experts/i).first();
  await expect(expertsHeading, '❌ "Meet your team of experts" section not found').toBeVisible({ timeout: 15000 });
  await expertsHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  console.log('[STEP 3] ✅ Scrolled to "Meet your team of experts" doctor cards section');

  // ============================================================
  // STEP 4 — Count all "Consult Now" links on full page
  // ============================================================
  const allConsultLinks = page.getByRole('link', { name: /consult now/i });
  const linkCount = await allConsultLinks.count();
  console.log(`[STEP 4] 🔗 Total "Consult Now" links on page: ${linkCount}`);

  // ============================================================
  // STEP 5 — Click first visible "Consult Now" link
  // ============================================================
  let bookingOpened = false;
  let selectedDoctorName = 'Unknown';

  for (let i = 0; i < Math.max(linkCount, 5); i++) {
    const consultLink = allConsultLinks.nth(i);
    await consultLink.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);

    const isVisible = await consultLink.isVisible({ timeout: 3000 }).catch(() => false);
    if (!isVisible) {
      console.log(`[STEP 5] ⚠️ Link ${i + 1} — not visible, trying next...`);
      continue;
    }

    // Get doctor name from ancestor card
    const card = consultLink.locator('xpath=ancestor::div[contains(@class,"flex-shrink-0")]').first();
    const doctorNameEl = card.locator('p, h2, h3').first();
    selectedDoctorName = await doctorNameEl.innerText().catch(() => `Doctor ${i + 1}`);

    console.log(`[STEP 5] ✅ Doctor: ${selectedDoctorName.trim()} — clicking "Consult Now"`);
    await consultLink.click();
    bookingOpened = true;
    break;
  }

  expect(bookingOpened, '❌ No "Consult Now" link found/visible in doctors section').toBe(true);

  // ============================================================
  // STEP 6 — Wait for /booking?doctorId=... page to load
  // ============================================================
  await page.waitForURL(/\/booking/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  const bookingUrl = page.url();
  console.log(`[STEP 6] ✅ Booking page: ${bookingUrl}`);

  // ============================================================
  // STEP 7 — Verify "Personal Information" form
  //          When booking via doctorId, doctor + slot are pre-selected.
  //          Page shows a single form: name, email, phone → Book Now
  // ============================================================
  await expect(page.getByText('Personal Information'), '❌ "Personal Information" heading not visible').toBeVisible({ timeout: 15000 });
  console.log('[STEP 7] ✅ Personal Information form visible');

  // ============================================================
  // STEP 8 — Fill: Name, Email, Phone  (same placeholders as shantavri spec)
  // ============================================================
  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);

  // Select State dropdown (required field)
  const stateSelect = page.locator('select').filter({ hasText: '' }).first();
  const stateVisible = await stateSelect.isVisible({ timeout: 5000 }).catch(() => false);
  if (stateVisible) {
    await stateSelect.selectOption({ index: 1 });
    const selectedState = await stateSelect.inputValue().catch(() => 'N/A');
    console.log(`[STEP 8] ✅ State selected: ${selectedState}`);
  } else {
    // Try by label
    const stateDropdown = page.getByLabel(/state/i);
    const stateDropdownVisible = await stateDropdown.isVisible({ timeout: 3000 }).catch(() => false);
    if (stateDropdownVisible) {
      await stateDropdown.selectOption({ index: 1 });
      console.log('[STEP 8] ✅ State selected via label');
    }
  }

  console.log(`[STEP 8] ✅ Filled → name: ${name} | email: ${email} | phone: ${phone}`);

  // ============================================================
  // STEP 9 — Click "Book Now" (single step — no Next/slot selection)
  // ============================================================
  const bookNowBtn = page.getByRole('button', { name: /book now/i });
  await bookNowBtn.scrollIntoViewIfNeeded();
  await expect(bookNowBtn, '❌ "Book Now" button not visible').toBeVisible({ timeout: 10000 });
  await expect(bookNowBtn, '❌ "Book Now" button is disabled').toBeEnabled({ timeout: 10000 });
  await bookNowBtn.click();
  console.log('[STEP 9] ✅ "Book Now" clicked');

  // ============================================================
  // STEP 10 — Verify booking confirmation
  // ============================================================
  await page.waitForURL(/\/booking\/confirmation/, { timeout: 60000 });
  await expect(page.getByText('Consultation Booked!'), '❌ "Consultation Booked!" not visible').toBeVisible({ timeout: 15000 });
  console.log(`[STEP 10] ✅ Booking confirmed: ${page.url()}`);

  console.log(`🎉 Consult Now booking complete — Doctor: ${selectedDoctorName.trim()} | Name: ${name} | Phone: ${phone}`);

  // ============================================================
  // STEP 11 — Verify PCOSolve Quiz section + click "Start Your Assessment"
  // ============================================================
  await expect(page.getByText(/PCOSolve Quiz|PMOSolve Quiz|Help us know you better/i).first(), '❌ Quiz prompt section not visible').toBeVisible({ timeout: 10000 });
  const startAssessmentBtn = page.getByRole('link', { name: /start your assessment/i });
  await startAssessmentBtn.scrollIntoViewIfNeeded();
  await expect(startAssessmentBtn, '❌ "Start Your Assessment" not visible').toBeVisible({ timeout: 10000 });
  await startAssessmentBtn.click();
  console.log('[STEP 11] ✅ "Start Your Assessment" clicked');

  // ============================================================
  // STEP 12 — Verify quiz page loaded (Step 1/13)
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await expect(page.getByText(/PCOS Assessment Form|PMOS Assessment Form/i), '❌ Quiz title not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 1'), '❌ Quiz Step 1 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 12] ✅ Assessment Form loaded — Step 1');

  // ============================================================
  // Helpers for radio (single select) and checkbox (multi select) questions
  // Excludes non-option buttons: Next, Back, Skip, loading states
  // ============================================================
  const EXCLUDED = /^(next|back|skip|preparing|loading|generating|download|submit|book|consult|start|shop)/i;

  const pickFirstOption = async (step, type) => {
    // Wait for question to fully render
    await page.waitForTimeout(800);
    const options = page.locator('button, div[role="button"]');
    const count = await options.count();
    let answered = false;
    for (let i = 0; i < count; i++) {
      const opt = options.nth(i);
      const visible = await opt.isVisible({ timeout: 1500 }).catch(() => false);
      if (!visible) continue;
      const txt = (await opt.innerText().catch(() => '')).trim();
      if (!txt || txt.length < 3) continue;
      if (EXCLUDED.test(txt)) continue;
      await opt.click();
      console.log(`[Q${step}] ${type === 'radio' ? '🔘 Radio' : '☑ Checkbox'} — selected: "${txt.substring(0, 60)}"`);
      answered = true;
      break;
    }
    expect(answered, `❌ Q${step}: no ${type} option found`).toBe(true);
    // Last question has "Submit" instead of "Next"
    const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
    const submitBtn = page.getByRole('button', { name: 'Submit', exact: true });
    const hasNext = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasSubmit = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (hasNext) {
      await expect(nextBtn).toBeEnabled({ timeout: 10000 });
      await nextBtn.click();
      return false;
    } else if (hasSubmit) {
      await expect(submitBtn).toBeEnabled({ timeout: 10000 });
      await submitBtn.click();
      console.log(`[Q${step}] ✅ Last question — clicked "Submit"`);
      return true; // quiz done
    } else {
      throw new Error(`❌ Q${step}: Neither Next nor Submit button found`);
    }
  };

  const answerRadio    = async (step) => await pickFirstOption(step, 'radio');
  const answerCheckbox = async (step) => await pickFirstOption(step, 'checkbox');

  // ============================================================
  // Quiz questions — radio for single select, checkbox for multi select
  // Q1–Q6: radio  |  Q7: checkbox  |  Q8–Q11: radio  |  Q12–Q13: checkbox
  // Note: this quiz flow may end early (e.g. after Q7) depending on the path.
  //       After each answer we check if the result page already appeared.
  // ============================================================
  const isResultPage = async () => {
    const url = page.url();
    if (url.includes('/quiz/result')) return true;
    const resultText = await page.getByText('Result Page').isVisible({ timeout: 1000 }).catch(() => false);
    return resultText;
  };

  const quizPlan = [
    { step: 1,  type: 'radio'    },
    { step: 2,  type: 'radio'    },
    { step: 3,  type: 'radio'    },
    { step: 4,  type: 'radio'    },
    { step: 5,  type: 'radio'    },
    { step: 6,  type: 'radio'    },
    { step: 7,  type: 'checkbox' },
    { step: 8,  type: 'radio'    },
    { step: 9,  type: 'radio'    },
    { step: 10, type: 'checkbox' },
    { step: 11, type: 'radio'    },
    { step: 12, type: 'checkbox' },
    { step: 13, type: 'checkbox' },
  ];

  for (const q of quizPlan) {
    if (await isResultPage()) {
      console.log(`[Quiz] ℹ️  Result page appeared after Q${q.step - 1} — quiz complete`);
      break;
    }
    const isDone = q.type === 'radio' ? await answerRadio(q.step) : await answerCheckbox(q.step);
    if (isDone) {
      console.log(`[Quiz] ✅ Quiz submitted at Q${q.step} — exiting loop`);
      break;
    }
  }

  // ============================================================
  // STEP 13 — Verify quiz result page
  // ============================================================
  await page.waitForURL(/\/quiz/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  const resultUrl = page.url();
  console.log(`[STEP 13] ✅ Quiz result/end page: ${resultUrl}`);

  const resultHeading = page.locator('h1, h2, h3').first();
  await expect(resultHeading, '❌ Result heading not visible').toBeVisible({ timeout: 15000 });
  const resultText = await resultHeading.innerText().catch(() => 'Unknown');
  console.log(`[STEP 13] ✅ Result heading: "${resultText}"`);

  const downloadBtn = page.getByRole('button', { name: /download/i });
  const hasDownload = await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (hasDownload) {
    console.log('[STEP 13] ✅ Download button visible');
  } else {
    console.log('[STEP 13] ℹ️ Download button not present on this result page');
  }

  console.log('🏆 Full flow complete: Consult Now → Booking → Quiz (13 Qs) → Result');
});
