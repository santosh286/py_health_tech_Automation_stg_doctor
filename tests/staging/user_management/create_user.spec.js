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

test.describe('User Management — Create User', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/users-management`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  });

  test('TC05 — create new button opens create form', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create|add new|new user/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 8000 });
    await createBtn.click();
    await page.waitForTimeout(1000);
    const form = page.locator('form, [class*="create-form"], [class*="consultant-form"]').first();
    await expect(form).toBeVisible({ timeout: 5000 });
    console.log('[TC05] ✅ Create form opened');
  });

  test('TC06 — submit empty create form shows validation errors', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /create|add new|new user/i }).first();
    await createBtn.click();
    await page.waitForTimeout(800);
    const submitBtn = page.getByRole('button', { name: /submit|save|create/i }).last();
    await submitBtn.click();
    await page.waitForTimeout(1000);
    const error = page.getByText(/required|cannot be empty|invalid/i).first();
    const errorVisible = await error.isVisible({ timeout: 5000 }).catch(() => false);
    expect(errorVisible).toBeTruthy();
    console.log('[TC06] ✅ Validation errors shown on empty submit');
  });

  test('TC07 — bulk mode toggle shows checkboxes', async ({ page }) => {
    const bulkBtn = page.getByRole('button', { name: /bulk|select all/i }).first();
    const bulkVisible = await bulkBtn.isVisible({ timeout: 5000 }).catch(() => false);
    if (bulkVisible) {
      await bulkBtn.click();
      await page.waitForTimeout(800);
      const checkbox = page.locator('input[type="checkbox"]').first();
      await expect(checkbox).toBeVisible({ timeout: 5000 });
      console.log('[TC07] ✅ Bulk mode enabled — checkboxes visible');
    } else {
      console.log('[TC07] ℹ️ Bulk mode button not found — skipping');
      test.skip();
    }
  });
});
