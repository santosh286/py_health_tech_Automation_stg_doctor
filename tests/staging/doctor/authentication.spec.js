import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test.describe('Doctor Dashboard - Authentication', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 1512, height: 777 });
  });

  test('Valid login (Rishi doctor)', async ({ page }) => {
    const user = usersData.users.find(u => u.name === 'rishi');

    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', user.password);
    await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

    await expect(page.getByText('Todays Appointments')).toBeVisible();
    await expect(page).toHaveURL(/.*\/appointments/);
  });

  test('Invalid password', async ({ page }) => {
    const user = usersData.users.find(u => u.name === 'rishi');

    await page.fill('input[type="email"]', user.email);
    await page.fill('input[type="password"]', 'wrong_password');
    await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });

  test('Invalid email', async ({ page }) => {
    await page.fill('input[type="email"]', 'invalid@kapiva.in');
    await page.fill('input[type="password"]', 'r');
    await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

    await expect(page.getByText(/invalid|not found/i)).toBeVisible();
  });

  test('Unauthorized access', async ({ page }) => {
    await page.goto('/appointments');

    await expect(page.getByRole('button', { name: 'LOGIN', exact: true })).toBeVisible();
  });

});