import { test, expect } from '@playwright/test';
import users from '../../../fixtures/users.json';

const BASE_URL = 'https://stg-hts.kapiva.tech';
const admin = users.users.find(u => u.name === 'santosh');

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/email/i).fill(admin.email);
  await page.getByPlaceholder(/password/i).fill(admin.password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });
}

test.describe('User Management — User List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/users-management`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  });

  test('TC01 — user list loads with users visible', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-testid="user-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    console.log('[TC01] ✅ User list loaded');
  });

  test('TC02 — search user by name returns filtered results', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill('Test');
    await page.waitForTimeout(1000);
    const rows = page.locator('table tbody tr, [data-testid="user-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    console.log(`[TC02] ✅ Search returned ${count} result(s)`);
  });

  test('TC03 — search with no match shows empty state', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill('xyznonexistentuser999');
    await page.waitForTimeout(1000);
    const emptyState = page.getByText(/no user|no result|not found/i);
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);
    expect(rowCount === 0 || emptyVisible).toBeTruthy();
    console.log('[TC03] ✅ Empty state shown for no results');
  });

  test('TC04 — click user loads profile in right panel', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1500);
    const panel = page.locator('[class*="profile"], [class*="right-panel"], [class*="detail"]').first();
    const panelVisible = await panel.isVisible({ timeout: 5000 }).catch(() => false);
    expect(panelVisible).toBeTruthy();
    console.log('[TC04] ✅ Profile panel visible after user click');
  });
});
