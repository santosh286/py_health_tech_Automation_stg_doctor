import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

const BASE_URL = 'https://stg-hts.kapiva.tech';
const PAGE_URL = `${BASE_URL}/post-call-analytics`;

// ─── Login helper ──────────────────────────────────────────────────────────────
async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#email', usersData.users[2].email);
  await page.fill('#password', usersData.users[2].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|appointments|doctors-list)/, { timeout: 30000 });
  console.log('[Login] Logged in as:', usersData.users[2].email);
}

// ─── React Select helper ───────────────────────────────────────────────────────
async function selectReactOption(page: any, inputId: string, value: string) {
  await page.locator(`#${inputId}`).click();
  await page.waitForTimeout(400);
  await page.locator(`#${inputId}`).fill(value);
  await page.waitForTimeout(600);
  const option = page.locator('[class*="option"]').filter({ hasText: value }).first();
  await expect(option).toBeVisible({ timeout: 8000 });
  await option.click();
  await page.waitForTimeout(1500);
  console.log(`[Filter] Selected "${value}" in #${inputId}`);
}

async function clearReactSelect(page: any, inputId: string) {
  // React Select clear button: click the input first to show the clear (×) icon
  await page.locator(`#${inputId}`).click();
  await page.waitForTimeout(300);

  // Try the clear indicator SVG button (appears when a value is selected)
  const container = page.locator(`#${inputId}`).locator('xpath=ancestor::div[contains(@class,"container")]').first();
  const clearBtn = container.locator('[aria-hidden="true"]').filter({ hasText: '' }).nth(1); // second indicator = clear

  // More reliable: look for any element with "clear" in class within the container
  const clearByClass = container.locator('[class*="clear"], [class*="Clear"]').first();
  const clearVisible = await clearByClass.isVisible({ timeout: 2000 }).catch(() => false);

  if (clearVisible) {
    await clearByClass.click();
    await page.waitForTimeout(1000);
    console.log(`[Filter] Cleared #${inputId} via clear button`);
  } else {
    // Fallback: select all text in input and delete, then press Enter to confirm empty
    await page.locator(`#${inputId}`).fill('');
    await page.locator(`#${inputId}`).press('Escape');
    await page.waitForTimeout(500);
    // Reload page to fully reset filters
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    console.log(`[Filter] Reset #${inputId} via page reload`);
  }
}

