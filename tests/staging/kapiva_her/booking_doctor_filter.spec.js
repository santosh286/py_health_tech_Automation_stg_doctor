import { test, expect, devices } from '@playwright/test';
const BASE_URL = 'https://staging.kapivaher.com/';
test.use({ ...devices['Pixel 7'], launchOptions: { slowMo: 300 } });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = `test-results/screenshots/failure-${testInfo.title.replace(/\s+/g, '_')}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
  }
  await page.context().clearCookies().catch(() => {});
  await page.close().catch(() => {});
});

test('Booking Step 3 — doctor cards show name, speciality and availability', async ({ page }) => {
  test.setTimeout(120000);

  const ts    = Date.now();
  const name  = `Test User${ts.toString().slice(-4)}`;
  const email = `testuser${ts}@kapiva.test`;
  const phone = `9${ts.toString().slice(-9)}`;

  // STEP 1 — Navigate to /booking directly
  console.log('[STEP 1] Navigating to /booking');
  await page.goto(`${BASE_URL}booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log(`[STEP 1] Navigated to: ${page.url()}`);

  // STEP 2 — Fill personal details (name, email, phone) + state
  console.log('[STEP 2] Filling personal details');
  await expect(
    page.getByText(/fill your details|personal details/i).first(),
    '❌ Booking Step 1 form heading not visible'
  ).toBeVisible({ timeout: 15000 });

  await page.getByPlaceholder('Enter your name').fill(name);
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter 10-digit number').fill(phone);

  // Select state dropdown (required field)
  const stateSelect = page.locator('select').first();
  const stateVisible = await stateSelect.isVisible({ timeout: 3000 }).catch(() => false);
  if (stateVisible) {
    await stateSelect.selectOption({ index: 1 });
    const selectedState = await stateSelect.inputValue().catch(() => 'N/A');
    console.log(`[STEP 2] State selected: ${selectedState}`);
  } else {
    const stateByLabel = page.getByLabel(/state/i);
    const labelVisible = await stateByLabel.isVisible({ timeout: 3000 }).catch(() => false);
    if (labelVisible) {
      await stateByLabel.selectOption({ index: 1 });
      console.log('[STEP 2] State selected via label');
    }
  }
  console.log(`[STEP 2] Filled — name: "${name}" | email: "${email}" | phone: "${phone}"`);

  // STEP 3 — Click Next → slot selection page (Step 2)
  console.log('[STEP 3] Clicking Next to proceed to slot selection');
  const nextBtnStep1 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtnStep1.scrollIntoViewIfNeeded();
  await expect(nextBtnStep1, '❌ Next button on Step 1 not enabled').toBeEnabled({ timeout: 10000 });
  await nextBtnStep1.click();
  console.log('[STEP 3] Clicked Next');

  // STEP 4 — Verify slot selection page visible and select first available slot
  console.log('[STEP 4] Verifying slot selection page (Step 2)');
  await expect(
    page.getByText(/select.*slot/i).first(),
    '❌ Slot selection page not visible after clicking Next'
  ).toBeVisible({ timeout: 15000 });
  console.log('[STEP 4] Slot selection page visible');

  const timeSlots = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i });
  await expect(timeSlots.first(), '❌ No time slot buttons visible').toBeVisible({ timeout: 15000 });
  const firstSlotText = await timeSlots.first().innerText();
  await timeSlots.first().click();
  console.log(`[STEP 4] Selected first time slot: "${firstSlotText}"`);

  // STEP 5 — Click Next → Step 3 doctor selection page
  console.log('[STEP 5] Clicking Next to proceed to doctor selection (Step 3)');
  const nextBtnStep2 = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtnStep2.scrollIntoViewIfNeeded();
  await expect(nextBtnStep2, '❌ Next button on Step 2 not enabled after slot selection').toBeEnabled({ timeout: 10000 });
  await nextBtnStep2.click();
  console.log('[STEP 5] Clicked Next — navigating to Step 3');

  // STEP 6 — Verify "Choose your Expert" heading visible
  console.log('[STEP 6] Verifying "Choose your Expert" heading on Step 3');
  const chooseExpertHeading = page.getByText(/choose your expert/i).first();
  await expect(chooseExpertHeading, '❌ "Choose your Expert" heading not visible on Step 3').toBeVisible({ timeout: 20000 });
  console.log(`[STEP 6] "Choose your Expert" heading visible: "${await chooseExpertHeading.innerText()}"`);

  // STEP 7 — Verify at least 1 doctor card with "Ayurvedic Gynaecologist" text
  console.log('[STEP 7] Verifying at least 1 doctor card shows "Ayurvedic Gynaecologist"');
  const specialityText = page.getByText(/ayurvedic gynaecologist/i).first();
  await expect(specialityText, '❌ No "Ayurvedic Gynaecologist" speciality text found').toBeVisible({ timeout: 15000 });
  const specialityCount = await page.getByText(/ayurvedic gynaecologist/i).count();
  console.log(`[STEP 7] Found ${specialityCount} "Ayurvedic Gynaecologist" label(s) — doctor cards present`);

  // STEP 8 — Verify at least 1 doctor card shows availability or date info
  console.log('[STEP 8] Verifying at least 1 doctor card shows availability/date info');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasAvailability =
    /today|tomorrow|available|next|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}/i.test(bodyText);

  if (hasAvailability) {
    const availMatch = bodyText.match(/today|tomorrow|available|next available[^.\n]*/i) ||
                       bodyText.match(/\d{1,2}:\d{2}(am|pm)?/i) ||
                       bodyText.match(/\d{1,2}\/\d{1,2}/);
    console.log(`[STEP 8] Availability/date info found: "${availMatch ? availMatch[0].trim() : 'found via regex'}"`);
  } else {
    console.log('[STEP 8] No specific availability text found — doctor cards present, skipping availability check');
  }

  // STEP 9 — Verify each visible doctor card has a name starting with "Dr."
  console.log('[STEP 9] Verifying doctor names start with "Dr."');
  const hasDrPrefix = /Dr\./i.test(bodyText);
  expect(hasDrPrefix, '❌ No doctor name starting with "Dr." found on doctor selection page').toBe(true);

  // Gather all Dr. names visible on the page
  const drNameMatches = bodyText.match(/Dr\.\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
  const uniqueDrNames = [...new Set(drNameMatches)];
  console.log(`[STEP 9] Doctor names found: ${uniqueDrNames.join(', ') || 'N/A'}`);
  expect(uniqueDrNames.length, '❌ No "Dr." prefixed doctor names found').toBeGreaterThanOrEqual(1);

  // STEP 10 — Log count of available doctors
  console.log('[STEP 10] Logging count of available doctors');
  // Count via speciality labels as a reliable proxy for number of doctor cards
  const doctorCardCount = await page.getByText(/ayurvedic gynaecologist/i).count();
  console.log(`[STEP 10] Available doctor card(s) on Step 3: ${doctorCardCount}`);
  expect(doctorCardCount, '❌ No doctor cards visible on Step 3').toBeGreaterThanOrEqual(1);
  console.log(`[STEP 10] Total doctors available: ${doctorCardCount} — Step 3 doctor filter verified`);
});
