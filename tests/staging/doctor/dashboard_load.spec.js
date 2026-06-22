import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';

test.describe('Doctor Dashboard - Load Validation', () => {

    test.beforeEach(async ({ page }) => {

        await page.setViewportSize({ width: 1517, height: 777 });

        // ============================================================
        // 🌐 OPEN DASHBOARD
        // ============================================================
        await page.goto('/');

        // ============================================================
        // 🔐 LOGIN (SINDHU)
        // ============================================================
        const user = usersData.users.find(u => u.name === 'sindhu');

        if (!user) {
            throw new Error('Sindhu doctor credentials not found in users.json');
        }

        await page.fill('input[type="email"]', user.email);
        await page.fill('input[type="password"]', user.password);
        await Promise.all([
            page.waitForURL(/.*\/appointments/),
            page.getByRole('button', { name: 'LOGIN', exact: true }).click(),
        ]);
    });

    test('should load the doctor dashboard and verify consultation API @smoke', async ({ page }) => {

        // ============================================================
        // 📡 WAIT FOR CONSULTATION API
        // ============================================================
        const [response] = await Promise.all([
            page.waitForResponse(res =>
                res.url().includes('/appointments') &&
                res.request().method() === 'GET'
            ),
            page.reload(),
        ]);

        // ============================================================
        // ✅ API VALIDATION
        // ============================================================
        const status = response.status();
        console.log(`📡 Consultation API response status: ${status}`);
        expect(status, `❌ API failed — expected 200 but got ${status}`).toBe(200);

        console.log('✅ Consultation API validated');

        // ============================================================
        // ✅ UI VALIDATION
        // ============================================================
        await expect(page).toHaveURL(/.*\/appointments/);
        console.log('✅ URL verified — /appointments');

        await expect(page.getByText('Todays Appointments')).toBeVisible();
        console.log('✅ "Todays Appointments" visible');

        await expect(page.locator('body')).toBeVisible();
        console.log('✅ Page body visible — dashboard fully loaded');

    });

});