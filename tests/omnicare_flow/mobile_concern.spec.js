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
});

test('Guest User → Select Concern (Omnichannel Flow)', async ({ page }) => {
    test.setTimeout(300000); // 5 min — includes 2x 1-min waits for payment steps

  // ============================================================
  // ⚙️ UNIQUE TEST DATA — increments on every run via timestamp
  // ============================================================
  const ts = Date.now();
  let phone = `9${ts.toString().slice(-9)}`;  // 10-digit starting with 9
  let email = `testuser${ts}@kapiva.test`;
  let name  = `Test User${ts.toString().slice(-4)}`;
  console.log(`🔑 Generated → phone: ${phone} | email: ${email} | name: ${name}`);

  // ============================================================
  // 🌐 OPEN WEBSITE
  // ============================================================
  await page.goto('https://staging.kapiva.in/');
  console.log('🌐 Guest user landed on homepage');

  // ============================================================
  // 🚫 CLOSE STAGING POPUP IF VISIBLE
  // ============================================================
  await page.evaluate(() => {
    if (typeof window.hideStagingPopup === 'function') window.hideStagingPopup();
  });
  console.log('🚫 Staging popup dismissed (if present)');

  // ============================================================
  // ✅ VERIFY SELECT CONCERN SECTION
  // ============================================================
  const concernLabel = page.getByText('SELECT CONCERN:');
  await expect(concernLabel).toBeVisible({ timeout: 10000 });
  console.log('📌 SELECT CONCERN section visible');

  // ============================================================
  // 🧪 CLICK "Blood Sugar & Chronic Care" CONCERN
  // Uses .relative.mb-5.lg:mb-10 container which holds all concern items
  // ============================================================
  const concernSection = page.locator('.relative.mb-5.lg\\:mb-10');
  await expect(concernSection).toBeVisible({ timeout: 10000 });

  const concernItem = concernSection.getByText('Blood Sugar & Chronic Care').first();
  await expect(concernItem).toBeVisible({ timeout: 10000 });

  await concernItem.click();
  console.log('🧪 Clicking concern: Blood Sugar & Chronic Care');

  // ============================================================
  // ✅ ASSERT SELECTED CONCERN LABEL (mb-5 flex items-center justify-start lg:mb-10)
  // ============================================================
  const selectedConcernLabel = page.locator('.mb-5.flex.items-center.justify-start.lg\\:mb-10');
  await expect(selectedConcernLabel).toBeVisible({ timeout: 10000 });

  const labelText = await selectedConcernLabel.innerText();
  console.log(`✅ Selected concern label: "${labelText}"`);
  expect(labelText, '❌ Selected concern label mismatch').toContain('Blood Sugar & Chronic Care');

  // ============================================================
  // 🔗 CLICK "VIEW ALL" TO NAVIGATE TO SOLUTION PAGE
  // ============================================================
  const viewAll = page.getByRole('link', { name: /View all Blood Sugar/i });
  await expect(viewAll).toBeVisible({ timeout: 10000 });

  console.log('🧪 Clicking: View all Blood Sugar & Chronic Care');
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/', { timeout: 15000 }),
    viewAll.click()
  ]);

  const finalUrl = page.url();
  console.log(`✅ Navigated to: ${finalUrl}`);

  expect(finalUrl, '❌ Did not navigate to solution page').toContain('/solution/');

  // ============================================================
  // ✅ VERIFY PAGE CONTENT
  // ============================================================
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Blood Sugar & Chronic Care solution page loaded');

  // ============================================================
  // 🛒 LOOP PRODUCTS — find "Dia Free Juice" and click Add to Cart
  // Uses lg:mx-[90px] container which wraps the product grid
  // ============================================================
  const productGrid = page.locator('.lg\\:mx-\\[90px\\]');
  await expect(productGrid).toBeVisible({ timeout: 10000 });

  const products = productGrid.locator('article');
  const productCount = await products.count();
  console.log(`📦 Products found: ${productCount}`);

  let found = false;

  for (let i = 0; i < productCount; i++) {
    const product = products.nth(i);
    const title = await product.locator('h2').innerText().catch(() => '');

    console.log(`  [${i + 1}] ${title}`);

    if (title.includes('Dia Free Juice - Blood Sugar Management')) {
      console.log(`✅ Found target product: "${title}"`);

      // Add to Cart is the first button in the product card (cart icon, no text label)
      // Structure: generic > button[cart icon] + button[BUY NOW]
      const addToCart = product.locator('button').first();
      await expect(addToCart).toBeVisible({ timeout: 10000 });
      await addToCart.click();

      console.log('🛒 Add to Cart clicked for: Dia Free Juice - Blood Sugar Management');
      await page.waitForTimeout(1000);

      // ============================================================
      // 🖱 CLICK PRODUCT CARD — navigate to product detail page
      // ============================================================
      const productLink = product.locator('a').first();
      await expect(productLink).toBeVisible({ timeout: 10000 });

      await Promise.all([
        page.waitForURL(url => url.pathname !== page.url(), { timeout: 15000 }).catch(() => {}),
        productLink.click()
      ]);

      const productUrl = page.url();
      console.log(`🔗 Navigated to product page: ${productUrl}`);
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
      console.log('✅ Product detail page loaded');

      found = true;
      break;
    }
  }

  expect(found, '❌ Product "Dia Free Juice - Blood Sugar Management" not found in grid').toBe(true);

  



  // ============================================================
  // 🛒 CLICK CART ICON — [class="lg:size-[20px]"]
  // ============================================================
  const cartBtn = page.locator('[class="lg:size-[20px]"]');
  await expect(cartBtn).toBeVisible({ timeout: 10000 });
  await cartBtn.click({ force: true });
  console.log('🛒 Cart icon clicked');
  await page.waitForTimeout(2000);

  // ============================================================
  // ✅ WAIT FOR CART DRAWER TO OPEN — then assert product + checkout
  // ============================================================
  const checkout = page.getByRole('button', { name: 'CHECKOUT' });
  await expect(checkout, '❌ Cart drawer did not open — CHECKOUT not visible').toBeVisible({ timeout: 15000 });
  console.log('✅ Cart drawer open');

  // Find visible product text in cart drawer (page also has hidden product name behind overlay)
  const allMatches = await page.getByText('Dia Free Juice - Blood Sugar Management').all();
  let productInCart = false;
  for (const el of allMatches) {
    if (await el.isVisible().catch(() => false)) {
      const cardText = await el.innerText().catch(() => '');
      console.log(`📦 Product in cart: "${cardText}"`);
      productInCart = true;
      break;
    }
  }
  expect(productInCart, '❌ Product not visible in cart').toBe(true);
  console.log('✅ Product card visible with: Dia Free Juice - Blood Sugar Management');

  const detailsSection = page.locator('.h-full > div:nth-child(2)').first();
  const isDetailVisible = await detailsSection.isVisible().catch(() => false);
  if (isDetailVisible) {
    const detailsText = await detailsSection.innerText();
    console.log(`📋 Details section text:\n${detailsText}`);
    console.log('✅ Details section visible and has content');
  }

  // ============================================================
  // 📜 SCROLL DOWN + CLICK CHECKOUT
  // ============================================================
  await page.evaluate(() => window.scrollBy(0, 300));
  console.log('📜 Scrolled down');
  await checkout.click();
  console.log('✅ CHECKOUT clicked');

  // ============================================================
  // 🌐 WAIT FOR CHECKOUT PAGE
  // ============================================================
  await page.waitForURL(url => url.pathname.includes('checkout'), { timeout: 15000 });
  await page.setViewportSize({ width: 412, height: 810 });
  console.log('✅ On checkout page');

  // ============================================================
  // 📞 ENTER PHONE NUMBER FIRST
  // ============================================================
  const phoneInput = page.getByRole('textbox', { name: /phone/i });
  await expect(phoneInput).toBeVisible({ timeout: 10000 });
  await phoneInput.fill(phone);
  console.log(`📞 Phone entered: ${phone}`);
  await page.waitForTimeout(2000);

  // ============================================================
  // 🏠 FILL SHIPPING ADDRESS — address1 + postalCode
  // ============================================================
  const address1Input = page.locator('[name="address1"]');
  await expect(address1Input).toBeVisible({ timeout: 10000 });
  await address1Input.fill('123, MG Road, Indiranagar');
  console.log('🏠 Address filled: 123, MG Road, Indiranagar');

  const postalCodeInput = page.locator('[name="postalCode"]');
  await expect(postalCodeInput).toBeVisible({ timeout: 10000 });
  await postalCodeInput.fill('560001');
  console.log('📮 Pincode filled: 560001');

  // Wait for city/state to auto-populate from pincode
  await page.waitForTimeout(1500);

  // ============================================================
  // 📧 FILL EMAIL + NAME
  // ============================================================
  const emailInput = page.getByRole('textbox', { name: /email/i });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  console.log(`📧 Email: ${email}`);

  const nameInput = page.getByRole('textbox', { name: /full name/i });
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.clear();
  await nameInput.fill(name);
  console.log(`👤 Name: ${name}`);

  // ✅ Re-check phone — site may reset it after other fields fill
  const currentPhone = await phoneInput.inputValue();
  if (currentPhone !== phone) {
    console.log(`⚠️ Phone was cleared (got: "${currentPhone}"), re-filling...`);
    await phoneInput.fill(phone);
    await page.waitForTimeout(1000);
    console.log(`📞 Phone re-filled: ${phone}`);
  } else {
    console.log(`✅ Phone still intact: ${currentPhone}`);
  }

  // ============================================================
  // 💳 SCROLL + CLICK PAY SECURELY (sticky footer button)
  // ============================================================
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  // PAY SECURELY — try button role first, fall back to any element with text
  let payBtn = page.getByRole('button', { name: /pay securely/i });
  const payBtnVisible = await payBtn.isVisible().catch(() => false);
  if (!payBtnVisible) {
    payBtn = page.getByText(/pay securely/i).first();
  }
  await expect(payBtn, '❌ PAY SECURELY button not visible').toBeVisible({ timeout: 15000 });
  await payBtn.scrollIntoViewIfNeeded();
  await payBtn.click({ force: true });
  console.log('💳 PAY SECURELY clicked');

  // ============================================================
  // 🔘 WAIT FOR PAYMENT SECTION [id="80000141"] + CLICK RADIO
  // ============================================================
  const paymentSection = page.locator('[id="80000141"]');
  await expect(paymentSection, '❌ Payment section #80000141 not visible').toBeVisible({ timeout: 30000 });
  await paymentSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  console.log('✅ Payment section #80000141 visible');

  // Try native radio input first, fall back to clicking the section itself
  const radioBtn = paymentSection.locator('input[type="radio"]').first();
  const isRadioVisible = await radioBtn.isVisible().catch(() => false);
  if (isRadioVisible) {
    await radioBtn.click({ force: true });
    console.log('🔘 Radio button clicked in #80000141');
  } else {
    await paymentSection.click({ force: true });
    console.log('🔘 Payment section #80000141 clicked (no radio input found)');
  }

  // ============================================================
  // 📜 SCROLL + CLICK "Proceed to Pay"
  // ============================================================
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(500);

  const proceedBtn = page.getByRole('button', { name: /proceed to pay/i });
  await expect(proceedBtn, '❌ Proceed to Pay button not visible').toBeVisible({ timeout: 15000 });
  await proceedBtn.click({ force: true });
  console.log('✅ Proceed to Pay clicked');

  // // ============================================================
  // // 🖱 CLICK [id="80000134"] INSIDE PAYMENT IFRAME — wait 1 min
  // // ============================================================
  // // Wait for Razorpay payment iframe to load after "Proceed to Pay"
  // await page.waitForSelector('iframe[src*="razorpay"]', { timeout: 30000 });
  // const payFrame = page.frameLocator('iframe[src*="razorpay"]');

  // const elem134 = payFrame.locator('[id="80000133"]');
  // await expect(elem134, '❌ Element #80000133 not visible in iframe').toBeVisible({ timeout: 30000 });
  // await elem134.click({ force: true });
  // console.log('✅ Clicked #80000133 inside iframe');
  // await page.waitForTimeout(60000);
  // console.log('✅ Waited 1 min after #80000133');

  // // ============================================================
  // // 🖱 CLICK [id="80000181"] INSIDE PAYMENT IFRAME — wait 1 min
  // // ============================================================
  // const elem181 = payFrame.locator('[id="80000181"]');
  // await expect(elem181, '❌ Element #80000181 not visible in iframe').toBeVisible({ timeout: 30000 });
  // await elem181.click({ force: true });
  // console.log('✅ Clicked #80000181 inside iframe');
  // await page.waitForTimeout(60000);
  // console.log('✅ Waited 1 min after #80000181');

  // ============================================================
  // 🪟 WAIT FOR MODAL + SELECT "CHARGED" + SUBMIT
  // ============================================================
  // Wait for .modal-content to be visible
  const modalContent = page.locator('.modal-content').first();
  await expect(modalContent, '❌ .modal-content not visible').toBeVisible({ timeout: 30000 });
  console.log('✅ .modal-content visible');

  // 🔽 Open txnStateDropdownToggle — search across all frames
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
  console.log('🔽 txnStateDropdownToggle opened');
  await page.waitForTimeout(500);

  // ✅ Select CHARGED
  const chargedOption = targetFrame.getByText('CHARGED', { exact: true }).last();
  await expect(chargedOption, '❌ CHARGED option not visible').toBeVisible({ timeout: 10000 });
  await chargedOption.click();
  console.log('✅ Selected "CHARGED"');

  // 🚀 Click Submit
  const submitBtn = targetFrame.locator('[id="submitButton"]');
  await expect(submitBtn, '❌ submitButton not visible').toBeVisible({ timeout: 10000 });
  await submitBtn.click();
  console.log('✅ submitButton clicked');

  // ============================================================
  // ✅ CONFIRM BOOKING — wait for button + click + wait 1 min
  // ============================================================
  // If "Something Went Wrong!" appears, click "Try Again" inside that card to recover
  const errorCard = page.locator('[class="mt-[12px] flex min-h-[180px] w-full min-w-0 flex-col items-center overflow-hidden rounded-[12px] p-[16px]"]');
  const somethingWrongVisible = await errorCard.isVisible().catch(() => false);
  if (somethingWrongVisible) {
    console.log('⚠️ "Something Went Wrong!" card visible — clicking "Try Again"');
    const tryAgainBtn = errorCard.getByRole('button', { name: /try again/i });
    await expect(tryAgainBtn, '❌ Try Again button not found inside error card').toBeVisible({ timeout: 10000 });
    await tryAgainBtn.click();
    console.log('🔄 "Try Again" clicked — waiting for Confirm Booking...');
    await page.waitForTimeout(2000);
  }

  const confirmBtn = page.getByRole('button', { name: /confirm booking/i });
  await expect(confirmBtn, '❌ Confirm Booking button not visible').toBeVisible({ timeout: 30000 });
  await confirmBtn.click();
  console.log('✅ Confirm Booking clicked');
  await page.waitForTimeout(60000);
  console.log('✅ Waited 1 min after Confirm Booking');

  // ============================================================
  // 👨‍⚕️ EXTRACT DOCTOR NAME + BOOKING TIME
  // ============================================================
  const bookingCard = page.locator('.flex.min-h-0.w-full.flex-1.flex-col').first();
  await expect(bookingCard, '❌ Booking card not visible').toBeVisible({ timeout: 15000 });

  const bookingText = await bookingCard.innerText();
  console.log(`📋 Booking details:\n${bookingText}`);

  // ⏸ PAUSE — wait 5s at end to observe result
  // ============================================================
  console.log('⏸ Waiting 3 seconds before test ends...');
  await page.waitForTimeout(20000);
  // ============================================================
  // 💾 SAVE PHONE TO fixtures/guest_users.json
  // ============================================================
  const fixturePath = path.resolve('fixtures/guest_users.json');
  const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  fixtureData.guest_users.push({
    phone,
    email,
    name,
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(fixturePath, JSON.stringify(fixtureData, null, 2));
  console.log(`💾 Saved to fixtures/guest_users.json → phone: ${phone}`);

  console.log('✅ Test complete');

});
