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

test.describe('User Management — Roles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/roles`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  });

  test('TC08 — roles list loads with roles visible', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-testid="role-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    console.log(`[TC08] ✅ Roles list loaded — ${count} role(s) found`);
  });

  test('TC09 — add new role button is visible', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add.*role|new role|create role/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    console.log('[TC09] ✅ Add new role button visible');
  });

  test('TC10 — navigate to add new role page', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add.*role|new role|create role/i }).first();
    await addBtn.click();
    await page.waitForURL(/roles.*add|add-new-role/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    const heading = page.getByRole('heading', { name: /add.*role|create.*role|new role/i });
    const formVisible = await page.locator('form, input[placeholder]').first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(formVisible).toBeTruthy();
    console.log('[TC10] ✅ Add new role page opened');
  });

  test('TC11 — view users in a role', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await page.waitForTimeout(1000);
    const usersLink = page.getByRole('link', { name: /view users|users/i }).first();
    const usersBtn = page.getByRole('button', { name: /view users|users/i }).first();
    const linkVisible = await usersLink.isVisible({ timeout: 3000 }).catch(() => false);
    const btnVisible = await usersBtn.isVisible({ timeout: 3000 }).catch(() => false);
    expect(linkVisible || btnVisible).toBeTruthy();
    console.log('[TC11] ✅ View users option visible for role');
  });

  test('TC12 — edit role button is visible per row', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    const editLink = page.getByRole('link', { name: /edit/i }).first();
    const editBtnVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const editLinkVisible = await editLink.isVisible({ timeout: 3000 }).catch(() => false);
    expect(editBtnVisible || editLinkVisible).toBeTruthy();
    console.log('[TC12] ✅ Edit button visible on roles list');
  });
});
