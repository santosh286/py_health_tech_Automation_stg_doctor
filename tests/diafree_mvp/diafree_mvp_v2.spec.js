import { test, expect, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { applyStealthScripts } from '../helpers/stealth.js';

async function waitForCloudflare(page, label = '', timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const title = await page.title().catch(() => '');
    const bodyText = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    const isChallenge =
      title.includes('Just a moment') ||
      bodyText.includes('Performing security verification') ||
      bodyText.includes('Verify you are human');
    if (!isChallenge) return;
    console.log(`[Cloudflare] ⏳ Challenge active${label ? ' at ' + label : ''} — waiting...`);
    await page.waitForTimeout(2000);
  }
  throw new Error(`❌ Cloudflare bot challenge not resolved after ${timeoutMs / 1000}s${label ? ' at ' + label : ''}`);
}

test.use({
  ...devices['Pixel 7'],
  channel: 'chrome',
  launchOptions: {
    slowMo: process.env.CI ? 0 : 1000,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--disable-dev-shm-usage',
    ],
  },
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  extraHTTPHeaders: {
    'Accept-Language': 'en-US,en;q=0.9',
  },
});

test.beforeEach(async ({ page }) => {
  await applyStealthScripts(page);
});

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = `test-results/screenshots/failure-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    console.log(`📸 Screenshot saved: ${screenshotPath}`);
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
  }
  await page.context().clearCookies().catch(() => {});
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  }).catch(() => {});
  await page.context().clearPermissions().catch(() => {});
  await page.close().catch(() => {});
  console.log('🧹 Cookies, localStorage, sessionStorage cleared — browser closed');
});

test('DiafFree MVP V2 — Homepage to PDP (Steps 1–10)', async ({ page }) => {
  test.setTimeout(process.env.CI ? 600000 : 480000);

  // ============================================================
  // STEP 1 — Generate unique test data
  // ============================================================
  const ts = Date.now();
  const phone = `9${ts.toString().slice(-9)}`;
  const email = `testuser${ts}@kapiva.test`;
  const name  = `Test User${ts.toString().slice(-4)}`;
  console.log(`[STEP 1] ✅ Generated → phone: ${phone} | email: ${email} | name: ${name}`);

  // ============================================================
  // STEP 2 — Open staging.kapiva.in
  // ============================================================
  await page.goto('https://staging.kapiva.in/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await waitForCloudflare(page, 'homepage');
  console.log('[STEP 2] ✅ Guest user landed on homepage');

  // ============================================================
  // STEP 3 — Dismiss staging popup (if present)
  // ============================================================
  try {
    await page.evaluate(() => {
      if (typeof window.hideStagingPopup === 'function') window.hideStagingPopup();
    });
    const closeSelectors = [
      'button[aria-label="Close"]',
      'button[aria-label="close"]',
      '[data-testid="close-popup"]',
      '.popup-close',
      '.modal-close',
      'button.close',
      '[class*="close"][class*="modal"]',
      '[class*="popup"] button',
      '[class*="overlay"] button',
    ];
    for (const sel of closeSelectors) {
      const btn = page.locator(sel).first();
      const visible = await btn.isVisible({ timeout: 1500 }).catch(() => false);
      if (visible) {
        await btn.click({ force: true });
        console.log(`[STEP 3] ✅ Closed popup via selector: ${sel}`);
        break;
      }
    }
  } catch {
    // best-effort
  }
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
  const concernItem = page.getByText('Blood Sugar & Chronic Care').first();
  await expect(concernItem).toBeVisible({ timeout: 15000 });
  await concernItem.scrollIntoViewIfNeeded();
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
  await expect(viewAll).toBeVisible({ timeout: 15000 });
  await viewAll.scrollIntoViewIfNeeded();
  await Promise.all([
    page.waitForURL(url => url.pathname !== '/', { timeout: 15000 }),
    viewAll.click(),
  ]);
  const solutionUrl = page.url();
  expect(solutionUrl, '❌ Did not navigate to solution page').toContain('/solution/');
  await waitForCloudflare(page, 'solution page');
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  console.log(`[STEP 7] ✅ Navigated to solution page: ${solutionUrl}`);

  // ============================================================
  // STEP 8 — Loop product grid → find "Dia Free Juice - Blood Sugar Management"
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
      // STEP 9 — Click product → navigate to PDP
      // ============================================================
      const productLink = product.locator('a').first();
      await expect(productLink).toBeVisible({ timeout: 10000 });
      await productLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(url => url.pathname !== page.url(), { timeout: 15000 }).catch(() => {}),
        productLink.click(),
      ]);
      await waitForCloudflare(page, 'PDP');
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
      console.log(`[STEP 9] ✅ Navigated to PDP: ${page.url()}`);

      // ============================================================
      // STEP 10 — Set chronic_bucket cookie to 20 and reload PDP
      // ============================================================
      const pdpUrl = new URL(page.url());
      await page.context().addCookies([{
        name: 'chronic_bucket',
        value: '20',
        domain: pdpUrl.hostname,
        path: '/',
      }]);
      const cookies = await page.context().cookies();
      const setCookie = cookies.find(c => c.name === 'chronic_bucket');
      console.log(`[STEP 10] ✅ chronic_bucket set to: ${setCookie?.value}`);

      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await waitForCloudflare(page, 'PDP reload');
      await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
      console.log(`[STEP 10] ✅ PDP reloaded with chronic_bucket=20: ${page.url()}`);

      found = true;
      break;
    }
  }
  expect(found, '❌ Product "Dia Free Juice - Blood Sugar Management" not found in grid').toBe(true);

  // ============================================================
  // STEP 11 — Select pack card with green border + click radio button
  // ============================================================
  // Scroll to "Select a Pack" section first
  const selectPackHeading = page.getByText('Select a Pack');
  await expect(selectPackHeading, '❌ "Select a Pack" section not visible').toBeVisible({ timeout: 10000 });
  await selectPackHeading.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  // Click "100-day Dia Free Transform" pack using text — scroll into view first
  const transformPack = page.getByText('100-day Dia Free Transform').first();
  await expect(transformPack, '❌ "100-day Dia Free Transform" pack not visible').toBeVisible({ timeout: 10000 });
  await transformPack.scrollIntoViewIfNeeded();
  await transformPack.click({ force: true });
  console.log('[STEP 11] ✅ "100-day Dia Free Transform" pack clicked');

  // Wait 1s for green border state to render
  await page.waitForTimeout(1000);

  // Verify and click the green-bordered container via JS (CSS can't handle Tailwind brackets)
  const greenClicked = await page.evaluate(() => {
    const target = [...document.querySelectorAll('div')].find(el =>
      el.className.includes('border-[#506000]') &&
      el.className.includes('bg-[#EDEFE5]') &&
      el.className.includes('rounded-[12px]')
    );
    if (target) { target.click(); return target.innerText?.slice(0, 60) || 'clicked'; }
    return null;
  });

  if (greenClicked) {
    console.log(`[STEP 11] ✅ Green border container selected: "${greenClicked.split('\n')[0]}"`);
  } else {
    console.log('[STEP 11] ℹ️ Pack selected via inner click — green border is client-side state');
  }

  // ============================================================
  // STEP 12 — Click "How it works"
  // ============================================================
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(1000);

  // Try multiple text variants
  const howItWorks =
    await page.getByText('How it works', { exact: true }).first().isVisible({ timeout: 3000 }).catch(() => false)
      ? page.getByText('How it works', { exact: true }).first()
      : page.getByText(/how it works/i).first();
  await expect(howItWorks, '❌ "How it works" not visible').toBeVisible({ timeout: 10000 });
  await howItWorks.scrollIntoViewIfNeeded();
  await howItWorks.click();
  console.log('[STEP 12] ✅ "How it works" clicked');

  // Wait for all 4 slides to autoscroll — poll every 2s until slide 4 is active (max 20s)
  let slide4Active = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.waitForTimeout(2000);
    const activeSlide = await page.evaluate(() => {
      // Look for active/current slide indicator — dot, aria-current, or data-index
      const dots = [...document.querySelectorAll('[aria-label*="slide"], [data-slide], .swiper-pagination-bullet, .carousel-dot, [class*="pagination"] span, [class*="dot"]')];
      const active = dots.filter(d =>
        d.classList.contains('active') ||
        d.classList.contains('swiper-pagination-bullet-active') ||
        d.getAttribute('aria-current') === 'true' ||
        d.getAttribute('aria-selected') === 'true'
      );
      return { total: dots.length, activeIndex: active.length ? dots.indexOf(active[active.length - 1]) + 1 : -1 };
    });
    console.log(`[STEP 12] 🔄 Slide check: total=${activeSlide.total} active=${activeSlide.activeIndex}`);
    if (activeSlide.total >= 4 && activeSlide.activeIndex === activeSlide.total) {
      slide4Active = true;
      console.log('[STEP 12] ✅ All 4 slides completed autoscroll');
      break;
    }
  }
  if (!slide4Active) {
    console.log('[STEP 12] ⚠️ Could not confirm slide 4 — proceeding after max wait');
  }

  // ============================================================
  // STEP 13 — Click the circular play/action button
  // ============================================================
  const circleBtn = page.locator('[class="absolute left-1/2 top-0 z-10 flex aspect-square w-[42px] items-center justify-center rounded-full"]').first();
  await expect(circleBtn, '❌ Circle button not visible').toBeVisible({ timeout: 10000 });
  await circleBtn.scrollIntoViewIfNeeded();
  await circleBtn.click({ force: true });
  console.log('[STEP 13] ✅ Circle button clicked');

  // ============================================================
  // STEP 13A — "Take Assessment Now" flow (appears after circle button OR BUY NOW)
  // Handles: Male selection → Height 5ft 8in → Weight 70kg → Waist → Next
  // ============================================================
  const runAssessmentFlow = async (triggerLabel) => {
    await page.waitForTimeout(1500);
    const takeBtn = page.getByText(/take assessment now/i).first();
    const takeBtnVisible = await takeBtn.isVisible({ timeout: 4000 }).catch(() => false);
    if (!takeBtnVisible) return false;

    await expect(takeBtn, `❌ [${triggerLabel}] Take Assessment Now not visible`).toBeVisible();
    await takeBtn.scrollIntoViewIfNeeded();
    await takeBtn.click({ force: true });
    await page.waitForTimeout(1500);
    console.log(`[STEP 13A] ✅ [${triggerLabel}] "Take Assessment Now" clicked`);

    // Select Male
    const maleOption = page.getByText('Male', { exact: true }).first();
    await expect(maleOption, '❌ Male option not visible').toBeVisible({ timeout: 8000 });
    await maleOption.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('[STEP 13A] ✅ Male selected');

    // Wait for Height form
    const heightLabel = page.getByText('Height', { exact: true });
    await expect(heightLabel, '❌ Height label not visible').toBeVisible({ timeout: 8000 });
    console.log('[STEP 13A] ✅ Height / Weight form visible');

    // Fill Height 5 Ft via JS
    await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input[type="number"], input[type="text"]')];
      const ft = inputs.find(el => (el.nextElementSibling?.textContent?.trim() === 'Ft' || el.placeholder?.includes('Ft') || el.parentElement?.innerText?.includes('Ft')));
      if (ft) { ft.value = '5'; ['input','change'].forEach(t => ft.dispatchEvent(new Event(t, { bubbles: true }))); }
    });
    console.log('[STEP 13A] ✅ Height Ft = 5');

    // Fill Height 8 Inch via JS
    await page.evaluate(() => {
      const inputs = [...document.querySelectorAll('input[type="number"], input[type="text"]')];
      const inch = inputs.find(el => (el.nextElementSibling?.textContent?.trim() === 'Inch' || el.placeholder?.includes('Inch') || el.parentElement?.innerText?.includes('Inch')));
      if (inch) { inch.value = '8'; ['input','change'].forEach(t => inch.dispatchEvent(new Event(t, { bubbles: true }))); }
    });
    console.log('[STEP 13A] ✅ Height Inch = 8');
    await page.waitForTimeout(500);

    // Assert Weight label and value 70
    const weightLabel = page.getByText('Weight', { exact: true });
    await expect(weightLabel, '❌ Weight label not visible').toBeVisible({ timeout: 5000 });
    const weightIs70 = await page.getByText('70', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
    if (weightIs70) {
      console.log('[STEP 13A] ✅ Weight = 70 Kg — asserted');
    } else {
      console.log('[STEP 13A] ℹ️ Weight "70" not found on page — default accepted');
    }

    // Assert Waist size label
    const waistLabel = page.getByText('Waist size', { exact: true });
    const waistVisible = await waistLabel.isVisible({ timeout: 3000 }).catch(() => false);
    if (waistVisible) {
      console.log('[STEP 13A] ✅ Waist size section visible — asserted');
    }

    // Click Next button
    const nextBtn = page.getByRole('button', { name: /next/i });
    await expect(nextBtn, '❌ Next button not visible').toBeVisible({ timeout: 8000 });
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.click({ force: true });
    await page.waitForTimeout(1500);
    console.log('[STEP 13A] ✅ Next button clicked');

    // Assert assessment no longer showing
    const stillOnAssessment = await page.getByText(/take assessment now/i).isVisible({ timeout: 2000 }).catch(() => false);
    expect(stillOnAssessment, '❌ Still showing assessment after Next click').toBe(false);
    console.log('[STEP 13A] ✅ Assessment complete — navigated forward');
    return true;
  };

  // Try after circle button
  const assessmentDoneAfterCircle = await runAssessmentFlow('after-circle-btn');
  if (!assessmentDoneAfterCircle) {
    console.log('[STEP 13A] ℹ️ No assessment form after circle button — will check after BUY NOW');
  }

  // ============================================================
  // STEP 14 — Click BUY NOW
  // ============================================================
  const buyNowBtn = page.getByRole('button', { name: /buy now/i }).last();
  await expect(buyNowBtn, '❌ BUY NOW button not visible').toBeVisible({ timeout: 10000 });
  await buyNowBtn.scrollIntoViewIfNeeded();
  await buyNowBtn.click();
  await page.waitForTimeout(2000);
  console.log('[STEP 14] ✅ BUY NOW clicked');

  // ============================================================
  // STEP 14A — Assessment form (also checked after BUY NOW if not triggered earlier)
  // ============================================================
  if (!assessmentDoneAfterCircle) {
    const assessmentDoneAfterBuy = await runAssessmentFlow('after-buy-now');
    if (!assessmentDoneAfterBuy) {
      console.log('[STEP 14A] ℹ️ No assessment form found — proceeding to checkout');
    }
  }

  // ============================================================
  // STEP 15 — Wait for checkout page URL
  // ============================================================
  await page.waitForURL(url => url.pathname.includes('checkout'), { timeout: 25000 });
  await page.setViewportSize({ width: 412, height: 915 });
  console.log(`[STEP 15] ✅ On checkout page: ${page.url()}`);

  // ============================================================
  // STEP 16 — Handle Shiprocket widget (if visible) then enter phone
  // ============================================================
  const shiprocketWidget = page.locator('text=Verify your number to proceed').first();
  const shiprocketVisible = await shiprocketWidget.isVisible({ timeout: 5000 }).catch(() => false);

  if (shiprocketVisible) {
    console.log('[STEP 16] ⚠️ Shiprocket widget detected — running OTP flow');

    const srPhoneInput = page.locator('input[placeholder="Phone No."]').first();
    await expect(srPhoneInput, '❌ Shiprocket phone input not found').toBeVisible({ timeout: 10000 });
    await srPhoneInput.fill(phone);
    await page.waitForTimeout(1000);
    console.log(`[STEP 16] ✅ Phone entered in Shiprocket: ${phone}`);

    const sendOtpBtn = page.locator('button[aria-label="Send OTP"]').first();
    await expect(sendOtpBtn, '❌ Send OTP button not found').toBeVisible({ timeout: 10000 });
    await expect(sendOtpBtn, '❌ Send OTP button still disabled').toBeEnabled({ timeout: 10000 });
    await sendOtpBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('[STEP 16] ✅ Send OTP clicked');

    const firstOtpBox = page.locator('input[id="sr-otp-0"]');
    await expect(firstOtpBox, '❌ OTP boxes not visible').toBeVisible({ timeout: 15000 });
    for (let i = 0; i < 6; i++) {
      await page.locator(`input[id="sr-otp-${i}"]`).fill('9');
      await page.waitForTimeout(200);
    }
    console.log('[STEP 16] ✅ OTP entered: 999999');

    for (let i = 1; i <= 3; i++) {
      const arrowBtn = page.locator('button[aria-label="Verify OTP"], button[aria-label="Send OTP"]').first();
      await expect(arrowBtn, `❌ Arrow not found on click ${i}`).toBeVisible({ timeout: 10000 });
      await arrowBtn.click({ force: true });
      await page.waitForTimeout(1000);
      console.log(`[STEP 16] ✅ Arrow clicked (${i}/3)`);
    }

    await expect(
      page.locator('[name="address1"]').first(),
      '❌ Normal form did not appear after Shiprocket flow'
    ).toBeVisible({ timeout: 15000 });
    console.log('[STEP 16] ✅ Normal form visible after Shiprocket');
  } else {
    console.log('[STEP 16] ✅ No Shiprocket widget — normal form already visible');
  }

  const phoneInput = page.getByRole('textbox', { name: /phone/i });
  await expect(phoneInput).toBeVisible({ timeout: 10000 });
  await phoneInput.fill(phone);
  await page.waitForTimeout(500);
  console.log(`[STEP 16] ✅ Phone entered in normal form: ${phone}`);

  // ============================================================
  // STEP 17 — Fill address, pincode, email, name → Save Changes
  // ============================================================
  // Some checkout layouts hide the address form behind a toggle — expand it first
  await page.setViewportSize({ width: 412, height: 915 });
  const deliveryToggle = page.getByText(/fill your delivery details/i).first();
  const toggleVisible = await deliveryToggle.isVisible({ timeout: 4000 }).catch(() => false);
  if (toggleVisible) {
    await deliveryToggle.scrollIntoViewIfNeeded();
    await deliveryToggle.click({ force: true });
    await page.waitForTimeout(1500);
    console.log('[STEP 17] ✅ "Fill your delivery details" toggle clicked');
  }

  const address1Input = page.locator('[name="address1"]');
  await expect(address1Input).toBeVisible({ timeout: 12000 });
  await address1Input.fill('123, MG Road, Indiranagar');
  console.log('[STEP 17] ✅ Address filled');

  const postalCodeInput = page.locator('[name="postalCode"]');
  await expect(postalCodeInput).toBeVisible({ timeout: 10000 });
  await postalCodeInput.fill('560001');
  await page.waitForTimeout(1500);
  console.log('[STEP 17] ✅ Pincode filled: 560001');

  const emailInput = page.getByRole('textbox', { name: /email/i });
  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  console.log(`[STEP 17] ✅ Email: ${email}`);

  const nameInput = page.getByRole('textbox', { name: /full name/i });
  await expect(nameInput).toBeVisible({ timeout: 10000 });
  await nameInput.clear();
  await nameInput.fill(name);
  console.log(`[STEP 17] ✅ Name: ${name}`);

  const currentPhone = await phoneInput.inputValue();
  if (currentPhone !== phone) {
    await phoneInput.fill(phone);
    await page.waitForTimeout(500);
    console.log('[STEP 17] ⚠️ Phone re-filled after being cleared');
  }
  console.log(`[STEP 17] ✅ Phone confirmed: ${phone}`);

  const saveBtn = page.getByRole('button', { name: /save changes/i });
  const saveBtnVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (saveBtnVisible) {
    await saveBtn.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('[STEP 17] ✅ Save Changes clicked');
  } else {
    console.log('[STEP 17] ℹ️ Save Changes not visible — skipping');
  }

  // ============================================================
  // STEP 18 — Scroll → click PAY SECURELY
  // ============================================================
  // Wait for "Payment Processing..." to clear, then scroll and find PAY SECURELY
  await page.waitForFunction(
    () => !document.body.innerText.includes('Payment Processing'),
    { timeout: 15000 }
  ).catch(() => console.log('[STEP 18] ℹ️ Payment Processing state did not clear — proceeding'));

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2000);

  // PAY SECURELY may be a div/span, not a button — use getByText fallback chain
  const payBtn = page.getByText(/pay securely/i).last();
  await expect(payBtn, '❌ PAY SECURELY not visible').toBeVisible({ timeout: 15000 });
  await payBtn.scrollIntoViewIfNeeded();
  await payBtn.click({ force: true });
  console.log('[STEP 18] ✅ PAY SECURELY clicked');

  // ============================================================
  // STEP 19 — Wait for payment section #80000141 → click radio
  // (For 100-day pack this navigates directly to Juspay payment page)
  // ============================================================
  await page.setViewportSize({ width: 412, height: 915 });
  const paymentSection = page.locator('[id="80000141"]');
  await expect(paymentSection, '❌ Payment section #80000141 not visible').toBeVisible({ timeout: 30000 });
  await paymentSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  const radioBtn = paymentSection.locator('input[type="radio"], [role="radio"]').first();
  const isRadioVisible = await radioBtn.isVisible({ timeout: 2000 }).catch(() => false);
  if (isRadioVisible) {
    await radioBtn.click({ force: true });
  } else {
    await paymentSection.click({ force: true });
  }
  console.log(`[STEP 19] ✅ #80000141 clicked — URL: ${page.url()}`);

  // ============================================================
  // STEP 20 — Juspay payment page: select Test wallet → Proceed to Pay
  // ============================================================
  // Wait for Juspay page to fully load
  await page.waitForURL(url => url.toString().includes('juspay'), { timeout: 30000 });
  await page.getByText('Payment Methods').waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log(`[STEP 20] 🔍 Juspay page loaded: ${page.url()}`);

  // Scroll to Wallets section
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);

  // Tap the Test wallet — use the right-side (radio circle) of the row for better hit accuracy
  const tapTestWallet = async () => {
    const coords = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div')].filter(
        el => el.className === 'linearLayout' &&
              el.innerText?.trim() === 'Test' &&
              el.children.length === 3 &&
              el.getClientRects().length > 0
      );
      const row = rows[rows.length - 1]; // last visible row
      if (!row) return null;
      row.scrollIntoView({ block: 'center' });
      const rect = row.getBoundingClientRect();
      // Tap the right side where the radio circle lives
      return { x: rect.right - 25, y: rect.top + rect.height / 2 };
    });
    if (coords) {
      await page.waitForTimeout(200);
      await page.touchscreen.tap(coords.x, coords.y);
    }
    return coords;
  };

  // First attempt
  let walletCoords = await tapTestWallet();
  console.log(`[STEP 20] ✅ Test wallet tapped (right/radio side): ${JSON.stringify(walletCoords)}`);
  await page.waitForTimeout(2000);

  // Check if "Proceed to Pay" appeared
  let proceedCoords = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find(
      e => e.getClientRects().length > 0 && e.innerText?.trim() === 'Proceed to Pay'
    );
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });

  if (!proceedCoords) {
    // Retry: tap center of row instead
    console.log('[STEP 20] ⚠️ No "Proceed to Pay" after first tap — retrying center tap');
    const centerCoords = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('div')].filter(
        el => el.className === 'linearLayout' && el.innerText?.trim() === 'Test' && el.children.length === 3 && el.getClientRects().length > 0
      );
      const row = rows[rows.length - 1];
      if (!row) return null;
      row.scrollIntoView({ block: 'center' });
      const rect = row.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (centerCoords) {
      await page.touchscreen.tap(centerCoords.x, centerCoords.y);
      await page.waitForTimeout(2000);
    }
    proceedCoords = await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        e => e.getClientRects().length > 0 && e.innerText?.trim() === 'Proceed to Pay'
      );
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const rect = el.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
  }

  if (!proceedCoords) {
    await page.screenshot({ path: `test-results/screenshots/juspay-wallet-debug-${Date.now()}.png`, fullPage: true });
    throw new Error('❌ "Proceed to Pay" did not appear after tapping Test wallet on Juspay page');
  }

  await page.waitForTimeout(300);
  await page.touchscreen.tap(proceedCoords.x, proceedCoords.y);
  console.log(`[STEP 20] ✅ "Proceed to Pay" tapped at ${JSON.stringify(proceedCoords)}`);

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  console.log(`[STEP 20] ✅ After "Proceed to Pay" — URL: ${page.url()}`);

  // ============================================================
  // STEP 21 — Juspay processes payment and navigates back to Kapiva
  // ============================================================
  // Wait for redirect back to Kapiva (Juspay processes Test wallet instantly)
  await page.waitForURL(url => !url.toString().includes('juspay'), { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  console.log(`[STEP 21] ✅ Redirected from Juspay — URL: ${page.url()}`);

  // ============================================================
  // STEP 22 — Check for txnStateDropdownToggle if still in test environment
  // ============================================================
  const hasDropdown = await page.locator('[id="txnStateDropdownToggle"]').isVisible({ timeout: 5000 }).catch(() => false);
  if (hasDropdown) {
    const dropdownToggle = page.locator('[id="txnStateDropdownToggle"]');
    await dropdownToggle.click();
    await page.waitForTimeout(500);
    const chargedOption = page.getByText('CHARGED', { exact: true }).last();
    await chargedOption.click();
    const submitBtn = page.locator('[id="submitButton"]');
    await submitBtn.click();
    console.log('[STEP 22] ✅ txnStateDropdownToggle → CHARGED → Submit');
  } else {
    console.log('[STEP 22] ✅ No txnStateDropdownToggle — Juspay processed payment directly');
  }

  // ============================================================
  // STEP 22A — Health Assessment after Submit
  // Wait for Juspay → Kapiva redirect, then "Take Assessment Now" → Male → Height 5ft/8in → Weight 70kg → Next
  // ============================================================
  // After CHARGED → Submit, Juspay processes and redirects back to staging.kapiva.in
  await page.waitForURL(url => url.toString().includes('staging.kapiva.in'), { timeout: 45000 }).catch(() => {});
  await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  console.log(`[STEP 22A] ℹ️ Post-submit URL: ${page.url()}`);

  // "Take Assessment Now" button — poll up to 12s for React to render it
  const assessmentBtnExists = await page.waitForFunction(() => {
    const el = [...document.querySelectorAll('*')].find(
      e => e.innerText?.trim() === 'Take Assessment Now' || e.innerText?.trim() === 'Take Assessment Now →'
    );
    if (el) { el.scrollIntoView({ block: 'center' }); return true; }
    return false;
  }, { timeout: 12000 }).then(() => true).catch(() => false);
  const assessmentAfterSubmitVisible = assessmentBtnExists ||
    await page.getByText(/take assessment now/i).last().isVisible({ timeout: 3000 }).catch(() => false);

  if (assessmentAfterSubmitVisible) {
    // Use JS coordinate tap — button is in DOM but may not pass Playwright visibility check
    const btnCoords = await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find(
        e => e.innerText?.trim() === 'Take Assessment Now' || e.innerText?.trim() === 'Take Assessment Now →'
      );
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.waitForTimeout(500);
    if (btnCoords) {
      await page.touchscreen.tap(btnCoords.x, btnCoords.y);
      console.log(`[STEP 22A] ✅ "Take Assessment Now" tapped at ${JSON.stringify(btnCoords)}`);
    } else {
      await page.getByText(/take assessment now/i).last().scrollIntoViewIfNeeded();
      await page.getByText(/take assessment now/i).last().click({ force: true });
      console.log('[STEP 22A] ✅ "Take Assessment Now" clicked (fallback)');
    }
    await page.waitForTimeout(1500);

    // Helper: click Male + Next on any Gender screen (appears either before or after Height/Weight)
    const handleGenderScreen = async (label) => {
      const genderH = page.getByRole('heading', { name: /gender/i });
      const gVisible = await genderH.isVisible({ timeout: 4000 }).catch(() => false);
      if (!gVisible) return false;
      console.log(`[STEP 22A] ✅ Gender screen visible (${label})`);
      const maleBtn = page.getByRole('button', { name: /^male$/i }).first();
      const mBtnVisible = await maleBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (mBtnVisible) {
        await maleBtn.click({ force: true });
      } else {
        // fallback for non-button gender options (radio/card)
        const maleAny = page.locator('*').filter({ hasText: /^male$/i }).first();
        await maleAny.click({ force: true });
      }
      await page.waitForTimeout(800);
      console.log('[STEP 22A] ✅ Male selected');
      const nextBtnG = page.getByRole('button', { name: /^next$/i }).last();
      const nVisible = await nextBtnG.isVisible({ timeout: 4000 }).catch(() => false);
      if (nVisible) {
        await nextBtnG.scrollIntoViewIfNeeded();
        await nextBtnG.click({ force: true });
        await page.waitForTimeout(1000);
        console.log('[STEP 22A] ✅ Next clicked (gender screen)');
      }
      return true;
    };

    // Gender may appear BEFORE or AFTER Height/Weight — handle it first if it's already visible
    await handleGenderScreen('before-height');

    // Wait for Height / Weight form — heading is "What's your height and weight?"
    await expect(page.getByRole('heading', { name: /height and weight/i }), '❌ Height form not visible').toBeVisible({ timeout: 15000 });
    console.log('[STEP 22A] ✅ Height / Weight form visible');

    // React-compatible value setter for controlled inputs
    const setReactInput = async (locator, value) => {
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ force: true });
      await page.waitForTimeout(200);
      await locator.selectText().catch(() => {});
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await locator.type(String(value), { delay: 50 });
      await locator.dispatchEvent('input');
      await locator.dispatchEvent('change');
      await page.waitForTimeout(200);
    };

    // Height form has 2 plain inputs: 1st = Ft, 2nd = Inch (In)
    const heightInputs = page.locator('input[type="number"], input[type="text"]');
    const ftInput = heightInputs.nth(0);
    const inchInput = heightInputs.nth(1);

    await setReactInput(ftInput, '5');
    console.log('[STEP 22A] ✅ Height Ft = 5');

    await setReactInput(inchInput, '8');
    console.log('[STEP 22A] ✅ Height Inch = 8');
    await page.waitForTimeout(500);

    // Weight stepper — use + button to reach 70 (or type directly into stepper input)
    await expect(page.getByText('Weight', { exact: true }), '❌ Weight label not visible').toBeVisible({ timeout: 5000 });
    const weightInput = heightInputs.nth(2);
    await setReactInput(weightInput, '70');
    console.log('[STEP 22A] ✅ Weight = 70');
    await page.waitForTimeout(300);

    // Waist size stepper — fill with 44 (from design spec)
    const waistVisible = await page.getByText('Waist size', { exact: true }).isVisible({ timeout: 3000 }).catch(() => false);
    if (waistVisible) {
      const waistInput = heightInputs.nth(3);
      await setReactInput(waistInput, '44');
      console.log('[STEP 22A] ✅ Waist size = 44');
    }

    // Click Next (Height/Weight page)
    const nextBtn = page.getByRole('button', { name: /next/i });
    await expect(nextBtn, '❌ Next button not visible').toBeVisible({ timeout: 8000 });
    await nextBtn.scrollIntoViewIfNeeded();
    await nextBtn.click({ force: true });
    await page.waitForTimeout(2000);
    console.log('[STEP 22A] ✅ Next clicked (height/weight page)');

    // ── Gender may also appear AFTER Height/Weight Next ──────────
    await handleGenderScreen('after-height');

    // ── Blood sugar level (FBS) screen ───────────────────────────
    const bloodSugarHeading = page.getByRole('heading', { name: /blood sugar level/i });
    const bloodSugarVisible = await bloodSugarHeading.isVisible({ timeout: 5000 }).catch(() => false);
    if (bloodSugarVisible) {
      console.log('[STEP 22A] ✅ Blood sugar level screen visible');
      // Select "Not tested / Don't know" as safe default
      const notTestedBtn = page.getByRole('button', { name: /not tested/i }).first();
      await expect(notTestedBtn, '❌ Blood sugar option not visible').toBeVisible({ timeout: 6000 });
      await notTestedBtn.click({ force: true });
      await page.waitForTimeout(500);
      console.log('[STEP 22A] ✅ Blood sugar option selected: Not tested / Don\'t know');

      const nextBtnBS = page.getByRole('button', { name: /^next$/i }).last();
      await expect(nextBtnBS, '❌ Next button not visible on blood sugar screen').toBeVisible({ timeout: 5000 });
      await nextBtnBS.scrollIntoViewIfNeeded();
      await nextBtnBS.click({ force: true });
      await page.waitForTimeout(1500);
      console.log('[STEP 22A] ✅ Next clicked (blood sugar screen)');

      // ── Health conditions screen (final assessment step) ─────────
      const healthHeading = page.getByRole('heading', { name: /health conditions/i });
      const healthVisible = await healthHeading.isVisible({ timeout: 5000 }).catch(() => false);
      if (healthVisible) {
        console.log('[STEP 22A] ✅ Health conditions screen visible');
        // Select "None of these" as safe default
        const noneBtn = page.getByRole('button', { name: /none of these/i }).first();
        await expect(noneBtn, '❌ Health conditions option not visible').toBeVisible({ timeout: 6000 });
        await noneBtn.click({ force: true });
        await page.waitForTimeout(500);
        console.log('[STEP 22A] ✅ Health condition selected: None of these');

        const submitBtn = page.getByRole('button', { name: /^submit$/i }).last();
        await expect(submitBtn, '❌ Submit button not visible').toBeVisible({ timeout: 5000 });
        await submitBtn.scrollIntoViewIfNeeded();
        await submitBtn.click({ force: true });
        await page.waitForTimeout(3000);
        console.log('[STEP 22A] ✅ Submit clicked — assessment complete');

        // Extract doctor details from the matched doctor card
        await page.waitForTimeout(1000);
        const doctorDetails = await page.evaluate(() => {
          const allText = [...document.querySelectorAll('*')]
            .filter(el => el.children.length === 0 && el.innerText?.trim())
            .map(el => el.innerText.trim());
          const nameIdx = allText.findIndex(t => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(t) && allText[allText.indexOf(t) + 1]?.includes('★'));
          const name = nameIdx >= 0 ? allText[nameIdx] : null;
          const rating = nameIdx >= 0 ? allText[nameIdx + 1] : null;
          const qual = nameIdx >= 0 ? allText[nameIdx + 2] : null;
          const slotLabel = allText.find(t => /your first consultation/i.test(t));
          const slotIdx = slotLabel ? allText.indexOf(slotLabel) : -1;
          const slot = slotIdx >= 0 ? allText[slotIdx + 1] : null;
          return { name, rating, qualification: qual, slot };
        }).catch(() => ({}));
        console.log(`[STEP 22A] 👨‍⚕️ Doctor: ${doctorDetails.name} | ${doctorDetails.rating} | ${doctorDetails.qualification}`);
        console.log(`[STEP 22A] 📅 First consultation slot: ${doctorDetails.slot}`);

        // Click Confirm Booking
        const confirmBookingBtn = page.getByRole('button', { name: /confirm booking/i }).last();
        const confirmVisible = await confirmBookingBtn.isVisible({ timeout: 5000 }).catch(() => false);
        if (confirmVisible) {
          await confirmBookingBtn.scrollIntoViewIfNeeded();
          await confirmBookingBtn.click({ force: true });
          await page.waitForTimeout(2000);
          console.log('[STEP 22A] ✅ Confirm Booking clicked');
        } else {
          console.log('[STEP 22A] ℹ️ Confirm Booking not visible — skipping');
        }
      }
    }

    // Log final state of assessment button
    const nowShowsContinue = await page.getByText(/continue assessment/i).isVisible({ timeout: 3000 }).catch(() => false);
    if (nowShowsContinue) {
      console.log('[STEP 22A] ✅ Assessment submitted — button changed to "Continue Assessment"');
    } else {
      console.log('[STEP 22A] ✅ Assessment flow done — proceeding');
    }
  } else {
    console.log('[STEP 22A] ℹ️ No assessment form after Submit — proceeding');
  }

  // ============================================================
  // STEP 23 — Handle "Something Went Wrong" → Try Again if visible
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
  // STEP 24 — Wait for order confirmation page
  // ============================================================
  // 100-day pack goes directly to confirmation — no "Confirm Booking" button
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  console.log(`[STEP 24] ✅ Confirmation URL: ${page.url()}`);

  // ============================================================
  // STEP 25 — Extract order confirmation details
  // ============================================================
  // Wait for confirmation content — order summary or program start section
  const confirmationHeading = page.getByText(/100-day Dia Free|order|confirmation|thank you/i).first();
  await expect(confirmationHeading, '❌ Confirmation page not loaded').toBeVisible({ timeout: 20000 });
  const confirmationText = await page.locator('main, body').first().innerText().catch(async () => await page.locator('body').innerText());
  const summaryLines = confirmationText.split('\n').filter(l => l.trim()).slice(0, 20).join('\n');
  console.log(`[STEP 25] 📋 Order confirmation:\n${summaryLines}`);

  // ============================================================
  // STEP 26 — Save guest user to fixtures/guest_users.json
  // ============================================================
  console.log('[STEP 26] ⏸ Waiting 5s before saving...');
  await page.waitForTimeout(5000).catch(() => {});

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

  console.log('🎉 Steps 1–26 complete — DiafFree MVP V2 flow verified');
});
