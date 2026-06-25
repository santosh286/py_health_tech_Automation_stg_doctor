import { test, expect } from '@playwright/test';
import users from '../../../fixtures/users.json';

const BASE_URL = 'https://stg-hts.kapiva.tech';
const admin = users.users.find(u => u.name === 'santosh');

async function login(page, user) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(/email/i).fill(user.email);
  await page.getByPlaceholder(/password/i).fill(user.password);
  await page.getByRole('button', { name: /login|sign in/i }).click();
  await page.waitForURL(`${BASE_URL}/**`, { timeout: 15000 });
}

test.describe('User Management — Access Control', () => {
  test('TC20 — admin can access users-management page', async ({ page }) => {
    await login(page, admin);
    await page.goto(`${BASE_URL}/users-management`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const unauthorized = page.getByText(/unauthorized|permission|access denied/i);
    const isUnauthorized = await unauthorized.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isUnauthorized).toBeFalsy();
    console.log('[TC20] ✅ Admin can access User Management page');
  });

  test('TC21 — admin can access roles page', async ({ page }) => {
    await login(page, admin);
    await page.goto(`${BASE_URL}/roles`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const unauthorized = page.getByText(/unauthorized|permission|access denied/i);
    const isUnauthorized = await unauthorized.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isUnauthorized).toBeFalsy();
    console.log('[TC21] ✅ Admin can access Roles page');
  });

  test('TC22 — admin can access teams page', async ({ page }) => {
    await login(page, admin);
    await page.goto(`${BASE_URL}/teams`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const unauthorized = page.getByText(/unauthorized|permission|access denied/i);
    const isUnauthorized = await unauthorized.isVisible({ timeout: 3000 }).catch(() => false);
    expect(isUnauthorized).toBeFalsy();
    console.log('[TC22] ✅ Admin can access Teams page');
  });

  test('TC23 — user management link visible in sidebar for admin', async ({ page }) => {
    await login(page, admin);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const sidebarLink = page.getByRole('link', { name: /user.*management|users/i }).first();
    const visible = await sidebarLink.isVisible({ timeout: 5000 }).catch(() => false);
    expect(visible).toBeTruthy();
    console.log('[TC23] ✅ User Management link visible in sidebar');
  });

  test('TC24 — roles link visible in sidebar for admin', async ({ page }) => {
    await login(page, admin);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const rolesLink = page.getByRole('link', { name: /^roles$/i }).first();
    const visible = await rolesLink.isVisible({ timeout: 5000 }).catch(() => false);
    expect(visible).toBeTruthy();
    console.log('[TC24] ✅ Roles link visible in sidebar');
  });

  test('TC25 — teams link visible in sidebar for admin', async ({ page }) => {
    await login(page, admin);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const teamsLink = page.getByRole('link', { name: /^teams$/i }).first();
    const visible = await teamsLink.isVisible({ timeout: 5000 }).catch(() => false);
    expect(visible).toBeTruthy();
    console.log('[TC25] ✅ Teams link visible in sidebar');
  });
});
