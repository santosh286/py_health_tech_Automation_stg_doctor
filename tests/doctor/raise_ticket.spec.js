import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test('Raise Ticket - Sindhu → Santosh → Submit Ticket', async ({ page }) => {

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
  // 🔍 SELECT "SANTOSH" FROM LIST (.mt-[21px])
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
  // 🎫 CLICK "RAISE A TICKET"
  // ============================================================
  const raiseTicketBtn = page.getByRole('button', { name: /Raise a Ticket/i });
  await expect(raiseTicketBtn).toBeVisible();
  await raiseTicketBtn.click();

  // ============================================================
  // 📦 VERIFY MODAL
  // ============================================================
  const modal = page.getByRole('heading', { name: /Create a ticket/i });
  await expect(modal).toBeVisible();

  // ============================================================
  // 🧾 SELECT CASE TYPE
  // ============================================================
  const caseType = page.locator('.select__control').nth(0).locator('input');
  await caseType.fill('Customer Support');
  await page.keyboard.press('Enter');

  // ============================================================
  // 🧾 SELECT PRIORITY
  // ============================================================
  const priority = page.locator('.select__control').nth(1).locator('input');
  await priority.fill('High');
  await page.keyboard.press('Enter');

  // ============================================================
  // ✍️ ENTER DETAILS
  // ============================================================
  const details = page.getByRole('textbox', { name: 'Describe the issue' });

  await expect(details).toBeVisible();
  await details.fill('Dummy data for automation testing');

  // ============================================================
  // 📡 WAIT FOR API + CLICK SUBMIT
  // ============================================================
  const [response] = await Promise.all([
    page.waitForResponse(res =>
      res.url().includes('ticket') &&
      res.request().method() === 'POST'
    ),
    page.getByRole('button', { name: 'Submit' }).click()
  ]);

  console.log('🎫 Ticket submitted');

  // ============================================================
  // ✅ VERIFY API RESPONSE
  // ============================================================
  const status = response.status();
  console.log(`📡 Ticket API response status: ${status}`);
  expect(status, `❌ Ticket API failed — expected 201 but got ${status}`).toBe(201);
  console.log('✅ Ticket submitted successfully — status 201');

});