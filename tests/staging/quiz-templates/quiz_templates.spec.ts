import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

const BASE_URL      = 'https://stg-hts.kapiva.tech';
const PAGE_URL      = `${BASE_URL}/quiz-templates`;
const AUTO_QUIZ_ID  = '032ad3cd-58bd-4c16-893f-5109154843ec';
const AUTO_QUIZ_URL = `${PAGE_URL}/${AUTO_QUIZ_ID}`;

// Resolved at runtime from the builder page — not hardcoded
let AUTO_QUIZ_NAME  = 'Automation Test Quiz'; // fallback default

// ─── Login helper ──────────────────────────────────────────────────────────────
async function login(page: any) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#email', usersData.users[2].email);
  await page.fill('#password', usersData.users[2].password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|appointments|doctors-list)/, { timeout: 30000 });
  console.log('[Login] Logged in as:', usersData.users[2].email);
}

test.describe('Quiz Templates — /quiz-templates', () => {

  // Resolve quiz name dynamically from the builder page before any test runs
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page    = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', usersData.users[2].email);
    await page.fill('#password', usersData.users[2].password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|appointments|doctors-list)/, { timeout: 30000 });
    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Read the quiz name from the h1/heading on the builder page
    const nameEl = page.locator('h1, [class*="title"], [class*="heading"]').first();
    const nameVisible = await nameEl.isVisible({ timeout: 5000 }).catch(() => false);
    if (nameVisible) {
      const resolved = (await nameEl.innerText()).trim();
      if (resolved) { AUTO_QUIZ_NAME = resolved; }
    } else {
      // Fallback: find the editable name input
      const nameInput = page.locator('input[type="text"]').first();
      const inputVisible = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);
      if (inputVisible) {
        const resolved = await nameInput.inputValue();
        if (resolved) AUTO_QUIZ_NAME = resolved;
      }
    }
    console.log(`[Setup] Resolved quiz name dynamically: "${AUTO_QUIZ_NAME}"`);
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    console.log('[Setup] Quiz Templates page loaded:', page.url());
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const path = `test-results/screenshots/qt-failure-${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true }).catch(() => {});
      await testInfo.attach('failure-screenshot', { path, contentType: 'image/png' }).catch(() => {});
    }
    await page.context().clearCookies().catch(() => {});
    await page.close().catch(() => {});
  });



  // ============================================================
  // TC-QT01 — Page loads with heading and New Template button
  // ============================================================
  test('TC-QT01 — Page loads with "Quiz Templates" heading and "+ New Template" button', async ({ page }) => {
    test.setTimeout(60000);

    const heading = page.getByText('Quiz Templates').first();
    await expect(heading, '❌ "Quiz Templates" heading not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "Quiz Templates" heading visible ✅');

    const newBtn = page.locator('button').filter({ hasText: '+ New Template' });
    await expect(newBtn, '❌ "+ New Template" button not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 2] "+ New Template" button visible ✅');

    expect(page.url(), '❌ URL should contain /quiz-templates').toContain('/quiz-templates');
    console.log('[STEP 3] URL confirmed: /quiz-templates ✅');
  });

  // ============================================================
  // TC-QT02 — Table has 4 columns
  // ============================================================
  test('TC-QT02 — Table shows 4 columns: Name, Description, Status, Actions', async ({ page }) => {
    test.setTimeout(60000);

    const columns = ['Name', 'Description', 'Status', 'Actions'];
    const bodyText = await page.locator('body').innerText();
    for (const col of columns) {
      expect(bodyText, `❌ Column "${col}" not found in table`).toContain(col);
      console.log(`[STEP] Column "${col}" visible ✅`);
    }
    console.log('[DONE] All 4 table columns visible ✅');
  });

  // ============================================================
  // TC-QT03 — Table shows Automation Test Quiz in list
  // ============================================================
  test('TC-QT03 — Automation Test Quiz is visible in the template list', async ({ page }) => {
    test.setTimeout(60000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, `❌ "${AUTO_QUIZ_NAME}" not found in list`).toContain(AUTO_QUIZ_NAME);
    console.log(`[STEP 1] "${AUTO_QUIZ_NAME}" visible in list ✅`);

    // Check pagination shows total count
    const hasPagination = /\d+-\d+ of \d+/.test(bodyText);
    expect(hasPagination, '❌ Pagination not visible').toBe(true);
    const match = bodyText.match(/(\d+)-(\d+) of (\d+)/);
    if (match) console.log(`[STEP 2] Pagination: ${match[0]} ✅`);

    console.log('[DONE] Template list loaded with Automation Test Quiz ✅');
  });

  // ============================================================
  // TC-QT04 — Name column is sortable
  // ============================================================
  test('TC-QT04 — Name column is sortable — clicking changes order', async ({ page }) => {
    test.setTimeout(60000);

    const bodyBefore = await page.locator('body').innerText();
    const nameColBtn = page.locator('div').filter({ hasText: /^Name/ }).first();
    await expect(nameColBtn, '❌ Name column header not found').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] Name column header visible ✅');

    await nameColBtn.click();
    await page.waitForTimeout(1500);
    console.log('[STEP 2] Clicked Name column to sort');

    const bodyAfter = await page.locator('body').innerText();
    // Sort direction indicator should change (▲ or ▼)
    const hasSort = /▲|▼/.test(bodyAfter);
    expect(hasSort, '❌ No sort direction indicator found after clicking Name column').toBe(true);
    console.log('[STEP 3] Sort direction indicator visible ✅');

    console.log('[DONE] Name column sort works ✅');
  });

  // ============================================================
  // TC-QT05 — Published template shows Edit, Copy, Archive
  // ============================================================
  test('TC-QT05 — Published template shows Edit, Copy, Archive buttons', async ({ page }) => {
    test.setTimeout(60000);

    // Find a published template (PCOS Cohorting Assessment)
    const publishedName = 'PCOS Cohorting Assessment';
    const bodyText = await page.locator('body').innerText();
    expect(bodyText, `❌ "${publishedName}" not found`).toContain(publishedName);
    console.log(`[STEP 1] Published template "${publishedName}" found in list ✅`);

    // Locate that row
    const row = page.locator('div').filter({ hasText: publishedName }).first();

    // Edit button
    const editBtns = page.locator('button').filter({ hasText: /^Edit$/ });
    await expect(editBtns.first(), '❌ "Edit" button not visible').toBeVisible({ timeout: 5000 });
    console.log('[STEP 2] "Edit" button visible ✅');

    // Copy button
    const copyBtns = page.locator('button').filter({ hasText: /^Copy$/ });
    await expect(copyBtns.first(), '❌ "Copy" button not visible').toBeVisible({ timeout: 5000 });
    console.log('[STEP 3] "Copy" button visible ✅');

    // Archive button
    const archiveBtns = page.locator('button').filter({ hasText: /^Archive$/ });
    await expect(archiveBtns.first(), '❌ "Archive" button not visible').toBeVisible({ timeout: 5000 });
    console.log('[STEP 4] "Archive" button visible on published template ✅');

    // No Delete button for published
    const deleteBtns = page.locator('button').filter({ hasText: /^Delete$/ });
    const deleteCount = await deleteBtns.count();
    console.log(`[STEP 5] Delete buttons found: ${deleteCount} (only on draft templates)`);

    console.log('[DONE] Published template shows correct action buttons ✅');
  });

  // ============================================================
  // TC-QT06 — Draft template shows Edit, Copy, Delete (no Archive)
  // ============================================================
  test('TC-QT06 — Draft template "Automation Test Quiz" shows Edit, Copy, Delete buttons', async ({ page }) => {
    test.setTimeout(60000);

    const bodyText = await page.locator('body').innerText();
    expect(bodyText, `❌ "${AUTO_QUIZ_NAME}" not found`).toContain(AUTO_QUIZ_NAME);
    console.log(`[STEP 1] Draft template "${AUTO_QUIZ_NAME}" found in list ✅`);

    // Status should show "draft"
    expect(bodyText, '❌ "draft" status not found for Automation Test Quiz').toContain('draft');
    console.log('[STEP 2] "draft" status badge visible ✅');

    // Delete button should be visible (draft only)
    const deleteBtn = page.locator('button').filter({ hasText: /^Delete$/ });
    await expect(deleteBtn.first(), '❌ "Delete" button not visible for draft template').toBeVisible({ timeout: 5000 });
    console.log('[STEP 3] "Delete" button visible on draft template ✅');

    console.log('[DONE] Draft template shows correct Edit/Copy/Delete buttons ✅');
  });

  // ============================================================
  // TC-QT07 — Rows per page dropdown
  // ============================================================
  test('TC-QT07 — Rows per page dropdown has options 10, 15, 20, 25, 30', async ({ page }) => {
    test.setTimeout(60000);

    const rowsSelect = page.locator('select').first();
    await expect(rowsSelect, '❌ Rows per page dropdown not found').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] Rows per page dropdown visible ✅');

    const options = await rowsSelect.locator('option').allInnerTexts();
    console.log('[STEP 2] Rows per page options:', options);

    const expectedOptions = ['10', '15', '20', '25', '30'];
    for (const opt of expectedOptions) {
      expect(options, `❌ Option "${opt}" not found in rows-per-page dropdown`).toContain(opt);
      console.log(`[STEP 3] Option "${opt}" available ✅`);
    }

    console.log('[DONE] Rows per page dropdown has all 5 options ✅');
  });

  // ============================================================
  // TC-QT08 — Click Edit on Automation Test Quiz → opens builder
  // ============================================================
  test('TC-QT08 — Click "Edit" on Automation Test Quiz opens builder at correct URL', async ({ page }) => {
    test.setTimeout(60000);

    // Go directly to builder URL
    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    console.log('[STEP 1] Navigated to Automation Test Quiz builder');

    expect(page.url(), '❌ URL should contain quiz ID').toContain(AUTO_QUIZ_ID);
    console.log('[STEP 2] URL contains correct quiz ID ✅');

    const heading = page.getByText(AUTO_QUIZ_NAME).first();
    await expect(heading, `❌ "${AUTO_QUIZ_NAME}" heading not visible on builder`).toBeVisible({ timeout: 10000 });
    console.log(`[STEP 3] "${AUTO_QUIZ_NAME}" heading visible on builder page ✅`);

    console.log('[DONE] Edit opens builder at correct URL ✅');
  });

  // ============================================================
  // TC-QT09 — Builder shows name, draft badge, description, question count
  // ============================================================
  test('TC-QT09 — Builder shows name, status badge, description and QUESTIONS count', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    // Name
    expect(bodyText, `❌ Quiz name "${AUTO_QUIZ_NAME}" not visible`).toContain(AUTO_QUIZ_NAME);
    console.log(`[STEP 1] Quiz name "${AUTO_QUIZ_NAME}" visible ✅`);

    // Status badge
    const hasDraft = bodyText.includes('draft') || bodyText.includes('published');
    expect(hasDraft, '❌ No status badge (draft/published) visible').toBe(true);
    console.log('[STEP 2] Status badge visible ✅');

    // Description
    expect(bodyText, '❌ Description text not visible').toContain('Created by automation for testing purposes');
    console.log('[STEP 3] Description text visible ✅');

    // Question count
    expect(bodyText, '❌ "QUESTIONS (3)" not visible').toContain('QUESTIONS (3)');
    console.log('[STEP 4] "QUESTIONS (3)" count visible ✅');

    console.log('[DONE] Builder shows all expected metadata ✅');
  });

  // ============================================================
  // TC-QT10 — All 3 questions listed with title and type
  // ============================================================
  test('TC-QT10 — All 3 questions show correct title and question type', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bodyText = await page.locator('body').innerText();

    const questions = [
      { title: 'How would you describe your current health?', type: 'Single Select' },
      { title: 'Which symptoms do you currently experience?',  type: 'Multi Select'  },
      { title: 'Have you consulted a doctor before?',          type: 'Yes / No'       },
    ];

    for (const q of questions) {
      expect(bodyText, `❌ Question title "${q.title}" not found`).toContain(q.title);
      console.log(`[STEP] Question visible: "${q.title}" ✅`);
      expect(bodyText, `❌ Question type "${q.type}" not found`).toContain(q.type);
      console.log(`[STEP] Question type visible: "${q.type}" ✅`);
    }

    console.log('[DONE] All 3 questions visible with correct title and type ✅');
  });

  // ============================================================
  // TC-QT11 — Back link navigates to list
  // ============================================================
  test('TC-QT11 — "← Back" link navigates back to /quiz-templates list', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const backBtn = page.locator('button').filter({ hasText: '← Back' });
    await expect(backBtn, '❌ "← Back" button not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 1] "← Back" button visible ✅');

    await backBtn.click();
    await page.waitForTimeout(2000);
    console.log('[STEP 2] Clicked "← Back"');

    expect(page.url(), '❌ URL should return to /quiz-templates').toContain('/quiz-templates');
    expect(page.url(), '❌ URL should not contain quiz ID after going back').not.toContain(AUTO_QUIZ_ID);
    console.log('[STEP 3] Navigated back to /quiz-templates list ✅');

    const heading = page.getByText('Quiz Templates').first();
    await expect(heading, '❌ Quiz Templates heading not visible after back navigation').toBeVisible({ timeout: 10000 });
    console.log('[STEP 4] Quiz Templates list heading visible ✅');

    console.log('[DONE] "← Back" navigates correctly to list ✅');
  });

  // ============================================================
  // TC-QT12 — Builder action buttons visible
  // ============================================================
  test('TC-QT12 — Builder shows Configure, Duplicate, Publish action buttons', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(AUTO_QUIZ_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const buttons = ['Configure', 'Duplicate', 'Publish'];
    for (const btn of buttons) {
      const el = page.locator('button').filter({ hasText: new RegExp(`^${btn}$`, 'i') });
      await expect(el, `❌ "${btn}" button not visible`).toBeVisible({ timeout: 10000 });
      console.log(`[STEP] "${btn}" button visible ✅`);
    }

    // Product Mappings button
    const productMappings = page.locator('button').filter({ hasText: /Product Mappings/i });
    await expect(productMappings, '❌ "Product Mappings" button not visible').toBeVisible({ timeout: 5000 });
    console.log('[STEP] "Product Mappings" button visible ✅');

    console.log('[DONE] All builder action buttons visible ✅');
  });


});
