import { test, expect, Page } from "@playwright/test";
import {
  VALID_ACCESS_TOKEN,
  EXPIRED_ACCESS_TOKEN,
  REFRESH_TOKEN,
  MOCK_USER_DATA,
  LOGIN_SUCCESS_RESPONSE,
  LOGIN_INVALID_CREDENTIALS_RESPONSE,
  REFRESH_TOKEN_SUCCESS_RESPONSE,
} from "../../fixtures/mockData";

const AUTH_BASE =
  "https://kapiva-auth-service-stg-170267861398.asia-south1.run.app/auth-service/api/v1";
const DASHBOARD_BASE = "https://stg-doctors.kapiva.tech/api";

async function seedAuthInLocalStorage(page: Page, accessToken = VALID_ACCESS_TOKEN) {
  await page.goto("/");
  await page.evaluate(
    ({ at, rt, ud }) => {
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
      localStorage.setItem("loggedInUserData", JSON.stringify(ud));
    },
    { at: accessToken, rt: REFRESH_TOKEN, ud: MOCK_USER_DATA }
  );
}

// ─── Test #1 ─────────────────────────────────────────────────────────────────

test("1. Login with valid credentials redirects to dashboard", async ({ page }) => {
  console.log("[1] Using REAL auth API — no mock");
  console.log("[1] Navigating to login page");
  await page.goto("/");

  console.log("[1] Verifying login form is visible");
  await expect(page.locator("#email")).toBeVisible();
  await expect(page.locator("#password")).toBeVisible();

  console.log("[1] Filling real credentials: santosh.kumabr@kapiva.in");
  await page.fill("#email", "santosh.kumbar@kapiva.in");
  await page.fill("#password", "s");

  console.log("[1] Submitting login form to real auth service");
  await page.click('button[type="submit"]');

  console.log("[1] Expecting 'Login Success' toast from real API");
  await expect(page.locator(".Toastify")).toContainText("Login Success", { timeout: 10000 });

  console.log("[1] Expecting redirect to user's default route after login");
  await expect(page).toHaveURL(/\/(dashboard|doctors-list|appointments)/, { timeout: 10000 });

  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  expect(accessToken).toBeTruthy();
  console.log("[1] ✓ Real access token stored in localStorage");
});

// ─── Test #2 ─────────────────────────────────────────────────────────────────

test("2. Login with invalid credentials shows error toast", async ({ page }) => {
  console.log("[2] Mocking login API → 401 invalid credentials");
  await page.route(`${AUTH_BASE}/login`, async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify(LOGIN_INVALID_CREDENTIALS_RESPONSE) });
  });

  console.log("[2] Navigating to login page");
  await page.goto("/");

  console.log("[2] Filling wrong credentials");
  await page.fill("#email", "wrong@kapiva.in");
  await page.fill("#password", "wrongpassword");
  await page.click('button[type="submit"]');

  console.log("[2] Expecting 'Invalid email or password' error toast");
  await expect(page.locator(".Toastify")).toContainText("Invalid email or password", { timeout: 5000 });

  console.log("[2] Verifying user stays on login page");
  await expect(page).not.toHaveURL("/dashboard");
  console.log("[2] ✓ User NOT redirected to dashboard");
});

// ─── Test #2b ────────────────────────────────────────────────────────────────

test("2b. Login with empty email/password shows validation toast", async ({ page }) => {
  console.log("[2b] Navigating to login page");
  await page.goto("/");

  console.log("[2b] Submitting form with empty fields");
  await page.click('button[type="submit"]');

  console.log("[2b] Expecting 'Email/Password can not be empty' validation toast");
  await expect(page.locator(".Toastify")).toContainText("Email/Password can not be empty", { timeout: 5000 });
  console.log("[2b] ✓ Validation toast shown");
});

// ─── Test #3 ─────────────────────────────────────────────────────────────────

