import { test, expect, Page } from "@playwright/test";
import { VALID_ACCESS_TOKEN, REFRESH_TOKEN } from "../../fixtures/mockData";

// ─── API patterns ─────────────────────────────────────────────────────────────
const WORKING_HOURS_API     = "**/consultations-service/api/v1/working-hours*";
const NON_AVAILABILITIES_API = "**/consultations-service/api/v1/non-availabilities*";
const CONCERN_API            = "**/consultations-service/api/v1/consultant-help-requests*";

// ─── User with help:create access ─────────────────────────────────────────────
function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    code,
    frontendRoute,
    actions: actions.map((actionCode) => ({ actionCode, hasPermission: true })),
  };
}

const HELP_USER_DATA = {
  userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  firstName: "Test",
  lastName: "Staff",
  email: "staff@kapiva.in",
  phone: "9876543210",
  profilePicture: "",
  isActive: true,
  therapyId: "",
  createdAt: "",
  updatedAt: "",
  role: {
    name: "Admin",
    key: "admin",
    active: true,
    defaultRoute: "/help",
    permissions: {
      features: [
        makeFeature("help", "/help", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

// ─── Mock responses ───────────────────────────────────────────────────────────

// Working hours — one active day (Monday = dayOfWeek 1)
const MOCK_WORKING_HOURS_RESPONSE = {
  success: true,
  data: [
    {
      id: "wh-001",
      consultantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      dayOfWeek: 1,
      startTime: "03:30:00", // 09:00 IST
      endTime: "11:30:00",   // 17:00 IST
      isActive: true,
      isApproved: true,
    },
  ],
};

const MOCK_NON_AVAILABILITIES_RESPONSE = {
  success: true,
  data: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedAuth(page: Page) {
  await page.goto("/");
  await page.evaluate(
    ({ at, rt, ud }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
      localStorage.setItem("loggedInUserData", JSON.stringify(ud));
    },
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: HELP_USER_DATA }
  );
  await page.waitForTimeout(300);
}

async function mockPageLoadAPIs(page: Page) {
  await page.route(WORKING_HOURS_API, async (route) => {
    if (route.request().method() === "GET") {
      console.log("  → GET working-hours called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_WORKING_HOURS_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });
  await page.route(NON_AVAILABILITIES_API, async (route) => {
    if (route.request().method() === "GET") {
      console.log("  → GET non-availabilities called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NON_AVAILABILITIES_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });
}

// ─── Test 1 ───────────────────────────────────────────────────────────────────

test("1. Help page loads with all 4 sections visible", async ({ page }) => {
  console.log("[1] Seeding auth and mocking load APIs");
  await seedAuth(page);
  await mockPageLoadAPIs(page);

  console.log("[1] Navigating to /help");
  await page.goto("/help");
  await page.waitForLoadState("domcontentloaded");

  console.log("[1] Verifying 'Help' heading visible");
  await expect(page.locator("text=Help").first()).toBeVisible({ timeout: 8000 });

  console.log("[1] Verifying 'Submit Concern' section visible");
  await expect(page.locator("text=Submit Concern")).toBeVisible({ timeout: 5000 });

  console.log("[1] Verifying 'Leave Request' section visible");
  await expect(page.locator("text=Leave Request")).toBeVisible();

  console.log("[1] Verifying 'Break Request' section visible");
  await expect(page.locator("text=Break Request")).toBeVisible();

  console.log("[1] Verifying 'Working Hours' section visible");
  await expect(page.locator("text=Working Hours")).toBeVisible();

  console.log("[1] ✓ All 4 sections rendered on help page");
});

// ─── Test 2 ───────────────────────────────────────────────────────────────────

test("2. Submit concern form shows success toast", async ({ page }) => {
  console.log("[2] Seeding auth and mocking APIs");
  await seedAuth(page);
  await mockPageLoadAPIs(page);

  let concernCalled = false;
  await page.route(CONCERN_API, async (route) => {
    if (route.request().method() === "POST") {
      concernCalled = true;
      console.log("  → POST consultant-help-requests called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, message: "Concern posted successfully" }),
      });
    } else {
      await route.continue();
    }
  });

  console.log("[2] Navigating to /help");
  await page.goto("/help");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("text=Submit Concern")).toBeVisible({ timeout: 8000 });

  console.log("[2] Filling concern textarea");
  const textarea = page.locator('textarea[placeholder="Issues and concerns..."]');
  await expect(textarea).toBeVisible({ timeout: 5000 });
  await textarea.fill("Test concern message for automated testing");

  console.log("[2] Clicking submit button");
  const submitBtn = page.locator("text=Submit Concern").locator("..").locator("..").getByRole("button").first();
  await submitBtn.click();

  console.log("[2] Expecting success toast");
  await expect(page.locator(".Toastify")).toContainText("Concern posted successfully", { timeout: 8000 });
  expect(concernCalled).toBe(true);
  console.log("[2] ✓ Concern submitted and success toast shown");
});

// ─── Test 3 ───────────────────────────────────────────────────────────────────

test("3. Submit leave request (one-off) shows success toast", async ({ page }) => {
  console.log("[3] Seeding auth and mocking APIs");
  await seedAuth(page);
  await mockPageLoadAPIs(page);

  let leaveCalled = false;
  await page.route(NON_AVAILABILITIES_API, async (route) => {
    if (route.request().method() === "POST") {
      leaveCalled = true;
      console.log("  → POST non-availabilities (leave) called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    } else if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_NON_AVAILABILITIES_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });

  console.log("[3] Navigating to /help");
  await page.goto("/help");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("text=Leave Request")).toBeVisible({ timeout: 8000 });

  console.log("[3] Filling start date");
  const startDateInput = page.locator("text=Leave Request").locator("..").locator("..").locator('input[type="date"]').first();
  await expect(startDateInput).toBeVisible({ timeout: 5000 });
  await startDateInput.fill("2026-04-15");

  console.log("[3] Filling end date");
  const endDateInput = page.locator("text=Leave Request").locator("..").locator("..").locator('input[type="date"]').nth(1);
  await endDateInput.fill("2026-04-16");

  console.log("[3] Filling reason");
  const reasonInput = page.locator("#leaveReason");
  await expect(reasonInput).toBeVisible({ timeout: 5000 });
  await reasonInput.fill("Personal leave");

  console.log("[3] Clicking submit — scoped to the form containing #leaveReason");
  const submitBtn = page.locator("form").filter({ has: page.locator("#leaveReason") }).locator("#submit");
  await submitBtn.click();

  console.log("[3] Expecting success toast");
  await expect(page.locator(".Toastify")).toContainText("Leave request submitted successfully", { timeout: 8000 });
  expect(leaveCalled).toBe(true);
  console.log("[3] ✓ Leave request submitted successfully");
});

// ─── Test 4 ───────────────────────────────────────────────────────────────────

test("4. Working Hours section renders loaded day rows", async ({ page }) => {
  console.log("[4] Seeding auth and mocking working hours API");
  await seedAuth(page);
  await mockPageLoadAPIs(page);

  console.log("[4] Navigating to /help");
  await page.goto("/help");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000); // allow useWorkingHours hook to load

  console.log("[4] Verifying 'Working Hours' heading visible");
  await expect(page.locator("text=Working Hours")).toBeVisible({ timeout: 8000 });

  console.log("[4] Verifying Monday row is rendered (from mock working hours data)");
  await expect(page.locator("text=Monday")).toBeVisible({ timeout: 5000 });
  console.log("[4] ✓ Working Hours section shows loaded day rows");
});