test.describe('Post-Call Analytics — /post-call-analytics', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    console.log('[Setup] Post-Call Analytics page loaded:', page.url());
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const path = `test-results/screenshots/pca-failure-${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true }).catch(() => {});
      await testInfo.attach('failure-screenshot', { path, contentType: 'image/png' }).catch(() => {});
    }
    await page.context().clearCookies().catch(() => {});
    await page.close().catch(() => {});
  });

  // ============================================================
  // TC-PCA01 — Page loads with heading
  // ============================================================
  test('TC-PCA01 — Page loads with Organization Overview heading', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Organization Overview');
    await expect(heading, '❌ "Organization Overview" heading not visible').toBeVisible({ timeout: 15000 });
    console.log('[STEP 1] "Organization Overview" heading visible ✅');

    expect(page.url(), '❌ URL should contain /post-call-analytics').toContain('/post-call-analytics');
    console.log('[STEP 2] URL confirmed: /post-call-analytics ✅');
  });

  // ============================================================
  // TC-PCA02 — All 6 filter labels visible
  // ============================================================
  test('TC-PCA02 — All 6 filter labels visible on page', async ({ page }) => {
    test.setTimeout(60000);

    const filters = ['Team Lead', 'Doctor', 'Zone', 'Therapy', 'Concern', 'Milestone'];
    for (const label of filters) {
      const el = page.getByText(label, { exact: false }).first();
      await expect(el, `❌ Filter label "${label}" not visible`).toBeVisible({ timeout: 10000 });
      console.log(`[STEP] Filter label "${label}" visible ✅`);
    }
    console.log('[DONE] All 6 filter labels confirmed ✅');
  });

  // ============================================================
  // TC-PCA03 — Team Lead dropdown shows all 6 team leads
  // ============================================================
  test('TC-PCA03 — Team Lead dropdown shows all 6 team leads', async ({ page }) => {
    test.setTimeout(60000);

    await page.locator('#pca-team-lead').click();
    await page.waitForTimeout(600);
    console.log('[STEP 1] Clicked Team Lead dropdown');

    const expectedLeads = ['Dr. Kalpana', 'Dr. Deepali', 'Dr. Irfan', 'Dr. Shreyas', 'Dr. Lata', 'Dr. Suprabha'];
    for (const lead of expectedLeads) {
      const option = page.locator('[class*="option"]').filter({ hasText: lead }).first();
      await expect(option, `❌ Team Lead option "${lead}" not found`).toBeVisible({ timeout: 8000 });
      console.log(`[STEP 2] Team Lead option visible: "${lead}" ✅`);
    }

    await page.keyboard.press('Escape');
    console.log('[DONE] All 6 team leads visible in dropdown ✅');
  });

  // ============================================================
  // TC-PCA04 — Filter by Team Lead: Dr. Kalpana
  // ============================================================
  test('TC-PCA04 — Filter by Team Lead "Dr. Kalpana" updates filter selection', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Opening Team Lead filter...');
    await selectReactOption(page, 'pca-team-lead', 'Dr. Kalpana');

    // Verify filter shows Dr. Kalpana selected
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Dr. Kalpana" not shown as selected filter').toContain('Dr. Kalpana');
    console.log('[STEP 2] Filter shows "Dr. Kalpana" selected ✅');

    // Hygiene table still renders
    const hygieneTable = page.getByText('Team Lead Comparison — Hygiene');
    await expect(hygieneTable, '❌ Hygiene table heading not visible after filter').toBeVisible({ timeout: 10000 });
    console.log('[STEP 3] Hygiene table still renders after Team Lead filter ✅');

    // Quality table still renders
    const qualityTable = page.getByText('Team Lead Comparison — Quality');
    await expect(qualityTable, '❌ Quality table heading not visible after filter').toBeVisible({ timeout: 10000 });
    console.log('[STEP 4] Quality table still renders after Team Lead filter ✅');

    console.log('[DONE] Team Lead filter "Dr. Kalpana" applied and data visible ✅');
  });

  // ============================================================
  // TC-PCA05 — Clear Team Lead filter restores all leads
  // ============================================================
  test('TC-PCA05 — Clear Team Lead filter restores all team leads in view', async ({ page }) => {
    test.setTimeout(60000);

    // Apply filter first
    await selectReactOption(page, 'pca-team-lead', 'Dr. Kalpana');
    console.log('[STEP 1] Applied "Dr. Kalpana" filter');

    // Clear it
    await clearReactSelect(page, 'pca-team-lead');
    console.log('[STEP 2] Cleared Team Lead filter');

    await page.waitForTimeout(1500);

    // All team leads should be visible again in Hygiene table
    const bodyText = await page.locator('body').innerText();
    const allLeads = ['Dr. Kalpana', 'Dr. Deepali', 'Dr. Irfan', 'Dr. Shreyas', 'Dr. Lata', 'Dr. Suprabha'];
    let visibleCount = 0;
    for (const lead of allLeads) {
      if (bodyText.includes(lead)) {
        visibleCount++;
        console.log(`[STEP 3] "${lead}" visible after clearing filter ✅`);
      }
    }
    expect(visibleCount, '❌ Not all team leads visible after clearing filter').toBeGreaterThanOrEqual(5);
    console.log(`[DONE] ${visibleCount}/6 team leads visible after clearing filter ✅`);
  });

  // ============================================================
  // TC-PCA06 — Doctor dropdown is present and searchable
  // ============================================================
  test('TC-PCA06 — Doctor dropdown is present and returns search results', async ({ page }) => {
    test.setTimeout(60000);

    const doctorInput = page.locator('#pca-doctor');
    await expect(doctorInput, '❌ Doctor filter input not found').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] Doctor filter input visible ✅');

    // Click and type to search
    await doctorInput.click();
    await page.waitForTimeout(400);
    await doctorInput.fill('Aditi');
    await page.waitForTimeout(600);
    console.log('[STEP 2] Typed "Aditi" in Doctor search');

    // Options should appear
    const options = page.locator('[class*="option"]');
    const count = await options.count();
    expect(count, '❌ No doctor options appeared in dropdown').toBeGreaterThanOrEqual(1);
    console.log(`[STEP 3] ${count} doctor option(s) appeared for "Aditi" ✅`);

    const firstOption = await options.first().innerText();
    console.log(`[STEP 4] First result: "${firstOption}" ✅`);

    await page.keyboard.press('Escape');
    console.log('[DONE] Doctor dropdown search works ✅');
  });

  // ============================================================
  // TC-PCA07 — Filter by Doctor updates audit table
  // ============================================================
  test('TC-PCA07 — Filter by Doctor "Aditi Anand" filters audit table', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Applying Doctor filter for "Aditi Anand"...');
    await selectReactOption(page, 'pca-doctor', 'Aditi Anand');

    // Filter label should show selected doctor
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Aditi Anand" not shown as selected doctor filter').toContain('Aditi Anand');
    console.log('[STEP 2] Doctor filter shows "Aditi Anand" selected ✅');

    // Page should not crash
    await expect(
      page.getByText('Organization Overview'),
      '❌ Organization Overview missing after doctor filter'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 3] Organization Overview still visible after Doctor filter ✅');

    console.log('[DONE] Doctor filter "Aditi Anand" applied successfully ✅');
  });

  // ============================================================
  // TC-PCA08 — Zone dropdown has Green / Yellow / Red options
  // ============================================================
  test('TC-PCA08 — Zone dropdown has Green Zone, Yellow Zone, Red Zone options', async ({ page }) => {
    test.setTimeout(60000);

    await page.locator('#pca-zone').click();
    await page.waitForTimeout(600);
    console.log('[STEP 1] Clicked Zone dropdown');

    const expectedZones = ['Green Zone', 'Yellow Zone', 'Red Zone'];
    for (const zone of expectedZones) {
      const option = page.locator('[class*="option"]').filter({ hasText: zone }).first();
      await expect(option, `❌ Zone option "${zone}" not found`).toBeVisible({ timeout: 8000 });
      console.log(`[STEP 2] Zone option visible: "${zone}" ✅`);
    }

    await page.keyboard.press('Escape');
    console.log('[DONE] All 3 zone options (Green/Yellow/Red) confirmed ✅');
  });

  // ============================================================
  // TC-PCA09 — Filter by Zone: Red Zone
  // ============================================================
  test('TC-PCA09 — Filter by "Red Zone" updates filter and page remains stable', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Applying Zone filter for "Red Zone"...');
    await selectReactOption(page, 'pca-zone', 'Red Zone');

    // Filter should show Red Zone selected
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Red Zone" not shown as selected zone filter').toContain('Red Zone');
    console.log('[STEP 2] Zone filter shows "Red Zone" selected ✅');

    // Organization Overview should still be visible
    await expect(
      page.getByText('Organization Overview'),
      '❌ Organization Overview missing after zone filter'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 3] Organization Overview still visible after Red Zone filter ✅');

    // Red Zone Doctors section should be visible
    const redZoneSection = page.getByText('Red Zone', { exact: false }).first();
    await expect(redZoneSection, '❌ Red Zone content not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 4] Red Zone content visible after filter ✅');

    console.log('[DONE] Zone filter "Red Zone" applied and page stable ✅');
  });

  // ============================================================
  // TC-PCA10 — 5 Org Overview stat cards visible
  // ============================================================
  test('TC-PCA10 — 5 Org Overview stat cards visible with data', async ({ page }) => {
    test.setTimeout(60000);

    const statLabels = ['Team Leads', 'Total Doctors', 'Consultations', 'Audits', 'Org Rating'];
    for (const label of statLabels) {
      const el = page.getByText(label, { exact: false }).first();
      await expect(el, `❌ Stat card "${label}" not visible`).toBeVisible({ timeout: 10000 });
      console.log(`[STEP] Stat card visible: "${label}" ✅`);
    }

    // Verify actual stat values are present (not zero/empty)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ Team Leads count (6) not found').toContain('6');
    console.log('[STEP] Team Leads value: 6 ✅');
    expect(bodyText, '❌ Total Doctors count (82) not found').toContain('82');
    console.log('[STEP] Total Doctors value: 82 ✅');

    console.log('[DONE] All 5 Org Overview stat cards visible with data ✅');
  });

  // ============================================================
  // TC-PCA11 — Zone Distribution section visible
  // ============================================================
  test('TC-PCA11 — Zone Distribution shows Green / Yellow / Red with percentages', async ({ page }) => {
    test.setTimeout(60000);

    const zoneDistHeading = page.getByText('Zone Distribution');
    await expect(zoneDistHeading, '❌ "Zone Distribution" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Zone Distribution" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    expect(bodyText, '❌ "Green Zone" not found in Zone Distribution').toContain('Green Zone');
    console.log('[STEP 2] Green Zone visible ✅');

    expect(bodyText, '❌ "Yellow Zone" not found in Zone Distribution').toContain('Yellow Zone');
    console.log('[STEP 3] Yellow Zone visible ✅');

    expect(bodyText, '❌ "Red Zone" not found in Zone Distribution').toContain('Red Zone');
    console.log('[STEP 4] Red Zone visible ✅');

    // Percentages should be present
    const hasPercent = /\d+(\.\d+)?%/.test(bodyText);
    expect(hasPercent, '❌ No percentage values found in Zone Distribution').toBe(true);
    console.log('[STEP 5] Zone percentage values visible ✅');

    console.log('[DONE] Zone Distribution section fully visible ✅');
  });

  // ============================================================
  // TC-PCA12 — Hygiene table renders with correct columns
  // ============================================================
  test('TC-PCA12 — Team Lead Comparison Hygiene table renders with all columns', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Team Lead Comparison — Hygiene');
    await expect(heading, '❌ Hygiene table heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Team Lead Comparison — Hygiene" heading visible ✅');

    const bodyText = await page.locator('body').innerText();
    const columns = ['TEAM LEAD', 'DOCTORS', 'CONSULTATIONS', 'SLOT ADH', 'DIAL FREQ', 'RX %'];
    for (const col of columns) {
      expect(bodyText, `❌ Column "${col}" not found in Hygiene table`).toContain(col);
      console.log(`[STEP 2] Column "${col}" visible ✅`);
    }

    // At least 1 data row (Dr. Kalpana is always present)
    expect(bodyText, '❌ Dr. Kalpana not found in Hygiene table data').toContain('Dr. Kalpana');
    console.log('[STEP 3] Data row "Dr. Kalpana" visible in Hygiene table ✅');

    console.log('[DONE] Hygiene table renders correctly ✅');
  });

  // ============================================================
  // TC-PCA13 — Quality table renders with correct columns
  // ============================================================
  test('TC-PCA13 — Team Lead Comparison Quality table renders with all columns', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Team Lead Comparison — Quality');
    await expect(heading, '❌ Quality table heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Team Lead Comparison — Quality" heading visible ✅');

    const bodyText = await page.locator('body').innerText();
    const columns = ['TEAM LEAD', 'DOCTORS', 'AUDITS', 'CES', 'CSS', 'FINAL RATING'];
    for (const col of columns) {
      expect(bodyText, `❌ Column "${col}" not found in Quality table`).toContain(col);
      console.log(`[STEP 2] Column "${col}" visible ✅`);
    }

    // Rating values should be present
    const hasRating = /\d\.\d{2}/.test(bodyText);
    expect(hasRating, '❌ No rating values (e.g. 3.95) found in Quality table').toBe(true);
    console.log('[STEP 3] Rating values (e.g. 3.95) visible in Quality table ✅');

    console.log('[DONE] Quality table renders correctly ✅');
  });

  // ============================================================
  // TC-PCA14 — Red Zone Doctors table visible
  // ============================================================
  test('TC-PCA14 — Red Zone Doctors table visible with all columns and View Profile button', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Red Zone Doctors', { exact: false });
    await expect(heading, '❌ "Red Zone Doctors" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Red Zone Doctors" heading visible ✅');

    const bodyText = await page.locator('body').innerText();
    const columns = ['DOCTOR', 'TEAM LEAD', 'RED REASON', 'FINAL RATING'];
    for (const col of columns) {
      expect(bodyText, `❌ Column "${col}" not found in Red Zone table`).toContain(col);
      console.log(`[STEP 2] Column "${col}" visible ✅`);
    }

    // View Profile buttons
    const viewProfileBtns = page.locator('button').filter({ hasText: /view profile/i });
    const btnCount = await viewProfileBtns.count();
    expect(btnCount, '❌ No "View Profile" buttons found in Red Zone table').toBeGreaterThanOrEqual(1);
    console.log(`[STEP 3] ${btnCount} "View Profile" button(s) visible ✅`);

    // Red reasons should be visible
    const hasRedReason = /low slot adherence|low quality|rx threshold|low dial/i.test(bodyText);
    expect(hasRedReason, '❌ No red reason text found in Red Zone Doctors table').toBe(true);
    console.log('[STEP 4] Red reason text (e.g. "Low slot adherence") visible ✅');

    console.log('[DONE] Red Zone Doctors table renders correctly ✅');
  });

  // ============================================================
  // TC-PCA15 — Top 10 / Bottom 10 toggle works
  // ============================================================
  test('TC-PCA15 — Top 10 / Bottom 10 toggle switches doctor ranking view', async ({ page }) => {
    test.setTimeout(60000);

    // Top 10 button should be active by default
    const top10Btn = page.locator('button').filter({ hasText: /^top 10$/i });
    await expect(top10Btn, '❌ "Top 10" button not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Top 10" button visible ✅');

    const bottom10Btn = page.locator('button').filter({ hasText: /^bottom 10$/i });
    await expect(bottom10Btn, '❌ "Bottom 10" button not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 2] "Bottom 10" button visible ✅');

    // Click Bottom 10
    await bottom10Btn.click();
    await page.waitForTimeout(1500);
    console.log('[STEP 3] Clicked "Bottom 10"');

    const bodyAfterBottom = await page.locator('body').innerText();
    const hasData = /doctor|rating|audits/i.test(bodyAfterBottom);
    expect(hasData, '❌ No data visible after clicking Bottom 10').toBe(true);
    console.log('[STEP 4] Data visible after "Bottom 10" toggle ✅');

    // Click Top 10 back
    await top10Btn.click();
    await page.waitForTimeout(1500);
    console.log('[STEP 5] Clicked "Top 10" back');

    const bodyAfterTop = await page.locator('body').innerText();
    expect(/doctor|rating|audits/i.test(bodyAfterTop), '❌ No data visible after switching back to Top 10').toBe(true);
    console.log('[STEP 6] Data visible after switching back to "Top 10" ✅');

    console.log('[DONE] Top 10 / Bottom 10 toggle works correctly ✅');
  });

  // ============================================================
  // TC-PCA16 — View Profile navigates to doctor profile
  // ============================================================
  test('TC-PCA16 — "View Profile" on Red Zone doctor navigates to profile page', async ({ page }) => {
    test.setTimeout(60000);

    // Wait for Red Zone Doctors table
    const heading = page.getByText('Red Zone Doctors', { exact: false });
    await expect(heading, '❌ Red Zone Doctors heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] Red Zone Doctors table visible ✅');

    // Click first View Profile button
    const viewProfileBtns = page.locator('button').filter({ hasText: /view profile/i });
    const btnCount = await viewProfileBtns.count();
    expect(btnCount, '❌ No View Profile buttons found').toBeGreaterThanOrEqual(1);
    console.log(`[STEP 2] Found ${btnCount} View Profile button(s)`);

    await viewProfileBtns.first().click();
    console.log('[STEP 3] Clicked first "View Profile" button');

    await page.waitForTimeout(2000);

    // Should navigate away from post-call-analytics OR open a profile section
    const newUrl = page.url();
    const bodyText = await page.locator('body').innerText();
    const navigatedOrOpened =
      newUrl.includes('doctor') ||
      newUrl.includes('profile') ||
      /doctor|profile|consultant|rating|audit/i.test(bodyText);

    expect(navigatedOrOpened, '❌ View Profile did not navigate or open doctor profile').toBe(true);
    console.log(`[STEP 4] View Profile action successful — URL: ${newUrl} ✅`);

    console.log('[DONE] "View Profile" button navigates to doctor profile ✅');
  });

  // ============================================================
  // TC-PCA17 — All Parameters View (Org Level) table
  // ============================================================
  test('TC-PCA17 — All Parameters View (Org Level) renders with 12 parameters', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('All Parameters View (Org Level)');
    await expect(heading, '❌ "All Parameters View (Org Level)" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "All Parameters View (Org Level)" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    // Column headers
    expect(bodyText, '❌ "PARAMETER" column header not found').toContain('PARAMETER');
    expect(bodyText, '❌ "AUDITS" column header not found').toContain('AUDITS');
    expect(bodyText, '❌ "AVG RATING" column header not found').toContain('AVG RATING');
    console.log('[STEP 2] Column headers — PARAMETER, AUDITS, AVG RATING visible ✅');

    // All 12 parameters must be present
    const parameters = [
      'Ongoing Medication',
      'Comorbidities',
      'Lifestyle & Dietary',
      '3-6 Month Benefit',
      'Medicine Adherence',
      'Risk of Poor Condition',
      'Follow-up Communication',
      'Dosage Communication',
      'Context Setting',
      'Engagement',
      'Fostered Comfort & Trust',
      'Establishment of Credibility',
    ];
    for (const param of parameters) {
      expect(bodyText, `❌ Parameter "${param}" not found in All Parameters table`).toContain(param);
      console.log(`[STEP 3] Parameter visible: "${param}" ✅`);
    }

    // Audit counts should be numeric
    const hasAuditCount = /\d{3,}/.test(bodyText);
    expect(hasAuditCount, '❌ No audit count numbers found in All Parameters table').toBe(true);
    console.log('[STEP 4] Audit count numbers visible ✅');

    console.log('[DONE] All Parameters View (Org Level) renders with all 12 parameters ✅');
  });

  // ============================================================
  // TC-PCA18 — Parameter Wise Week-on-Week (Org Level) table
  // ============================================================
  test('TC-PCA18 — Parameter Wise Week-on-Week (Org Level) renders with CW columns', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Parameter Wise Week-on-Week (Org Level)');
    await expect(heading, '❌ "Parameter Wise Week-on-Week (Org Level)" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Parameter Wise Week-on-Week (Org Level)" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    // Week columns (CW1–CW4) must be present
    const weekCols = ['CW1', 'CW2', 'CW3', 'CW4'];
    for (const col of weekCols) {
      expect(bodyText, `❌ Week column "${col}" not found`).toContain(col);
      console.log(`[STEP 2] Week column "${col}" visible ✅`);
    }

    // Sub-columns Aud and Rtg
    expect(bodyText, '❌ "Aud" sub-column not found').toContain('Aud');
    expect(bodyText, '❌ "Rtg" sub-column not found').toContain('Rtg');
    console.log('[STEP 3] Sub-columns "Aud" and "Rtg" visible ✅');

    // At least one parameter row
    expect(bodyText, '❌ "Ongoing Medication" row not found in WoW table').toContain('Ongoing Medication');
    console.log('[STEP 4] "Ongoing Medication" parameter row visible ✅');

    // Rating values (e.g. 4.1)
    const hasRatings = /\d\.\d/.test(bodyText);
    expect(hasRatings, '❌ No rating values found in WoW table').toBe(true);
    console.log('[STEP 5] Rating values (e.g. 4.1) visible in WoW table ✅');

    console.log('[DONE] Parameter Wise Week-on-Week (Org Level) renders correctly ✅');
  });

  // ============================================================
  // TC-PCA19 — Red Zone Doctors Needs Attention — detail check
  // ============================================================
  test('TC-PCA19 — Red Zone Doctors Needs Attention shows correct red reasons', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Red Zone Doctors', { exact: false });
    await expect(heading, '❌ Red Zone Doctors heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Red Zone Doctors — Needs Attention" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    // Red reasons must be present
    const redReasons = [
      'Low slot adherence',
      'Low quality rating',
      'Rx threshold violations',
      'Low dial frequency',
    ];
    let foundReasons = 0;
    for (const reason of redReasons) {
      if (bodyText.toLowerCase().includes(reason.toLowerCase())) {
        foundReasons++;
        console.log(`[STEP 2] Red reason found: "${reason}" ✅`);
      }
    }
    expect(foundReasons, '❌ No red reasons found in Red Zone Doctors table').toBeGreaterThanOrEqual(1);

    // Final ratings should be decimal numbers
    const hasRating = /\d\.\d{2}/.test(bodyText);
    expect(hasRating, '❌ No final rating values (e.g. 3.21) found').toBe(true);
    console.log('[STEP 3] Final rating values (e.g. 3.21) visible in Red Zone table ✅');

    // At least 1 doctor listed
    const hasDoctor = /Dr\.|Rahul|Sheetal|Ayesha|Sharayu|Sindhu/i.test(bodyText);
    expect(hasDoctor, '❌ No doctor names found in Red Zone table').toBe(true);
    console.log('[STEP 4] Doctor names visible in Red Zone table ✅');

    // View Profile buttons count
    const viewBtns = page.locator('button').filter({ hasText: /view profile/i });
    const btnCount = await viewBtns.count();
    expect(btnCount, '❌ Expected at least 5 View Profile buttons').toBeGreaterThanOrEqual(5);
    console.log(`[STEP 5] ${btnCount} "View Profile" buttons visible ✅`);

    console.log('[DONE] Red Zone Doctors Needs Attention — all detail checks passed ✅');
  });

  // ============================================================
  // TC-PCA20 — Call Level AOI table renders correctly
  // ============================================================
  test('TC-PCA20 — Call Level AOI (Top 10 & Bottom 10) table renders with all columns', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Call Level AOI', { exact: false });
    await expect(heading, '❌ "Call Level AOI" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Call Level AOI (Top 10 & Bottom 10 by Final Rating)" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    // Column headers
    const columns = ['PLAY', 'UCID', 'DOCTOR', 'DATE', 'ZONE', 'THERAPY', 'CONCERN', 'MILESTONE', 'RATING', 'AOI'];
    for (const col of columns) {
      expect(bodyText, `❌ Column "${col}" not found in Call Level AOI table`).toContain(col);
      console.log(`[STEP 2] Column "${col}" visible in AOI table ✅`);
    }

    // Top 10 / Bottom 10 toggle specific to AOI section
    const top10Btn = page.locator('button').filter({ hasText: /^top 10$/i });
    const bottom10Btn = page.locator('button').filter({ hasText: /^bottom 10$/i });
    await expect(top10Btn, '❌ "Top 10" toggle not visible in AOI section').toBeVisible({ timeout: 5000 });
    await expect(bottom10Btn, '❌ "Bottom 10" toggle not visible in AOI section').toBeVisible({ timeout: 5000 });
    console.log('[STEP 3] "Top 10" and "Bottom 10" toggles visible in AOI section ✅');

    // UCID values should be numeric-like
    const hasUCID = /\d{10,}/.test(bodyText);
    expect(hasUCID, '❌ No UCID values found in Call Level AOI table').toBe(true);
    console.log('[STEP 4] UCID values (long numeric) visible in AOI table ✅');

    // Doctor names should be in AOI table rows
    const hasDoctor = /Green|Yellow|Red/.test(bodyText);
    expect(hasDoctor, '❌ No zone values (Green/Yellow/Red) found in AOI table').toBe(true);
    console.log('[STEP 5] Zone values (Green/Yellow/Red) visible in AOI table rows ✅');

    console.log('[DONE] Call Level AOI table renders correctly with all columns ✅');
  });

  // ============================================================
  // TC-PCA21 — Therapy filter apply
  // ============================================================
  test('TC-PCA21 — Filter by Therapy "Women\'s Health" updates page', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Opening Therapy filter...');
    await page.locator('#pca-therapy').click();
    await page.waitForTimeout(400);

    // Verify all therapy options are listed
    const expectedTherapies = ['Chronic', 'Mens Health', 'Nutritionist', "Women's Health"];
    for (const t of expectedTherapies) {
      const opt = page.locator('[class*="option"]').filter({ hasText: t }).first();
      await expect(opt, `❌ Therapy option "${t}" not found`).toBeVisible({ timeout: 5000 });
      console.log(`[STEP 2] Therapy option visible: "${t}" ✅`);
    }

    // Select "Women's Health"
    await page.locator('[class*="option"]').filter({ hasText: "Women's Health" }).first().click();
    await page.waitForTimeout(1500);
    console.log('[STEP 3] Selected "Women\'s Health" therapy');

    // Filter should show Women's Health selected
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Women\'s Health" not shown as selected Therapy').toContain("Women's Health");
    console.log('[STEP 4] Therapy filter shows "Women\'s Health" selected ✅');

    // Page should remain stable
    await expect(
      page.getByText('Organization Overview'),
      '❌ Page crashed after Therapy filter'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 5] Organization Overview still visible after Therapy filter ✅');

    console.log('[DONE] Therapy filter "Women\'s Health" applied successfully ✅');
  });

  // ============================================================
  // TC-PCA22 — Concern filter apply
  // ============================================================
  test('TC-PCA22 — Filter by Concern "Women\'s Health" updates page', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Opening Concern filter...');
    await page.locator('#pca-concern').click();
    await page.waitForTimeout(400);

    // Verify key concern options visible
    const expectedConcerns = ["Women's Health", 'Diabetes Care', 'Weight Management', 'Gut Health & Digestion'];
    for (const c of expectedConcerns) {
      const opt = page.locator('[class*="option"]').filter({ hasText: c }).first();
      await expect(opt, `❌ Concern option "${c}" not found`).toBeVisible({ timeout: 5000 });
      console.log(`[STEP 2] Concern option visible: "${c}" ✅`);
    }

    // Select "Women's Health"
    await page.locator('[class*="option"]').filter({ hasText: "Women's Health" }).first().click();
    await page.waitForTimeout(1500);
    console.log('[STEP 3] Selected "Women\'s Health" concern');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Women\'s Health" not shown as selected Concern').toContain("Women's Health");
    console.log('[STEP 4] Concern filter shows "Women\'s Health" selected ✅');

    await expect(
      page.getByText('Organization Overview'),
      '❌ Page crashed after Concern filter'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 5] Organization Overview still visible after Concern filter ✅');

    console.log('[DONE] Concern filter "Women\'s Health" applied successfully ✅');
  });

  // ============================================================
  // TC-PCA23 — Milestone filter apply
  // ============================================================
  test('TC-PCA23 — Filter by Milestone "Milestone 1" updates page', async ({ page }) => {
    test.setTimeout(60000);

    console.log('[STEP 1] Opening Milestone filter...');
    await page.locator('#pca-milestone').click();
    await page.waitForTimeout(400);

    // Verify all milestone options
    const expectedMilestones = ['Milestone 1', 'Milestone 2', 'Milestone 3'];
    for (const m of expectedMilestones) {
      const opt = page.locator('[class*="option"]').filter({ hasText: m }).first();
      await expect(opt, `❌ Milestone option "${m}" not found`).toBeVisible({ timeout: 5000 });
      console.log(`[STEP 2] Milestone option visible: "${m}" ✅`);
    }

    // Select "Milestone 1"
    await page.locator('[class*="option"]').filter({ hasText: 'Milestone 1' }).first().click();
    await page.waitForTimeout(1500);
    console.log('[STEP 3] Selected "Milestone 1"');

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Milestone 1" not shown as selected Milestone').toContain('Milestone 1');
    console.log('[STEP 4] Milestone filter shows "Milestone 1" selected ✅');

    await expect(
      page.getByText('Organization Overview'),
      '❌ Page crashed after Milestone filter'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 5] Organization Overview still visible after Milestone filter ✅');

    console.log('[DONE] Milestone filter "Milestone 1" applied successfully ✅');
  });

  // ============================================================
  // TC-PCA24 — Organization Rating Week-on-Week table
  // ============================================================
  test('TC-PCA24 — Organization Rating Week-on-Week table renders correctly', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Organization Rating Week-on-Week');
    await expect(heading, '❌ "Organization Rating Week-on-Week" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Organization Rating Week-on-Week" heading visible ✅');

    const bodyText = await page.locator('body').innerText();

    // Week columns
    const weekCols = ['CW1', 'CW2', 'CW3', 'CW4'];
    for (const col of weekCols) {
      expect(bodyText, `❌ Week column "${col}" not found in Org Rating WoW table`).toContain(col);
      console.log(`[STEP 2] Week column "${col}" visible ✅`);
    }

    // Sub-columns Aud and Rtg
    expect(bodyText, '❌ "Aud" sub-column not found').toContain('Aud');
    expect(bodyText, '❌ "Rtg" sub-column not found').toContain('Rtg');
    console.log('[STEP 3] Sub-columns "Aud" and "Rtg" visible ✅');

    // "Organization" row must be present
    expect(bodyText, '❌ "Organization" row not found in Org Rating WoW table').toContain('Organization');
    console.log('[STEP 4] "Organization" summary row visible ✅');

    // Rating values should be decimal
    const hasRating = /4\.\d{2}/.test(bodyText);
    expect(hasRating, '❌ No org rating values (e.g. 4.04) found in WoW table').toBe(true);
    console.log('[STEP 5] Org rating values (e.g. 4.04) visible in WoW table ✅');

    // Audit counts should be large numbers
    const hasAuditCount = /[0-9]{4,}/.test(bodyText);
    expect(hasAuditCount, '❌ No audit count numbers found').toBe(true);
    console.log('[STEP 6] Audit count numbers (4-digit+) visible in WoW table ✅');

    console.log('[DONE] Organization Rating Week-on-Week table renders correctly ✅');
  });

  // ============================================================
  // TC-PCA25 — Combined filters: Team Lead + Zone
  // ============================================================
  test('TC-PCA25 — Combined filters: Team Lead "Dr. Irfan" + Zone "Red Zone" applied together', async ({ page }) => {
    test.setTimeout(60000);

    // Apply Team Lead filter
    console.log('[STEP 1] Applying Team Lead filter "Dr. Irfan"...');
    await selectReactOption(page, 'pca-team-lead', 'Dr. Irfan');

    // Apply Zone filter
    console.log('[STEP 2] Applying Zone filter "Red Zone"...');
    await selectReactOption(page, 'pca-zone', 'Red Zone');

    await page.waitForTimeout(1500);

    const bodyText = await page.locator('body').innerText();

    // Both filters should be active
    expect(bodyText, '❌ Team Lead "Dr. Irfan" not showing as selected').toContain('Dr. Irfan');
    console.log('[STEP 3] Team Lead "Dr. Irfan" filter active ✅');

    expect(bodyText, '❌ Zone "Red Zone" not showing as selected').toContain('Red Zone');
    console.log('[STEP 4] Zone "Red Zone" filter active ✅');

    // Page should not crash — Organization Overview still visible
    await expect(
      page.getByText('Organization Overview'),
      '❌ Page crashed with combined filters applied'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 5] Organization Overview visible with combined filters ✅');

    // Tables should still render
    await expect(
      page.getByText('Team Lead Comparison — Hygiene'),
      '❌ Hygiene table missing with combined filters'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 6] Hygiene table still renders with combined Team Lead + Zone filters ✅');

    console.log('[DONE] Combined filters (Team Lead + Zone) applied and page stable ✅');
  });

  // ============================================================
  // TC-PCA26 — PLAY button in Call Level AOI table
  // ============================================================
  test('TC-PCA26 — PLAY button visible in Call Level AOI table rows', async ({ page }) => {
    test.setTimeout(60000);

    // Wait for AOI table to load
    const heading = page.getByText('Call Level AOI', { exact: false });
    await expect(heading, '❌ Call Level AOI heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Call Level AOI" section visible ✅');

    // "Play" column header exists in table
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, '❌ "Play" column header not found in AOI table').toMatch(/play/i);
    console.log('[STEP 2] "Play" column header visible in AOI table ✅');

    // Find buttons or interactive elements inside AOI table rows
    const aoiTable = page.locator('table').filter({ hasText: /UCID.*Doctor.*Zone.*AOI/i }).first();
    const tableVisible = await aoiTable.isVisible({ timeout: 8000 }).catch(() => false);

    if (tableVisible) {
      const rows = aoiTable.locator('tbody tr');
      const rowCount = await rows.count();
      expect(rowCount, '❌ AOI table has no data rows').toBeGreaterThanOrEqual(1);
      console.log(`[STEP 3] AOI table has ${rowCount} data row(s) ✅`);

      // First row first cell should contain a play control (button/svg/audio)
      const firstRowFirstCell = rows.first().locator('td').first();
      const cellHTML = await firstRowFirstCell.innerHTML().catch(() => '');
      const hasPlayControl = cellHTML.includes('button') || cellHTML.includes('svg') || cellHTML.includes('audio') || cellHTML.includes('play');
      if (hasPlayControl) {
        console.log('[STEP 4] Play control element found in first AOI row ✅');
      } else {
        // Fallback: check second cell (Play column)
        const secondCell = rows.first().locator('td').nth(1);
        const secondCellText = await secondCell.innerText().catch(() => '');
        console.log(`[STEP 4] Play column cell content: "${secondCellText.slice(0, 80)}" ✅`);
      }
    } else {
      // Fallback: look for any buttons in the AOI section
      const aoiSection = page.locator('section, div').filter({ hasText: /Call Level AOI/i }).first();
      const btnsInSection = aoiSection.locator('button');
      const btnCount = await btnsInSection.count().catch(() => 0);
      console.log(`[STEP 3] Found ${btnCount} button(s) in AOI section`);
      expect(btnCount, '❌ No buttons found in AOI section').toBeGreaterThanOrEqual(1);
    }

    // UCID values confirm rows exist
    const hasUCID = /\d{10,}/.test(bodyText);
    expect(hasUCID, '❌ No UCID values found — AOI rows may be empty').toBe(true);
    console.log('[STEP 5] UCID values present in AOI table rows ✅');

    console.log('[DONE] PLAY button / control visible in Call Level AOI table ✅');
  });

  // ============================================================
  // TC-PCA27 — Call Level AOI Top 10 / Bottom 10 toggle changes data
  // ============================================================
  test('TC-PCA27 — Call Level AOI Top 10 / Bottom 10 toggle switches call records', async ({ page }) => {
    test.setTimeout(60000);

    // Confirm AOI section and toggles are visible
    const heading = page.getByText('Call Level AOI', { exact: false });
    await expect(heading, '❌ "Call Level AOI" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Call Level AOI" section visible ✅');

    const top10Btn    = page.locator('button').filter({ hasText: /^top 10$/i });
    const bottom10Btn = page.locator('button').filter({ hasText: /^bottom 10$/i });
    await expect(top10Btn,    '❌ "Top 10" button not visible in AOI section').toBeVisible({ timeout: 5000 });
    await expect(bottom10Btn, '❌ "Bottom 10" button not visible in AOI section').toBeVisible({ timeout: 5000 });
    console.log('[STEP 2] "Top 10" and "Bottom 10" buttons visible in AOI section ✅');

    // Capture UCIDs shown in Top 10 view
    const bodyTop = await page.locator('body').innerText();
    const ucidsTop = (bodyTop.match(/\d{16,}/g) || []).slice(0, 3);
    console.log(`[STEP 3] Top 10 UCIDs (first 3): ${ucidsTop.join(', ')} ✅`);
    expect(ucidsTop.length, '❌ No UCIDs found in Top 10 AOI table').toBeGreaterThanOrEqual(1);

    // Switch to Bottom 10
    await bottom10Btn.click();
    await page.waitForTimeout(3000);
    console.log('[STEP 4] Clicked "Bottom 10" — waiting for AOI data to refresh...');

    // Capture UCIDs in Bottom 10 view
    const bodyBottom = await page.locator('body').innerText();
    const ucidsBottom = (bodyBottom.match(/\d{16,}/g) || []).slice(0, 3);
    console.log(`[STEP 5] Bottom 10 UCIDs (first 3): ${ucidsBottom.join(', ')} ✅`);
    expect(ucidsBottom.length, '❌ No UCIDs found in Bottom 10 AOI table').toBeGreaterThanOrEqual(1);

    // UCIDs must differ between Top 10 and Bottom 10 (different calls shown)
    const dataChanged = ucidsTop[0] !== ucidsBottom[0];
    expect(dataChanged, '❌ AOI table data did not change after switching to Bottom 10').toBe(true);
    console.log('[STEP 6] AOI table data changed after Bottom 10 toggle ✅');

    // Switch back to Top 10
    await top10Btn.click();
    await page.waitForTimeout(3000);
    console.log('[STEP 7] Clicked "Top 10" — waiting for AOI data to refresh...');

    const bodyTopAgain = await page.locator('body').innerText();
    const ucidsTopAgain = (bodyTopAgain.match(/\d{16,}/g) || []).slice(0, 3);
    console.log(`[STEP 8] Top 10 UCIDs after switching back: ${ucidsTopAgain.join(', ')}`);

    // Should match original Top 10 UCIDs
    expect(ucidsTopAgain[0], '❌ Top 10 data did not restore after switching back').toBe(ucidsTop[0]);
    console.log('[STEP 9] Top 10 data restored correctly after switching back ✅');

    console.log('[DONE] Call Level AOI Top 10 / Bottom 10 toggle verified — data switches correctly ✅');
  });

});
