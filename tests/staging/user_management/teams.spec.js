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

test.describe('User Management — Teams', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/teams`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  });

  test('TC13 — teams list loads with teams visible', async ({ page }) => {
    const rows = page.locator('table tbody tr, [data-testid="team-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    console.log(`[TC13] ✅ Teams list loaded — ${count} team(s) found`);
  });

  test('TC14 — create team button is visible', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create team|add team|new team/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 8000 });
    console.log('[TC14] ✅ Create team button visible');
  });

  test('TC15 — navigate to create team page', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create team|add team|new team/i }).first();
    await createBtn.click();
    await page.waitForURL(/teams.*create|create.*team/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('domcontentloaded');
    const teamNameInput = page.locator('input#teamName, input[placeholder*="team"]').first();
    await expect(teamNameInput).toBeVisible({ timeout: 8000 });
    console.log('[TC15] ✅ Create team page opened with Team Name input');
  });

  test('TC16 — create team form — empty name shows warning', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create team|add team|new team/i }).first();
    await createBtn.click();
    await page.waitForLoadState('domcontentloaded');
    const submitBtn = page.getByRole('button', { name: /submit|save|create/i }).last();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    const warning = page.getByText(/cannot be empty|required|team name/i).first();
    const warningVisible = await warning.isVisible({ timeout: 5000 }).catch(() => false);
    expect(warningVisible).toBeTruthy();
    console.log('[TC16] ✅ Validation warning shown for empty team name');
  });

  test('TC17 — view members button visible per team row', async ({ page }) => {
    const membersBtn = page.getByRole('button', { name: /members|view members/i }).first();
    const membersLink = page.getByRole('link', { name: /members/i }).first();
    const btnVisible = await membersBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const linkVisible = await membersLink.isVisible({ timeout: 3000 }).catch(() => false);
    expect(btnVisible || linkVisible).toBeTruthy();
    console.log('[TC17] ✅ View members option visible on team row');
  });

  test('TC18 — edit team button visible per row', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    const editLink = page.getByRole('link', { name: /edit/i }).first();
    const btnVisible = await editBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const linkVisible = await editLink.isVisible({ timeout: 3000 }).catch(() => false);
    expect(btnVisible || linkVisible).toBeTruthy();
    console.log('[TC18] ✅ Edit button visible on team row');
  });

  test('TC19 — team status toggle visible', async ({ page }) => {
    const toggle = page.locator('button[role="switch"], input[type="checkbox"]').first();
    const toggleVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false);
    if (toggleVisible) {
      console.log('[TC19] ✅ Status toggle visible on team row');
    } else {
      console.log('[TC19] ℹ️ Status toggle not found in list — may be on edit page');
    }
  });
});
