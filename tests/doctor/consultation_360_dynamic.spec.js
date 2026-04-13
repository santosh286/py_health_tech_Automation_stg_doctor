import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

// ============================================================
// 🔥 Dynamic Data Generator
// ============================================================
function generateUserData() {
  const timestamp = Date.now();

  return {
    firstName: `Raj_${timestamp}`,
    lastName: `Kumar_${timestamp}`,
    age: `${Math.floor(Math.random() * 50) + 18}`
  };
}

test('Full Flow → Sindhu → Santosh → Consultation → Create Profile', async ({ page }) => {

  // ============================================================
  // 🌐 OPEN DASHBOARD
  // ============================================================
  await page.goto('/');
  await page.setViewportSize({ width: 1512, height: 777 });

  // ============================================================
  // 🔐 LOGIN (SINDHU)
  // ============================================================
  const user = usersData.users.find(u => u.name === 'sindhu');

  expect(user, 'User should exist').toBeTruthy();

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

  // ============================================================
  // 👨‍⚕️ VERIFY DOCTOR NAME
  // ============================================================
  await expect(page.locator('.text-neutral-600'))
    .toContainText('Sindhu', { timeout: 10000 });

  // ============================================================
  // 🔍 SELECT "SANTOSH"
  // ============================================================
  const santoshOption = page
    .locator('.mt-\\[21px\\]')
    .getByText('Santosh')
    .first();

  await expect(santoshOption).toBeVisible({ timeout: 10000 });
  await santoshOption.click();

  console.log('✅ Selected Santosh — navigated to appointment detail page');

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();

  // ============================================================
  // 🧾 OPEN PATIENT 360
  // ============================================================
  await page.getByText('View Patient 360').click();
  await expect(page).toHaveURL(/patient/);

  console.log('🎉 Patient 360 opened');

  // ============================================================
  // 👤 OPEN PROFILES
  // ============================================================
  await page.locator('.backdrop-blur-sm').waitFor({ state: 'hidden', timeout: 10000 });
  await page.getByRole('button', { name: /Profiles/i }).click();

  // ============================================================
  // ➕ CREATE NEW PROFILE
  // ============================================================
  await page.getByRole('button', { name: 'Create New Profile' }).click();

  const modal = page.getByRole('heading', { name: 'Create Patient Profile' });
  await expect(modal).toBeVisible();

  console.log('✅ Profile modal opened');

  // ============================================================
  // 🧾 SELECT RELATIONSHIP
  // ============================================================
  await page.locator('.select__control').filter({ hasText: 'Select Relationship' }).click();
  await page.getByRole('option', { name: 'Son' }).click();

  // ============================================================
  // 👨 SELECT GENDER
  // ============================================================
  await page.locator('.select__control').filter({ hasText: 'Select Gender' }).click();
  await page.getByRole('option', { name: 'Male', exact: true }).click();

  console.log('✅ Gender selected');

  // ============================================================
  // ✍️ DYNAMIC DATA
  // ============================================================
  const userData = generateUserData();
  console.log('🧪 Generated Data:', userData);

  // ============================================================
  // ✍️ FILL FORM
  // ============================================================
  await page.fill('input[name="first_name"]', userData.firstName);
  await page.fill('input[name="last_name"]', userData.lastName);
  await page.fill('input[name="age"]', userData.age);

  console.log('✅ Form filled');

  // ============================================================
  // 🚀 CREATE PROFILE
  // ============================================================
  await page.getByText('Create Profile').click();

  console.log('🎉 Profile created');

  // ============================================================
  // ❌ CLOSE MODAL
  // ============================================================
  await page.locator("//button[normalize-space()='×']").first().click();

  console.log('✅ Modal closed');

});