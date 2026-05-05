import { test, expect, Page } from "@playwright/test";
import { VALID_ACCESS_TOKEN, REFRESH_TOKEN } from "../../fixtures/mockData";

// Note: /bulk-book is currently a stub page ("BulkBook" placeholder text).
// These tests verify the page is accessible and renders without errors.
// Full tests to be added once the feature is implemented.

function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    code,
    frontendRoute,
    actions: actions.map((actionCode) => ({ actionCode, hasPermission: true })),
  };
}

const BULK_BOOK_USER_DATA = {
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
    defaultRoute: "/bulk-book",
    permissions: {
      features: [
        makeFeature("bulk_book", "/bulk-book", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

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
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: BULK_BOOK_USER_DATA }
  );
  await page.waitForTimeout(300);
}

// ─── Test 1 ───────────────────────────────────────────────────────────────────

test("1. Bulk Book page loads without errors", async ({ page }) => {
  console.log("[1] Seeding auth");
  await seedAuth(page);

  console.log("[1] Navigating to /bulk-book");
  await page.goto("/bulk-book");
  await page.waitForLoadState("domcontentloaded");

  console.log("[1] Verifying page renders (stub content visible)");
  await expect(page.locator("text=BulkBook")).toBeVisible({ timeout: 8000 });

  console.log("[1] Verifying user is NOT redirected to login");
  expect(page.url()).toContain("/bulk-book");

  console.log("[1] Verifying no JS crash (login form not shown)");
  const loginForm = await page.locator("#email").isVisible().catch(() => false);
  expect(loginForm).toBe(false);

  console.log("[1] ✓ Bulk Book page accessible and renders stub content");
});

// ─── Test 2 ───────────────────────────────────────────────────────────────────

test("2. Bulk Book page is not accessible without auth", async ({ page }) => {
  console.log("[2] Navigating to /bulk-book WITHOUT seeding auth");
  await page.goto("/bulk-book");

  console.log("[2] Expecting redirect to login page");
  await expect(page).toHaveURL("/", { timeout: 5000 });
  console.log("[2] ✓ Unauthenticated user redirected to login");
});