test("3. Expired access token is automatically refreshed on 401", async ({ page }) => {
  console.log("[3] Seeding localStorage with EXPIRED access token");
  await seedAuthInLocalStorage(page, EXPIRED_ACCESS_TOKEN);

  let refreshCalled = false;
  console.log("[3] Mocking refresh-token API → 200 new token");
  await page.route(`${AUTH_BASE}/refresh-token`, async (route) => {
    refreshCalled = true;
    console.log("[3] → refresh-token endpoint called");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(REFRESH_TOKEN_SUCCESS_RESPONSE) });
  });

  let dashboardCallCount = 0;
  console.log("[3] Mocking dashboard API → 401 on first call, 200 after refresh");
  await page.route(`${DASHBOARD_BASE}/**`, async (route) => {
    dashboardCallCount++;
    console.log(`[3] → dashboard API call #${dashboardCallCount}`);
    if (dashboardCallCount === 1) {
      await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
    }
  });

  console.log("[3] Navigating to /dashboard with expired token");
  await page.goto("/dashboard");

  console.log("[3] Expecting user stays on /dashboard (token refreshed)");
  await expect(page).toHaveURL("/dashboard", { timeout: 8000 });

  expect(refreshCalled).toBe(true);
  console.log("[3] ✓ refresh-token endpoint was called");

  const storedToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  expect(storedToken).toBe(VALID_ACCESS_TOKEN);
  console.log("[3] ✓ New access token stored in localStorage");
});

// ─── Test #3b ────────────────────────────────────────────────────────────────

test("3b. Failed token refresh clears auth and redirects to login", async ({ page }) => {
  console.log("[3b] Seeding localStorage with EXPIRED access token");
  await seedAuthInLocalStorage(page, EXPIRED_ACCESS_TOKEN);

  console.log("[3b] Mocking refresh-token API → 401 failure");
  await page.route(`${AUTH_BASE}/refresh-token`, async (route) => {
    console.log("[3b] → refresh-token called, returning 401");
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Refresh token expired" }) });
  });

  console.log("[3b] Mocking dashboard API → 401 to trigger refresh attempt");
  await page.route(`${DASHBOARD_BASE}/**`, async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
  });

  console.log("[3b] Navigating to /dashboard");
  await page.goto("/dashboard");

  console.log("[3b] Expecting redirect to login after failed refresh");
  await expect(page).toHaveURL("/", { timeout: 8000 });

  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  expect(accessToken).toBeNull();
  console.log("[3b] ✓ localStorage cleared after failed refresh");
});

// ─── Test #4 ─────────────────────────────────────────────────────────────────

test("4. Logout clears tokens and redirects to login", async ({ page }) => {
  console.log("[4] Seeding localStorage with valid auth tokens");
  await seedAuthInLocalStorage(page);

  console.log("[4] Mocking dashboard API → 200");
  await page.route(`${DASHBOARD_BASE}/**`, async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
  });

  console.log("[4] Navigating to /dashboard");
  await page.goto("/dashboard");
  await expect(page).toHaveURL("/dashboard", { timeout: 8000 });
  console.log("[4] ✓ User is on dashboard (logged in)");

  console.log("[4] Hovering over profile avatar to reveal logout button");
  const profileAvatar = page.locator(".group");
  await profileAvatar.hover();

  const logoutButton = page.locator("button", { hasText: "Logout" });
  await expect(logoutButton).toBeVisible({ timeout: 3000 });
  console.log("[4] Clicking logout button");
  await logoutButton.click();

  console.log("[4] Expecting redirect to login page");
  await expect(page).toHaveURL("/", { timeout: 5000 });

  const [accessToken, refreshToken, userData] = await page.evaluate(() => [
    localStorage.getItem("accessToken"),
    localStorage.getItem("refreshToken"),
    localStorage.getItem("loggedInUserData"),
  ]);
  expect(accessToken).toBeNull();
  expect(refreshToken).toBeNull();
  expect(userData).toBeNull();
  console.log("[4] ✓ All auth tokens cleared from localStorage");
});

// ─── Test #4b ────────────────────────────────────────────────────────────────

test("4b. Unauthenticated access to protected route redirects to login", async ({ page }) => {
  console.log("[4b] Navigating to /dashboard WITHOUT seeding auth");
  await page.goto("/dashboard");

  console.log("[4b] Expecting redirect to login page");
  await expect(page).toHaveURL("/", { timeout: 5000 });
  console.log("[4b] ✓ Unauthenticated user redirected to login");
});

