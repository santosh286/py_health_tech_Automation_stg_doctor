import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

const BASE_URL  = 'https://stg-hts.kapiva.tech';
const DOCTOR_NAME = 'Kruti Bhavsar';

test.describe('Allocation Dashboard — /allocation', () => {

  test.beforeEach(async ({ page }) => {
    // Login as Admin
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('#email', usersData.users[2].email);
    await page.fill('#password', usersData.users[2].password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(dashboard|appointments|doctors-list)/, { timeout: 30000 });
    console.log('[Login] Admin logged in:', page.url());
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      const path = `test-results/screenshots/failure-${Date.now()}.png`;
      await page.screenshot({ path, fullPage: true }).catch(() => {});
      await testInfo.attach('failure-screenshot', { path, contentType: 'image/png' }).catch(() => {});
    }
    await page.context().clearCookies().catch(() => {});
    await page.close().catch(() => {});
  });

  // ============================================================
  // TEST 1 — Page loads with heading and search input
  // ============================================================
  test('TC-A01 — Allocation page loads with heading and search input', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/allocation`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('[STEP 1] Navigated to /allocation');

    await expect(
      page.getByText('Allocation Dashboard'),
      '❌ "Allocation Dashboard" heading not visible'
    ).toBeVisible({ timeout: 15000 });
    console.log('[STEP 2] "Allocation Dashboard" heading visible');

    await expect(
      page.getByText('Find a Doctor'),
      '❌ "Find a Doctor" label not visible'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP 3] "Find a Doctor" label visible');

    const searchInput = page.getByPlaceholder('Start typing doctor name...');
    await expect(searchInput, '❌ Search input not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP 4] Search input visible with correct placeholder');
  });

  // ============================================================
  // TEST 2 — Typing less than 2 chars does not show dropdown
  // ============================================================
  test('TC-A02 — Search with 1 character does not show dropdown', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/allocation`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const searchInput = page.getByPlaceholder('Start typing doctor name...');
    await searchInput.fill('K');
    await page.waitForTimeout(500);

    const dropdown = page.locator('[class*="absolute"][class*="z-50"]');
    const isVisible = await dropdown.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisible, '❌ Dropdown should NOT appear for less than 2 characters').toBe(false);
    console.log('[STEP] Dropdown correctly hidden for 1 character input');
  });

  // ============================================================
  // TEST 3 — Search "Kruti Bhavsar" returns results with badge
  // ============================================================
  test('TC-A03 — Search "Kruti Bhavsar" returns doctor result with Active badge', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/allocation`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const searchInput = page.getByPlaceholder('Start typing doctor name...');
    await searchInput.fill(DOCTOR_NAME);
    console.log(`[STEP 1] Typed "${DOCTOR_NAME}" in search`);

    // Wait for spinner then results
    await page.waitForTimeout(800);
    const dropdown = page.locator('[class*="absolute"][class*="z-50"]').first();
    await expect(dropdown, '❌ Dropdown did not appear after search').toBeVisible({ timeout: 15000 });
    console.log('[STEP 2] Dropdown appeared');

    // Verify doctor name in results
    const doctorResult = dropdown.getByText(DOCTOR_NAME, { exact: false }).first();
    await expect(doctorResult, `❌ "${DOCTOR_NAME}" not found in dropdown`).toBeVisible({ timeout: 10000 });
    console.log(`[STEP 3] "${DOCTOR_NAME}" found in search results`);

    // Verify Active/Inactive badge is present
    const badge = dropdown.locator('span').filter({ hasText: /active|inactive/i }).first();
    await expect(badge, '❌ Active/Inactive badge not visible').toBeVisible({ timeout: 5000 });
    const badgeText = await badge.innerText();
    console.log(`[STEP 4] Badge visible: "${badgeText}"`);
  });

  // ============================================================
  // TEST 4 — Search non-existent doctor shows "No doctors found"
  // ============================================================
  test('TC-A04 — Search non-existent name shows "No doctors found"', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/allocation`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const searchInput = page.getByPlaceholder('Start typing doctor name...');
    await searchInput.fill('ZZZNOMATCH999');
    await page.waitForTimeout(800);

    const noResult = page.getByText('No doctors found');
    await expect(noResult, '❌ "No doctors found" message not visible').toBeVisible({ timeout: 10000 });
    console.log('[STEP] "No doctors found" message shown correctly');
  });

  // ============================================================
  // TEST 5 — Select "Kruti Bhavsar" navigates to doctor dashboard
  // ============================================================
  test('TC-A05 — Select "Kruti Bhavsar" navigates to /allocation/doctor/[id]', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/allocation`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const searchInput = page.getByPlaceholder('Start typing doctor name...');
    await searchInput.fill(DOCTOR_NAME);
    await page.waitForTimeout(800);

    const dropdown = page.locator('[class*="absolute"][class*="z-50"]').first();
    await expect(dropdown, '❌ Dropdown did not appear').toBeVisible({ timeout: 15000 });

    const doctorBtn = dropdown.locator('button').filter({ hasText: DOCTOR_NAME }).first();
    await doctorBtn.click();
    console.log(`[STEP] Clicked "${DOCTOR_NAME}" in dropdown`);

    await page.waitForURL(/\/allocation\/doctor\//, { timeout: 15000 });
    expect(page.url(), '❌ URL should contain /allocation/doctor/').toContain('/allocation/doctor/');
    console.log(`[STEP] Navigated to: ${page.url()}`);

    // Verify back link is visible
    await expect(
      page.getByText(/back to search/i),
      '❌ "Back to search" link not visible'
    ).toBeVisible({ timeout: 10000 });
    console.log('[STEP] "Back to search" link visible on doctor dashboard');
  });
});
