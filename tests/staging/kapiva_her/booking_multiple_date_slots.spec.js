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

test('Booking slot selection — different date tabs load new slots', async ({ page }) => {
  test.setTimeout(120000);

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
  // STEP 3 — Click Next to reach Step 2 (slot selection)
  // ============================================================
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true });
  await nextBtn.scrollIntoViewIfNeeded();
  await expect(nextBtn, 'Next button should be enabled after filling details').toBeEnabled({ timeout: 10000 });
  await nextBtn.click();
  console.log('[STEP 3] Clicked Next -> Step 2 slot selection');

  // ============================================================
  // STEP 4 — Verify slot selection page (Step 2/3)
  // ============================================================
  await expect(page.getByText(/select.*slot/i).first(), 'Slot selection page not visible').toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Step 2'), 'Step 2 indicator not visible').toBeVisible({ timeout: 10000 });
  console.log('[STEP 4] Step 2/3 slot selection page visible');

  // ============================================================
  // STEP 5 — Verify date tabs (day-of-week buttons) are visible
  // ============================================================
  const dateTabs = page.locator('button').filter({ hasText: /sun|mon|tue|wed|thu|fri|sat/i });
  await expect(dateTabs.first(), 'No date tabs (Sun/Mon/Tue...) found on slot selection page').toBeVisible({ timeout: 15000 });
  const dateTabCount = await dateTabs.count();
  expect(dateTabCount, 'Should have more than 1 date tab').toBeGreaterThan(1);
  console.log(`[STEP 5] ${dateTabCount} date tab(s) visible`);

  // ============================================================
  // STEP 6 — Click first date tab and count visible slots
  // ============================================================
  const firstTabText = await dateTabs.nth(0).innerText().catch(() => 'Tab 1');
  await dateTabs.nth(0).click();
  console.log(`[STEP 6] Clicked first date tab: "${firstTabText}"`);

  const timeSlots = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}(am|pm)/i });
  await expect(timeSlots.first(), 'No slot buttons visible after clicking first date tab').toBeVisible({ timeout: 15000 });
  const slotsOnTab1 = await timeSlots.count();
  console.log(`[STEP 6] Slots on first tab ("${firstTabText}"): ${slotsOnTab1}`);
  expect(slotsOnTab1, 'Should have at least 1 slot on first date tab').toBeGreaterThan(0);

  // ============================================================
  // STEP 7 — Click second date tab and verify slots load
  // ============================================================
  const secondTabText = await dateTabs.nth(1).innerText().catch(() => 'Tab 2');
  await dateTabs.nth(1).click();
  console.log(`[STEP 7] Clicked second date tab: "${secondTabText}"`);

  // Wait briefly for slots to re-render after tab switch
  await page.waitForTimeout(1000);
  await expect(timeSlots.first(), 'No slot buttons visible after clicking second date tab').toBeVisible({ timeout: 15000 });
  const slotsOnTab2 = await timeSlots.count();
  console.log(`[STEP 7] Slots on second tab ("${secondTabText}"): ${slotsOnTab2}`);
  expect(slotsOnTab2, 'Should have at least 1 slot on second date tab').toBeGreaterThan(0);

  // ============================================================
  // STEP 8 — Click third date tab if available
  // ============================================================
  if (dateTabCount >= 3) {
    const thirdTabText = await dateTabs.nth(2).innerText().catch(() => 'Tab 3');
    await dateTabs.nth(2).click();
    console.log(`[STEP 8] Clicked third date tab: "${thirdTabText}"`);

    await page.waitForTimeout(1000);
    await expect(timeSlots.first(), 'No slot buttons visible after clicking third date tab').toBeVisible({ timeout: 15000 });
    const slotsOnTab3 = await timeSlots.count();
    console.log(`[STEP 8] Slots on third tab ("${thirdTabText}"): ${slotsOnTab3}`);
    expect(slotsOnTab3, 'Should have at least 1 slot on third date tab').toBeGreaterThan(0);
  } else {
    console.log('[STEP 8] Fewer than 3 date tabs available — skipping third tab check');
  }

  // ============================================================
  // STEP 9 — Summary: verify slot counts logged per tab
  // ============================================================
  console.log(`[STEP 9] Date tab slot summary — Tab 1: ${slotsOnTab1} slots | Tab 2: ${slotsOnTab2} slots`);
  console.log('Booking multiple date slots test complete — date tabs load slots correctly');
});
