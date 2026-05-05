import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
  }
  // Clear cookies, localStorage, sessionStorage, and close browser
  await page.context().clearCookies().catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  }).catch(() => {});
  await page.context().clearPermissions().catch(() => {});
  await page.close().catch(() => {});
  console.log('🧹 Cookies, localStorage, sessionStorage cleared — browser closed');
});

test('Guest User → Select Concern (Omnichannel Flow)', async ({ page }) => {
  test.setTimeout(300000); // 5 min

  // ============================================================
  // STEP 1 — Generate unique test data
  // ============================================================
  const ts = Date.now();
  let phone = `9${ts.toString().slice(-9)}`;
  let email = `testuser${ts}@kapiva.test`;
  let name  = `Test User${ts.toString().slice(-4)}`;
  console.log(`[STEP 1] ✅ Generated → phone: ${phone} | email: ${email} | name: ${name}`);

  // ============================================================
  // STEP 2 — Open staging.kapiva.in
  // ============================================================
  await page.goto('https://staging.kapiva.in/');
  console.log('[STEP 2] ✅ Guest user landed on homepage');

  // ============================================================
  // STEP 3 — Dismiss staging popup
  // ============================================================
  await page.evaluate(() => {
    if (typeof window.hideStagingPopup === 'function') window.hideStagingPopup();
  });
  console.log('[STEP 3] ✅ Staging popup dismissed (if present)');

  // ============================================================
  // STEP 4 — Verify SELECT CONCERN section visible
  // ============================================================
  const concernLabel = page.getByText('SELECT CONCERN:');
  await expect(concernLabel).toBeVisible({ timeout: 10000 });
  console.log('[STEP 4] ✅ SELECT CONCERN section visible');

  // ============================================================
  // STEP 5 — Click "Blood Sugar & Chronic Care" concern
  // ============================================================
  const concernSection = page.locator('.relative.mb-5.lg\\:mb-10');
  await expect(concernSection).toBeVisible({ timeout: 10000 });
  const concernItem = concernSection.getByText('Blood Sugar & Chronic Care').first();
  await expect(concernItem).toBeVisible({ timeout: 10000 });
  await concernItem.click();
  console.log('[STEP 5] ✅ Clicked concern: Blood Sugar & Chronic Care');

  // ============================================================
  // STEP 6 — Verify selected concern label
  // ============================================================
  const selectedConcernLabel = page.locator('.mb-5.flex.items-center.justify-start.lg\\:mb-10');
  await expect(selectedConcernLabel).toBeVisible({ timeout: 10000 });
  const labelText = await selectedConcernLabel.innerText();
  expect(labelText, '❌ Selected concern label mismatch').toContain('Blood Sugar & Chronic Care');
  console.log(`[STEP 6] ✅ Selected concern label: "${labelText}"`);

  // ============================================================
  // STEP 7 — Click "View All Blood Sugar" → navigate to /solution/ page
  // ============================================================
  const viewAll = page.getByRole('link', { name: /View all Blood Sugar/i });
  await expect(viewAll).toBeVisible({ timeout: 10000 });
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/', { timeout: 15000 }),
    viewAll.click()
  ]);
  const solutionUrl = page.url();
  expect(solutionUrl, '❌ Did not navigate to solution page').toContain('/solution/');
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  console.log(`[STEP 7] ✅ Navigated to solution page: ${solutionUrl}`);

  // ============================================================
  // STEP 8 — Loop products → find "Dia Free Juice - Blood Sugar Management"
  // ============================================================
  const productGrid = page.locator('.lg\\:mx-\\[90px\\]');
  await expect(productGrid).toBeVisible({ timeout: 10000 });
  const products = productGrid.locator('article');
  const productCount = await products.count();
  console.log(`[STEP 8] 📦 Products found: ${productCount}`);

  let found = false;
  for (let i = 0; i < productCount; i++) {
    const product = products.nth(i);
    const title = await product.locator('h2').innerText().catch(() => '');
    console.log(`  [${i + 1}] ${title}`);

    if (title.includes('Dia Free Juice - Blood Sugar Management')) {
      console.log(`[STEP 8] ✅ Found target product: "${title}"`);

      // ============================================================
      // STEP 9 — Click product link → navigate to PDP
      // ============================================================
      const productLink = product.locator('a').first();
      await expect(productLink).toBeVisible({ timeout: 10000 });
      await Promise.all([
        page.waitForURL(url => url.pathname !== page.url(), { timeout: 15000 }).catch(() => {}),
        productLink.click()
      ]);
      const productUrl = page.url();
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
      console.log(`[STEP 9] ✅ Navigated to PDP: ${productUrl}`);

      found = true;
      break;
    }
  }
  expect(found, '❌ Product "Dia Free Juice - Blood Sugar Management" not found in grid').toBe(true);

  // ============================================================
  // STEP 10 — Wait for "Select a Pack" section
  // ============================================================
  await expect(page.getByText('Select a Pack')).toBeVisible({ timeout: 10000 });
  console.log('[STEP 10] ✅ "Select a Pack" section visible');

  // ============================================================
  // STEP 11 — Click first AOV pack
  // ============================================================
  // First pack inside the AOV scroll container
  const firstPack = page.locator('[class="no-scrollbar ml-[-24px] flex gap-[16px] overflow-x-scroll px-[24px]"] > *').first();
  await expect(firstPack, '❌ First AOV pack not found').toBeVisible({ timeout: 10000 });
  await firstPack.click();
  await page.waitForTimeout(500);
  console.log('[STEP 11] ✅ First AOV pack selected');

  // ============================================================
  // STEP 12 — Click BUY NOW
  // ============================================================
  const buyNowBtn = page.getByRole('button', { name: /buy now/i });
  await expect(buyNowBtn, '❌ BUY NOW button not visible').toBeVisible({ timeout: 10000 });
  await buyNowBtn.click();
  await page.waitForTimeout(2000);
  console.log('[STEP 12] ✅ BUY NOW clicked');

  // ============================================================
  // STEP 13 — Wait for checkout page URL
  // ============================================================
  await page.waitForURL(url => url.pathname.includes('checkout'), { timeout: 15000 });
  await page.setViewportSize({ width: 412, height: 810 });
  console.log(`[STEP 13] ✅ On checkout page: ${page.url()}`);

  // ============================================================
  // STEP 14 — Handle Shiprocket widget (if visible) then enter phone
  // ============================================================

  // Check if Shiprocket widget is showing
  const shiprocketWidget = page.locator('text=Verify your number to proceed').first();
  const shiprocketVisible = await shiprocketWidget.isVisible({ timeout: 5000 }).catch(() => false);

  if (shiprocketVisible) {
    console.log('[STEP 14] ⚠️ Shiprocket widget detected — running OTP flow');

    // 14a — Enter phone into Shiprocket widget
    const srPhoneInput = page.locator('input[placeholder="Phone No."]').first();
    await expect(srPhoneInput, '❌ Shiprocket phone input not found').toBeVisible({ timeout: 10000 });
    await srPhoneInput.fill(phone);
    await page.waitForTimeout(1000);
    console.log(`[STEP 14] ✅ Phone entered: ${phone}`);

    // 14b — Wait for Send OTP to be enabled, then click
    const sendOtpBtn = page.locator('button[aria-label="Send OTP"]').first();
    await expect(sendOtpBtn, '❌ Send OTP button not found').toBeVisible({ timeout: 10000 });
    await expect(sendOtpBtn, '❌ Send OTP button still disabled').toBeEnabled({ timeout: 10000 });
    await sendOtpBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('[STEP 14] ✅ Send OTP clicked');

    // 14c — Fill 999999 into 6 OTP boxes
    const firstOtpBox = page.locator('input[id="sr-otp-0"]');
    await expect(firstOtpBox, '❌ OTP boxes not visible').toBeVisible({ timeout: 15000 });
    for (let i = 0; i < 6; i++) {
      await page.locator(`input[id="sr-otp-${i}"]`).fill('9');
      await page.waitForTimeout(200);
    }
    console.log('[STEP 14] ✅ OTP entered: 999999');

    // 14d — Click arrow 3 more times
    for (let i = 1; i <= 3; i++) {
      const arrowBtn = page.locator('button[aria-label="Verify OTP"], button[aria-label="Send OTP"]').first();
      await expect(arrowBtn, `❌ Arrow not found on click ${i}`).toBeVisible({ timeout: 10000 });
      await arrowBtn.click({ force: true });
      await page.waitForTimeout(1000);
      console.log(`[STEP 14] ✅ Arrow clicked (${i}/3)`);
    }

    // 14e — Wait for normal form
    await expect(
      page.locator('[name="address1"]').first(),
      '❌ Normal form did not appear after Shiprocket flow'
    ).toBeVisible({ timeout: 15000 });
    console.log('[STEP 14] ✅ Normal form visible after Shiprocket');

  } else {
    console.log('[STEP 14] ✅ No Shiprocket widget — normal form already visible');
  }

  // Enter phone into normal form phone field
  const phoneInput = page.getByRole('textbox', { name: /phone/i });
  await expect(phoneInput).toBeVisible({ timeout: 10000 });
  await phoneInput.fill(phone);
  await page.waitForTimeout(500);
  console.log(`[STEP 14] ✅ Phone entered in normal form: ${phone}`);

  // ============================================================
  // STEP 15 — Fill address, pincode, email, name → Save Changes
  // ============================================================
  const address1Input = page.locator('[name="address1"]');
  await expect(address1Input).toBeVisible({ timeout: 10000 });
  await address1Input.fill('123, MG Road, Indiranagar');
  console.log('[STEP 15] ✅ Address filled: 123, MG Road, Indiranagar');

  const postalCodeInput = page.locator('[name="postalCode"]');
  await expect(postalCodeInput).toBeVisible({ timeout: 10000 });
  await postalCodeInput.fill('560001');
  await page.waitForTimeout(1500);
  console.log('[STEP 15] ✅ Pincode filled: 560001');

  const emailInput = page.getByRole('textbox', { name: /email/i });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  console.log(`[STEP 15] ✅ Email: ${email}`);

  const nameInput = page.getByRole('textbox', { name: /full name/i });
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.clear();
  await nameInput.fill(name);
  console.log(`[STEP 15] ✅ Name: ${name}`);

  // Re-check phone — re-fill if site cleared it
  const currentPhone = await phoneInput.inputValue();
  if (currentPhone !== phone) {
    console.log(`[STEP 15] ⚠️ Phone was cleared, re-filling...`);
    await phoneInput.fill(phone);
    await page.waitForTimeout(500);
  }
  console.log(`[STEP 15] ✅ Phone confirmed: ${phone}`);

  console.log('[STEP 15] ✅ All details filled');

  // Click Save Changes if visible
  const saveBtn = page.getByRole('button', { name: /save changes/i });
  const saveBtnVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (saveBtnVisible) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('[STEP 15] ✅ Save Changes clicked');
  } else {
    console.log('[STEP 15] ℹ️ Save Changes not visible — skipping');
  }

  // ============================================================
  // STEP 18 — Scroll → click PAY SECURELY
  // ============================================================
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  let payBtn = page.getByRole('button', { name: /pay securely/i });
  const payBtnVisible = await payBtn.isVisible().catch(() => false);
  if (!payBtnVisible) {
    payBtn = page.getByText(/pay securely/i).first();
  }
  await expect(payBtn, '❌ PAY SECURELY button not visible').toBeVisible({ timeout: 15000 });
  await payBtn.scrollIntoViewIfNeeded();
  await payBtn.click({ force: true });
  console.log('[STEP 18] ✅ PAY SECURELY clicked');

  // ============================================================
  // STEP 19 — Wait for payment section [id="80000141"] → click radio
  // ============================================================
  const paymentSection = page.locator('[id="80000141"]');
  await expect(paymentSection, '❌ Payment section #80000141 not visible').toBeVisible({ timeout: 30000 });
  await paymentSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const radioBtn = paymentSection.locator('input[type="radio"]').first();
  const isRadioVisible = await radioBtn.isVisible().catch(() => false);
  if (isRadioVisible) {
    await radioBtn.click({ force: true });
    console.log('[STEP 19] ✅ Radio button clicked in #80000141');
  } else {
    await paymentSection.click({ force: true });
    console.log('[STEP 19] ✅ Payment section #80000141 clicked (no radio input found)');
  }

  // ============================================================
  // STEP 20 — Scroll → click Proceed to Pay
  // ============================================================
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);
  const proceedBtn = page.getByRole('button', { name: /proceed to pay/i });
  await expect(proceedBtn, '❌ Proceed to Pay button not visible').toBeVisible({ timeout: 15000 });
  await proceedBtn.click({ force: true });
  console.log('[STEP 20] ✅ Proceed to Pay clicked');

  // ============================================================
  // STEP 21 — Wait for modal → open txnStateDropdownToggle
  // ============================================================
  const modalContent = page.locator('.modal-content').first();
  await expect(modalContent, '❌ .modal-content not visible').toBeVisible({ timeout: 30000 });
  console.log('[STEP 21] ✅ Payment modal visible');

  let targetFrame = page.mainFrame();
  for (const frame of page.frames()) {
    try {
      const count = await frame.locator('[id="txnStateDropdownToggle"]').count();
      if (count > 0) { targetFrame = frame; break; }
    } catch { /* skip */ }
  }

  const dropdownToggle = targetFrame.locator('[id="txnStateDropdownToggle"]');
  await expect(dropdownToggle, '❌ txnStateDropdownToggle not visible').toBeVisible({ timeout: 15000 });
  await dropdownToggle.click();
  await page.waitForTimeout(500);
  console.log('[STEP 21] ✅ txnStateDropdownToggle opened');

  // ============================================================
  // STEP 22 — Select "CHARGED" → click Submit
  // ============================================================
  const chargedOption = targetFrame.getByText('CHARGED', { exact: true }).last();
  await expect(chargedOption, '❌ CHARGED option not visible').toBeVisible({ timeout: 10000 });
  await chargedOption.click();
  console.log('[STEP 22] ✅ Selected "CHARGED"');

  const submitBtn = targetFrame.locator('[id="submitButton"]');
  await expect(submitBtn, '❌ submitButton not visible').toBeVisible({ timeout: 10000 });
  await submitBtn.click();
  console.log('[STEP 22] ✅ Submit clicked');

  // ============================================================
  // STEP 23 — Handle "Something Went Wrong" → click Try Again if visible
  // ============================================================
  const errorCard = page.locator('[class="mt-[12px] flex min-h-[180px] w-full min-w-0 flex-col items-center overflow-hidden rounded-[12px] p-[16px]"]');
  const somethingWrongVisible = await errorCard.isVisible().catch(() => false);
  if (somethingWrongVisible) {
    console.log('[STEP 23] ⚠️ "Something Went Wrong!" visible — clicking Try Again');
    const tryAgainBtn = errorCard.getByRole('button', { name: /try again/i });
    await expect(tryAgainBtn, '❌ Try Again button not found').toBeVisible({ timeout: 10000 });
    await tryAgainBtn.click();
    await page.waitForTimeout(2000);
    console.log('[STEP 23] ✅ Try Again clicked');
  } else {
    console.log('[STEP 23] ✅ No error — proceeding to Confirm Booking');
  }

  // ============================================================
  // STEP 24 — Click Confirm Booking → wait for confirmation page
  // ============================================================
  const confirmBtn = page.getByRole('button', { name: /confirm booking/i });
  await expect(confirmBtn, '❌ Confirm Booking button not visible').toBeVisible({ timeout: 30000 });
  await Promise.all([
    page.waitForURL(url => url.href !== page.url(), { timeout: 60000 }).catch(() => {}),
    confirmBtn.click(),
  ]);
  console.log('[STEP 24] ✅ Confirm Booking clicked — waiting for confirmation...');
  await page.waitForTimeout(3000);
  console.log(`[STEP 24] ✅ After booking URL: ${page.url()}`);

  // ============================================================
  // STEP 25 — Extract doctor name + booking time
  // ============================================================
  const bookingCard = page.locator('.flex.min-h-0.w-full.flex-1.flex-col').first();
  await expect(bookingCard, '❌ Booking card not visible').toBeVisible({ timeout: 15000 });
  const bookingText = await bookingCard.innerText();
  console.log(`[STEP 25] 📋 Booking details:\n${bookingText}`);

  // ============================================================
  // STEP 26 — Wait 20s → save phone to fixtures/guest_users.json
  // ============================================================
  console.log('[STEP 26] ⏸ Waiting 20s before saving...');
  await page.waitForTimeout(20000);

  const fixturePath = path.resolve('fixtures/guest_users.json');
  const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  fixtureData.guest_users.push({
    phone,
    email,
    name,
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(fixturePath, JSON.stringify(fixtureData, null, 2));
  console.log(`[STEP 26] ✅ Saved to fixtures/guest_users.json → phone: ${phone}`);

  console.log('🎉 Test complete');
});
