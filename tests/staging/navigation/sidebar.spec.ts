import { test, expect, Page } from "@playwright/test";

async function realLogin(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loggedInUserData");
  });
  await page.goto("/");
  await expect(page.locator("#email")).toBeVisible({ timeout: 8000 });
  await page.fill("#email", "santosh.kumbar@kapiva.in");
  await page.fill("#password", "s");
  await Promise.all([
    page.waitForURL(/\/(dashboard|doctors-list|appointments)/, { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log("[login] ✓ Real login successful");
}

test("Sidebar — click each menu item and log page content", async ({ page, context }) => {
  test.setTimeout(180000);
  console.log("[sidebar] Logging in with real credentials");
  await realLogin(page);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  // Read all sidebar menu item labels
  const menuLabels: string[] = await page.evaluate(() => {
    const allDivs = Array.from(document.querySelectorAll('div'));
    const sidebar = allDivs.find(el =>
      el.className.includes('w-[270px]') &&
      el.className.includes('absolute') &&
      el.className.includes('top-[103px]')
    );
    if (!sidebar) return [];
    // Each nav item is a div with hover:cursor-pointer containing a text div
    const items = Array.from(sidebar.querySelectorAll('div.hover\\:cursor-pointer'));
    return items.map(el => el.textContent?.trim().replace(/\s+/g, ' ') ?? '').filter(Boolean);
  });

  console.log(`[sidebar] Found ${menuLabels.length} menu items:`);
  menuLabels.forEach((label, i) => {
    console.log(`[sidebar]   ${i + 1}. "${label}"`);
  });

  // ── Click each item and log what loads ──────────────────────────────────────
  console.log("\n[sidebar] ── Clicking each menu item ──────────────────────────");

  for (let i = 0; i < menuLabels.length; i++) {
    const label = menuLabels[i];
    console.log(`\n[sidebar] ──────────────────────────────────────────`);
    console.log(`[sidebar] [${i + 1}/${menuLabels.length}] Clicking: "${label}"`);

    try {
      // Click the sidebar item by index via JS
      await page.evaluate((idx) => {
        const allDivs = Array.from(document.querySelectorAll('div'));
        const sidebar = allDivs.find(el =>
          el.className.includes('w-[270px]') &&
          el.className.includes('absolute') &&
          el.className.includes('top-[103px]')
        );
        if (!sidebar) return;
        const items = Array.from(sidebar.querySelectorAll('div.hover\\:cursor-pointer')) as HTMLElement[];
        items[idx]?.click();
      }, i);

      await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
      await page.waitForTimeout(2000);

      const currentURL = page.url();
      console.log(`[sidebar]   ✓ URL: ${currentURL}`);

      // Skip 404 pages
      const is404 = await page.locator('text=404').or(page.locator('text=This page could not be found')).isVisible().catch(() => false);
      if (is404) {
        console.log(`[sidebar]   ⚠ 404 — page not found, skipping`);
        await page.goBack().catch(() => {});
        continue;
      }

      // Skip if page navigated away from the app (external link)
      if (!currentURL.includes('stg-hts.kapiva.tech')) {
        console.log(`[sidebar]   ⚠ External URL — skipping`);
        await page.goto('https://stg-hts.kapiva.tech/dashboard').catch(() => {});
        continue;
      }

      // Get main heading / page title
      const heading = await page.locator('[class*="font-extrabold"]').first().innerText().catch(() => "—");
      console.log(`[sidebar]   ✓ Page heading: "${heading.trim().replace(/\n/g, ' ')}"`);

      // ── If Capacity page → click Load and read all values ─────────────────
      const loadBtn = page.getByRole("button", { name: "Load" });
      const hasLoad = await loadBtn.isVisible().catch(() => false);
      if (hasLoad) {
        console.log(`[sidebar]   → Load button found — clicking to get capacity data`);
        await loadBtn.click();
        await page.waitForTimeout(4000);

        const summary = await page.locator('text=Total capacity').innerText().catch(() => null);
        if (summary) console.log(`[sidebar]   → Summary: ${summary}`);

        const lastUpdated = await page.locator('text=Last updated').innerText().catch(() => null);
        if (lastUpdated) console.log(`[sidebar]   → ${lastUpdated}`);
      }

      // ── Read table data if visible ─────────────────────────────────────────
      const tableVisible = await page.locator('table').isVisible().catch(() => false);
      if (tableVisible) {
        const headers  = await page.locator('thead th').allInnerTexts();
        const rowCount = await page.locator('tbody tr').count();
        console.log(`[sidebar]   → Table columns: [${headers.join(' | ')}]`);
        console.log(`[sidebar]   → Visible rows: ${rowCount}`);

        // Print first 3 rows
        for (let r = 0; r < Math.min(3, rowCount); r++) {
          const cells = await page.locator('tbody tr').nth(r).locator('td').allInnerTexts();
          console.log(`[sidebar]   → Row ${r + 1}: ${cells.map(c => c.trim().replace(/\n/g, ' · ')).join(' | ')}`);
        }
      }

      // ── Read stat cards if visible ─────────────────────────────────────────
      const statCards = page.locator('[class*="rounded-2xl"][class*="bg-white"]');
      const cardCount = await statCards.count();
      if (cardCount > 0 && cardCount <= 8) {
        console.log(`[sidebar]   → Stat cards (${cardCount}):`);
        for (let c = 0; c < cardCount; c++) {
          const cardText = await statCards.nth(c).innerText().catch(() => null);
          if (cardText?.trim()) {
            console.log(`[sidebar]     Card ${c + 1}: "${cardText.trim().replace(/\n/g, ' | ')}"`);
          }
        }
      }

    } catch (err: any) {
      console.log(`[sidebar]   ✘ Error: ${err.message?.split('\n')[0]}`);
    }
  }

  console.log("\n[sidebar] ✓ All sidebar menu items visited and logged");
});