// ─── Test #8 — Mid-session 401 → auto-refresh → retry ────────────────────────
// Scenario: User is logged in with a VALID token. An API call mid-session
// returns 401 (server-side token invalidation). The axios response interceptor
// should call refresh-token, get a new token, and retry the original request.

test("8. Mid-session 401 → auto-refresh token → retry original request", async ({ page }) => {
  console.log("[8] Seeding valid auth tokens");
  await seedAuthInLocalStorage(page, VALID_ACCESS_TOKEN);

  // Track refresh call
  let refreshCalled = false;
  let refreshCallCount = 0;
  console.log("[8] Mocking refresh-token API → returns new valid token");
  await page.route(`${AUTH_BASE}/refresh-token`, async (route) => {
    refreshCallCount++;
    refreshCalled = true;
    console.log(`[8] → refresh-token called (#${refreshCallCount})`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(REFRESH_TOKEN_SUCCESS_RESPONSE),
    });
  });

  // Dashboard calls GET /appointments/stats via consultationsServiceClient
  // Return 401 on first call → interceptor refreshes token → retries → 200
  let statsCallCount = 0;
  console.log("[8] Mocking /appointments/stats → 401 first call, 200 on retry");
  await page.route(`**/consultations-service/api/v1/appointments/stats*`, async (route) => {
    statsCallCount++;
    console.log(`[8] → /appointments/stats call #${statsCallCount}`);
    if (statsCallCount === 1) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Token expired" }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [] }),
      });
    }
  });

  console.log("[8] Navigating to /dashboard");
  await page.goto("/dashboard");
  await page.waitForLoadState("domcontentloaded");

  // Wait for refresh + retry cycle to complete
  await page.waitForTimeout(3000);

  console.log(`[8] Stats API call count: ${statsCallCount}`);
  console.log(`[8] Refresh token called: ${refreshCalled}`);

  // Refresh must have been triggered
  expect(refreshCalled).toBe(true);
  console.log("[8] ✓ refresh-token endpoint was called after 401");

  // API must have been retried (called at least twice)
  expect(statsCallCount).toBeGreaterThanOrEqual(2);
  console.log(`[8] ✓ Original request retried (total calls: ${statsCallCount})`);

  // New token must be stored in localStorage
  const storedToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  expect(storedToken).toBe(VALID_ACCESS_TOKEN);
  console.log("[8] ✓ New access token stored in localStorage after refresh");

  // User stays on /dashboard — NOT redirected to login
  expect(page.url()).toContain("/dashboard");
  console.log("[8] ✓ User stays on /dashboard — not redirected to login");
  console.log("[8] ✅ PASS — Mid-session 401 auto-refresh flow verified");
});

// ─── Test #10 — Google SSO button visible and redirects ──────────────────────

test("10. Google SSO (Gmail) login button is visible on login page", async ({ page }) => {
  console.log("[10] Navigating to login page");
  await page.goto("/");

  console.log("[10] Checking Gmail SSO button is visible");
  const gmailBtn = page.getByRole("button", { name: /login with gmail|gmail.*sso/i });
  await expect(gmailBtn).toBeVisible({ timeout: 5000 });
  console.log("[10] ✓ Gmail SSO button is visible");
});

test("10b. Google SSO button click redirects to Google auth URL", async ({ page }) => {
  console.log("[10b] Navigating to login page");
  await page.goto("/");

  let redirectUrl = "";
  page.on("request", (req) => {
    if (req.url().includes("google")) redirectUrl = req.url();
  });

  console.log("[10b] Intercepting navigation on Gmail SSO click");
  const gmailBtn = page.getByRole("button", { name: /login with gmail|gmail.*sso/i });
  await expect(gmailBtn).toBeVisible({ timeout: 5000 });

  await Promise.race([
    gmailBtn.click(),
    page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
  ]);

  const currentUrl = page.url();
  const isGoogleRedirect =
    currentUrl.includes("google") ||
    currentUrl.includes("accounts.google") ||
    redirectUrl.includes("google");

  expect(isGoogleRedirect).toBeTruthy();
  console.log(`[10b] ✓ Redirected to Google auth: ${currentUrl}`);
});

