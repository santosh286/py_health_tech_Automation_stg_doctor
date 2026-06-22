import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://stg-hts.kapiva.tech";

async function realLogin(page: Page) {
  console.log("[login] Clearing any existing auth");
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loggedInUserData");
  });
  console.log("[login] Navigating to login page");
  await page.goto("/");
  await expect(page.locator("#email")).toBeVisible({ timeout: 8000 });
  await page.fill("#email", "santosh.kumbar@kapiva.in");
  await page.fill("#password", "s");
  console.log("[login] Submitting login form");
  await Promise.all([
    page.waitForURL(/\/(dashboard|doctors-list|appointments)/, { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log("[login] ✓ Real login successful");
}

// ─── Capacity Load Test ───────────────────────────────────────────────────────

test("Capacity — real login, click Load, get all values", async ({ page }) => {
  console.log("[capacity] Logging in with real credentials");
  await realLogin(page);

  console.log("[capacity] Navigating to /capacity");
  await page.goto("/capacity");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByRole("button", { name: "Load" })).toBeVisible({ timeout: 8000 });
  console.log("[capacity] ✓ Capacity page loaded");

  // ── Read current filter values ────────────────────────────────────────────
  const fromDate = await page.locator('input[type="date"]').first().inputValue();
  const toDate   = await page.locator('input[type="date"]').last().inputValue();
  console.log(`[capacity] From date: ${fromDate}`);
  console.log(`[capacity] To date:   ${toDate}`);

  // Read therapy filter
  const therapyVal = await page.locator('#filter-by-therapy').inputValue().catch(() => "N/A");
  console.log(`[capacity] Therapy filter: ${therapyVal || "All"}`);

  // Read consultant filter (only visible for admin)
  const consultantVal = await page.locator('#filter-by-consultant').inputValue().catch(() => "N/A");
  console.log(`[capacity] Consultant filter: ${consultantVal || "All"}`);

  // Read scope value
  const scopeVal = await page.locator('.select__single-value').last().innerText().catch(() => "Both");
  console.log(`[capacity] Scope: ${scopeVal}`);

  // ── Click Load ────────────────────────────────────────────────────────────
  console.log("[capacity] Clicking Load button");
  await page.getByRole("button", { name: "Load" }).click();
  console.log("[capacity]   ✓ Load clicked");

  // ── Wait for results ──────────────────────────────────────────────────────
  console.log("[capacity] Waiting for capacity data to load...");
  await expect(
    page.locator('text=Total capacity').or(page.locator('text=No capacity data'))
  ).toBeVisible({ timeout: 30000 });

  // ── Read summary stats ────────────────────────────────────────────────────
  console.log("[capacity] Reading summary stats:");
  const summaryText = await page.locator('text=Total capacity').innerText().catch(() => null);
  if (summaryText) {
    console.log(`[capacity]   ✓ Summary: ${summaryText}`);
  }

  const lastUpdated = await page.locator('text=Last updated').innerText().catch(() => null);
  if (lastUpdated) {
    console.log(`[capacity]   ✓ ${lastUpdated}`);
  }

  // ── Read table data ───────────────────────────────────────────────────────
  const tableVisible = await page.locator('table').isVisible().catch(() => false);

  if (tableVisible) {
    console.log("[capacity] ✓ Capacity table loaded — reading all rows:");

    // Read column headers
    const headers = await page.locator('thead th').allInnerTexts();
    console.log(`[capacity]   Columns: ${headers.join(' | ')}`);

    // Read all rows
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    console.log(`[capacity]   Total rows: ${rowCount}`);

    for (let i = 0; i < rowCount; i++) {
      const cells = await rows.nth(i).locator('td').allInnerTexts();
      const config      = cells[0]?.replace(/\n/g, ' · ').trim() ?? '-';
      const total       = cells[1]?.trim() ?? '-';
      const available   = cells[2]?.trim() ?? '-';
      const blocked     = cells[3]?.trim() ?? '-';
      const utilization = cells[4]?.trim() ?? '-';

      console.log(
        `[capacity]   Row ${i + 1}: Config="${config}" | Total=${total} | Available=${available} | Blocked=${blocked} | Utilization=${utilization}`
      );
    }

    // Read pagination info
    const paginationText = await page.locator('text=/Showing \\d+/').innerText().catch(() => null);
    if (paginationText) {
      console.log(`[capacity]   Pagination: ${paginationText}`);
    }
  } else {
    const emptyMsg = await page.locator('text=No capacity data').innerText().catch(() => null);
    console.log(`[capacity] ℹ No data found: ${emptyMsg}`);
  }

  console.log("[capacity] ✓ Capacity load test complete");
});
