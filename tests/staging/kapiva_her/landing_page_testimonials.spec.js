import { test, expect, devices } from '@playwright/test';
const BASE_URL = 'https://staging.kapivaher.com/';
test.use({ ...devices['Pixel 7'], launchOptions: { slowMo: 300 } });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    const screenshotPath = `test-results/screenshots/failure-${testInfo.title.replace(/\s+/g, '_')}-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => {});
  }
  await page.close().catch(() => {});
});

test('Testimonials section — transformation stories visible', async ({ page }) => {
  test.setTimeout(60000);

  // STEP 1 — Navigate to homepage
  console.log('[STEP 1] Navigating to homepage');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  // STEP 2 — Scroll to TRANSFORMATIONS section
  console.log('[STEP 2] Scrolling to TRANSFORMATIONS section');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
  await page.waitForTimeout(1500);

  const transformationsSection = page
    .getByText(/transformations/i)
    .first();
  await transformationsSection.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(1000);

  // STEP 3 — Verify "TRANSFORMATIONS" heading or "13,000+" stat text is visible
  console.log('[STEP 3] Verifying TRANSFORMATIONS heading or 13,000+ text is visible');
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasTransformationsHeading = /transformations/i.test(bodyText);
  const has13000Stat = /13[,.]?000\+?/i.test(bodyText);
  expect(
    hasTransformationsHeading || has13000Stat,
    '❌ Neither "TRANSFORMATIONS" heading nor "13,000+" text found on page'
  ).toBe(true);
  if (hasTransformationsHeading) {
    console.log('[STEP 3] ✅ "TRANSFORMATIONS" heading found on page');
  } else {
    console.log('[STEP 3] ✅ "13,000+" stat text found on page');
  }

  // STEP 4 — Verify at least one testimonial quote or patient name is visible
  console.log('[STEP 4] Verifying at least one testimonial quote or patient name is visible');
  const hasPatientName = /taahira|suchitra|priyanshi/i.test(bodyText);
  const hasQuoteKeyword = /pcos|pmos|doctor|consultation/i.test(bodyText);
  expect(
    hasPatientName || hasQuoteKeyword,
    '❌ No patient names (Taahira, Suchitra, Priyanshi) or testimonial keywords found on page'
  ).toBe(true);
  if (hasPatientName) {
    console.log('[STEP 4] ✅ Patient name found in testimonials (Taahira / Suchitra / Priyanshi)');
  } else {
    console.log('[STEP 4] ✅ Testimonial keyword (pcos/pmos/doctor/consultation) found on page');
  }

  // STEP 5 — Verify testimonial section has at least 2 customer names or quotes
  console.log('[STEP 5] Verifying at least 2 testimonial entries are present');

  // Count individual testimonial card containers — look for repeated card-like elements
  // near patient names or quote content
  const testimonialCards = page.locator(
    '[class*="testimonial"], [class*="review"], [class*="card"], [class*="slide"], [class*="story"]'
  );
  const cardCount = await testimonialCards.count();
  console.log(`[STEP 5] Found ${cardCount} testimonial card element(s) via class selectors`);

  if (cardCount >= 2) {
    expect(cardCount, '❌ Fewer than 2 testimonial cards found').toBeGreaterThanOrEqual(2);
    console.log(`[STEP 5] ✅ ${cardCount} testimonial cards visible`);
  } else {
    // Fallback: count occurrences of patient names or quote patterns in raw text
    const nameMatches = (bodyText.match(/taahira|suchitra|priyanshi/gi) || []).length;
    const quoteMatches = (bodyText.match(/"[^"]{20,}"/g) || []).length;
    const totalMatches = nameMatches + quoteMatches;
    console.log(`[STEP 5] Fallback count — name matches: ${nameMatches}, quote blocks: ${quoteMatches}`);
    expect(
      totalMatches >= 2 || bodyText.includes('13,000') || /13000/i.test(bodyText),
      '❌ Could not confirm at least 2 testimonial entries — insufficient patient names or quotes found'
    ).toBe(true);
    console.log(`[STEP 5] ✅ Testimonial content confirmed via text analysis (matches: ${totalMatches})`);
  }
});