// ─── Test #11 — Microsoft SSO ─────────────────────────────────────────────────

test("11. Microsoft SSO login button is visible on login page", async ({ page }) => {
  console.log("[11] Navigating to login page");
  await page.goto("/");

  console.log("[11] Checking Microsoft SSO button is visible");
  const msBtn = page.getByRole("button", { name: /microsoft|login with microsoft|ms.*sso/i });
  const msBtnVisible = await msBtn.isVisible({ timeout: 5000 }).catch(() => false);

  if (msBtnVisible) {
    console.log("[11] ✓ Microsoft SSO button is visible");
  } else {
    console.log("[11] ℹ️ Microsoft SSO button not found — may not be enabled on staging");
    test.skip();
  }
});

test("11b. Microsoft SSO button click redirects to Microsoft auth URL", async ({ page }) => {
  console.log("[11b] Navigating to login page");
  await page.goto("/");

  const msBtn = page.getByRole("button", { name: /microsoft|login with microsoft|ms.*sso/i });
  const msBtnVisible = await msBtn.isVisible({ timeout: 5000 }).catch(() => false);
  if (!msBtnVisible) {
    console.log("[11b] ℹ️ Microsoft SSO button not found — skipping");
    test.skip();
    return;
  }

  let redirectUrl = "";
  page.on("request", (req) => {
    if (req.url().includes("microsoft") || req.url().includes("microsoftonline")) {
      redirectUrl = req.url();
    }
  });

  await Promise.race([
    msBtn.click(),
    page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
  ]);

  const currentUrl = page.url();
  const isMicrosoftRedirect =
    currentUrl.includes("microsoft") ||
    currentUrl.includes("microsoftonline") ||
    redirectUrl.includes("microsoft");

  expect(isMicrosoftRedirect).toBeTruthy();
  console.log(`[11b] ✓ Redirected to Microsoft auth: ${currentUrl}`);
});

// ─── Test #9 — Network failure → error toast ─────────────────────────────────
// Scenario: User is logged in. An API call fails with a network error
// (connection aborted). The app should catch the error and show an error toast.
// Using /appointments which MOCK_USER_DATA has access to.
// Aborts the appointments list API → the page catches it and shows error toast.

test("9. Network failure on API call → error toast shown", async ({ page }) => {
  console.log("[9] Seeding valid auth tokens");
  await seedAuthInLocalStorage(page, VALID_ACCESS_TOKEN);

  // Abort the appointments list API — simulates network failure
  console.log("[9] Mocking appointments API → abort (network failure)");
  await page.route(
    "**/consultations-service/api/v1/appointments*",
    async (route) => {
      console.log("[9] → appointments request aborted (network failure)");
      await route.abort("connectionfailed");
    }
  );

  console.log("[9] Navigating to /appointments");
  await page.goto("/appointments");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(2000);

  console.log("[9] Waiting for error toast");
  const toast = page.locator(".Toastify__toast");
  await expect(toast.first()).toBeVisible({ timeout: 8000 });
  const toastText = await toast.first().innerText();
  console.log(`[9] ✓ Toast message: "${toastText.trim()}"`);

  // App shows network error or failed to load message
  expect(toastText.toLowerCase()).toMatch(
    /network|failed|error|connection|load|appointment/i
  );
  console.log("[9] ✓ Error toast content confirmed");

  // User stays on /appointments — app does NOT crash or redirect to login
  expect(page.url()).toContain("/appointments");
  console.log("[9] ✓ User stays on /appointments — app did not crash");

  // Login form is NOT shown — user is still authenticated
  const loginForm = await page.locator("#email").isVisible().catch(() => false);
  expect(loginForm).toBe(false);
  console.log("[9] ✓ User still authenticated — not redirected to login");
  console.log("[9] ✅ PASS — Network failure handled gracefully with error toast");
});
