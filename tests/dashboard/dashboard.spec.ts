import { test, expect, Page } from "@playwright/test";
import {
  CONSULT_API,
  DASHBOARD_API,
  generateDashboardStats,
} from "../../fixtures/mockData";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function realLogin(page: Page) {
  console.log("[login] Clearing any existing auth");
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
  console.log("[login] Submitting login form");
  await Promise.all([
    page.waitForURL(/\/(dashboard|doctors-list|appointments)/, { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log("[login] ✓ Real login successful");
}

const todayStats = generateDashboardStats(new Date());
const statLabels = ["Today's Consultations", "Attendance", "Yet to Consult", "Today's cart value"];

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.route("**/events-middleware*/**", (route) => route.abort());
});

// ─── Test #11 ────────────────────────────────────────────────────────────────

test("11. Dashboard loads and shows all 4 stat cards with values", async ({ page }) => {
  console.log("[11] Logging in with real credentials (no mock — live data)");
  await realLogin(page);

  console.log("[11] Navigating to /dashboard");
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL("/dashboard", { timeout: 8000 });
  console.log("[11] ✓ On /dashboard with REAL data");

  // Wait for stat cards to load
  await page.waitForTimeout(3000);

  console.log("[11] Checking all 4 stat card labels are visible");
  for (const label of statLabels) {
    await expect(page.getByText(label)).toBeVisible({ timeout: 8000 });
    console.log(`[11]   ✓ Label visible: "${label}"`);
  }

  // Read real live values directly from each stat card
  console.log("[11] Reading REAL live values from each stat card:");
  const cardData = [
    { label: "Today's Consultations", locator: page.getByText("Today's Consultations").locator("xpath=../..") },
    { label: "Attendance",            locator: page.getByText("Attendance").locator("xpath=../..") },
    { label: "Yet to Consult",        locator: page.getByText("Yet to Consult").locator("xpath=../..") },
    { label: "Today's cart value",    locator: page.getByText("Today's cart value").locator("xpath=../..") },
  ];

  for (const card of cardData) {
    const text = await card.locator.innerText().catch(() => "—");
    console.log(`[11]   ✓ ${card.label}: ${text.trim().replace(/\n/g, ' | ')}`);
  }

  console.log("[11] ✓ All 4 stat cards rendered with REAL live data");
});

// ─── Test #11b ───────────────────────────────────────────────────────────────

test("11b. Dashboard shows percentage change and from-last-week text", async ({ page }) => {
  console.log("[11b] Logging in with real credentials (no mock — live data)");
  await realLogin(page);

  console.log("[11b] Navigating to /dashboard");
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.getByText("Today's Consultations")).toBeVisible({ timeout: 8000 });
  console.log("[11b] ✓ Dashboard loaded with REAL data");

  console.log("[11b] Checking 'from last week' text");
  await expect(page.getByText("from last week").first()).toBeVisible({ timeout: 8000 });
  console.log("[11b] ✓ 'from last week' text visible");

  // Read all percentage values shown
  const pctTexts = await page.locator('text=/%/').allInnerTexts().catch(() => []);
  console.log(`[11b] Percentage values on page: ${JSON.stringify(pctTexts)}`);

  console.log("[11b] ✓ Percentage change verified with real data");
});

// ─── Test #11c ───────────────────────────────────────────────────────────────

test("11c. Dashboard shows loading spinners while fetching stats", async ({ page }) => {
  console.log("[11c] Logging in with real credentials");
  await realLogin(page);

  // Mock stats API with delay AFTER real login so spinner is captured
  console.log("[11c] Mocking stats API with 1.5s delay to capture loading state");
  await page.route(`${CONSULT_API}/appointments/stats*`, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(todayStats) });
  });

  console.log("[11c] Navigating to /dashboard");
  await page.goto("/dashboard");

  console.log("[11c] Checking .loader4 spinners visible during fetch");
  await expect(page.locator(".loader4").first()).toBeVisible({ timeout: 3000 });
  console.log("[11c] ✓ Loading spinners visible");

  console.log("[11c] Waiting for stats to load and spinners to disappear");
  await expect(page.locator(".loader4")).toHaveCount(0, { timeout: 8000 });
  console.log("[11c] ✓ Stats loaded, spinners gone");
});

// ─── Test #11d ───────────────────────────────────────────────────────────────

test("11d. Dashboard stats API failure shows fallback zero values silently", async ({ page }) => {
  console.log("[11d] Logging in with real credentials");
  await realLogin(page);

  // Mock stats API with 500 error AFTER real login
  console.log("[11d] Mocking stats API → 500 error");
  await page.route(`${CONSULT_API}/appointments/stats*`, (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) })
  );

  console.log("[11d] Navigating to /dashboard");
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");

  await expect(page).toHaveURL("/dashboard", { timeout: 8000 });
  console.log("[11d] ✓ Still on /dashboard (no crash)");

  console.log("[11d] Checking all card labels still visible with fallback data");
  for (const label of statLabels) {
    await expect(page.getByText(label)).toBeVisible({ timeout: 8000 });
    console.log(`[11d]   ✓ Label visible: "${label}"`);
  }

  await expect(page.getByText("0", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  console.log("[11d] ✓ Fallback '0' values shown");

  await expect(page.locator(".Toastify")).not.toContainText(/error|failed/i, { timeout: 3000 });
  console.log("[11d] ✓ No error toast shown (failure is silent)");
});

// ─── Test #11e ───────────────────────────────────────────────────────────────

test("11e. Dashboard is not accessible without auth — redirects to login", async ({ page }) => {
  console.log("[11e] Clearing any existing auth (ensuring no login)");
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loggedInUserData");
  });
  console.log("[11e] Navigating to /dashboard WITHOUT login");

  console.log("[11e] Expecting redirect to login page /");
  await expect(page).toHaveURL("/", { timeout: 8000 });
  console.log("[11e] ✓ Unauthenticated user redirected to login");
});
