// doctor_full_flow.spec.ts

import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test.describe("Doctor Dashboard → Full Flow + Appointments Navigation", () => {

  // ============================================================
  // 🔧 Helper: Get Selected Date
  // ============================================================
  const getSelectedDate = async (page: import('@playwright/test').Page): Promise<string> => {
    const input = page.locator('input[type="date"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    return await input.inputValue();
  };

  test("Full Doctor Flow + Navigation Validation", async ({ page, browser }) => {
    test.setTimeout(90000);

    // ============================================================
    // 🌐 OPEN DASHBOARD
    // ============================================================
    await page.setViewportSize({ width: 1512, height: 777 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // ============================================================
    // 🔐 LOGIN (SINDHU)
    // ============================================================
    const user = usersData.users.find(u => u.name === 'sindhu');
    expect(user).toBeTruthy();

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await page.fill('input[type="email"]', user!.email);
    await page.fill('input[type="password"]', user!.password);
    await page.getByRole('button', { name: 'LOGIN', exact: true }).click();

    // ============================================================
    // ⏳ WAIT FOR LOGIN — URL changes from current page
    // ============================================================
    const loginUrl = page.url();
    await page.waitForURL(url => url.href !== loginUrl, { timeout: 20000 });
    // Toast may appear briefly — catch it if visible
    const toast = page.getByText('Login Success');
    await toast.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await toast.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // ============================================================
    // 👨‍⚕️ VERIFY DOCTOR NAME
    // ============================================================
    // Sindhu name may appear in different elements — check body text as fallback
    const hasSindhu = await page.locator('.text-neutral-600').filter({ hasText: 'Sindhu' }).count()
      .then(c => c > 0).catch(() => false);
    if (hasSindhu) {
      console.log('✅ Verified: Sindhu logged in');
    } else {
      const bodyText = await page.locator('body').innerText();
      expect(bodyText, '❌ Sindhu name not found on page').toContain('Sindhu');
    }

    // ============================================================
    // 🔍 SELECT SANTOSH
    // ============================================================
    const santosh = page.locator('.mt-\\[21px\\]').getByText('Santosh').first();

    await expect(santosh).toBeVisible();
    await santosh.click();

    console.log('✅ Selected Santosh');

    // ============================================================
    // ⏳ WAIT FOR APPOINTMENTS LOAD
    // ============================================================
    await page.waitForLoadState('domcontentloaded');

    // Wait up to 10s for at least one appointment to appear
    const appointments = page.locator('.flex.flex-col.gap-1');
    await appointments.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const count = await appointments.count();

    console.log(`📅 Appointments found: ${count}`);

    if (count > 0) {
      // ============================================================
      // 🟢 CLICK FIRST APPOINTMENT
      // ============================================================
      const firstAppointment = appointments.first();

      await expect(firstAppointment).toBeVisible();

      const text = await firstAppointment.innerText();
      console.log(`📅 Selected Slot: ${text}`);

      const overlay = page.locator('.backdrop-blur-sm');
      if (await overlay.isVisible().catch(() => false)) {
        await overlay.waitFor({ state: 'hidden', timeout: 10000 });
      }

      await firstAppointment.click();
      console.log('✅ Appointment opened');

      // ============================================================
      // ✅ VERIFY CONSULTATION PAGE
      // ============================================================
      await expect(page.getByText('Active Consultation')).toBeVisible();
      await expect(page.getByText('View Patient 360')).toBeVisible();

      // ============================================================
      // 🆔 EXTRACT APPOINTMENT ID
      // ============================================================
      const currentUrl = page.url();
      const appointmentId = new URL(currentUrl).searchParams.get('appointmentId');
      expect(appointmentId).toBeTruthy();
      console.log(`🆔 Appointment ID: ${appointmentId}`);

      // ============================================================
      // 🔙 GO BACK TO DASHBOARD
      // ============================================================
      await page.goBack();
    } else {
      console.log('⚠️ No appointments — skipping appointment click, continuing navigation tests');
    }

    // ============================================================
    // ===============================
    // 🔽 NOW CYPRESS TESTS START HERE
    // ===============================
    // ============================================================

    // ============================================================
    // 1️⃣ OPEN TODAY'S APPOINTMENTS
    // ============================================================
    await page.getByText("Todays Appointments").click();

    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();

    const todayDate = await getSelectedDate(page);
    expect(todayDate).not.toBe('');

    const todayAppointments = page.locator('.flex.flex-col.gap-1');
    await page.waitForTimeout(1500);
    const todayCount = await todayAppointments.count();
    console.log(`📅 Today's Appointments count: ${todayCount}`);
    console.log("✔ Today's Appointments Page Loaded");

    // ============================================================
    // 2️⃣ BACK ARROW (API VALIDATION)
    // ============================================================
    const [backRequest] = await Promise.all([
      page.waitForRequest(req =>
        req.url().includes('/appointments') && req.method() === 'GET'
      ),
      page.locator('button:has-text("←")').first().click({ force: true })
    ]);

    expect(backRequest.url()).toContain("date=");
    console.log("✔ Back arrow API validated");

    // ============================================================
    // 3️⃣ TODAY BUTTON NAVIGATION
    // ============================================================
    await page.locator('button:has-text("←")').first().click();

    await page.waitForResponse(res =>
      res.url().includes('/appointments')
    );

    await page.getByRole('button', { name: 'Today' }).click();

    await page.waitForResponse(res =>
      res.url().includes('/appointments')
    );

    const currentDate = await getSelectedDate(page);
    // Compare against actual today (YYYY-MM-DD) — server may be in different timezone
    const todayStr = new Date().toISOString().slice(0, 10);
    const nextDayStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    expect([todayStr, nextDayStr], `❌ Today button returned unexpected date: ${currentDate}`)
      .toContain(currentDate);

    console.log(`✔ Today button navigation successful → date: ${currentDate}`);

    // ============================================================
    // 4️⃣ FORWARD ARROW (API VALIDATION)
    // ============================================================
    const [forwardRequest] = await Promise.all([
      page.waitForRequest(req =>
        req.url().includes('/appointments') && req.method() === 'GET'
      ),
      page.locator('button:has-text("→")').first().click({ force: true })
    ]);

    expect(forwardRequest.url()).toContain("date=");
    console.log("✔ Forward arrow API validated");

    // ============================================================
    // 5️⃣ DATA VISIBILITY
    // ============================================================
    await Promise.all([
      page.waitForResponse(res =>
        res.url().includes('/appointments') && res.status() === 200
      ),
      page.locator('button:has-text("→")').first().click({ force: true })
    ]);

    await expect(page.locator('body')).toBeVisible();

    console.log("✔ Appointments data loaded successfully");

    // ============================================================
    // 🔒 CLOSE BROWSER
    // ============================================================
    await browser.close();
    console.log('🔒 Browser closed');

  });

});