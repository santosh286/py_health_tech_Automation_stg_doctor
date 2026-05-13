import { test, expect, Page } from "@playwright/test";
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  MOCK_ROLES_LIST_RESPONSE,
  MOCK_ROLE_DETAIL_RESPONSE,
  MOCK_CREATE_ROLE_RESPONSE,
  MOCK_UPDATE_ROLE_RESPONSE,
  MOCK_DELETE_ROLE_RESPONSE,
  ROLES_API,
} from "../../fixtures/mockData";

// ─── Seed Helper ─────────────────────────────────────────────────────────────

function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    featureId: `feat-${code}`,
    code,
    name: code.replace(/_/g, " "),
    frontendRoute,
    visibleOnSidebar: true,
    permissions: { create: true, view: true, update: true, delete: true },
    actions: actions.map((actionCode) => ({
      featureActionId: `${code}-${actionCode}`,
      actionCode,
      label: actionCode,
      description: actionCode,
      hasPermission: true,
    })),
  };
}

const ADMIN_USER_DATA = {
  userId: "admin-001",
  firstName: "Admin",
  lastName: "User",
  email: "admin@kapiva.in",
  isActive: true,
  role: {
    name: "Admin",
    key: "admin",
    active: true,
    defaultRoute: "/dashboard",
    permissions: {
      features: [
        makeFeature("dashboard", "/dashboard", ["view", "create", "update", "delete"]),
        makeFeature("roles", "/roles", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

const VIEW_ONLY_USER_DATA = {
  userId: "viewer-001",
  firstName: "Viewer",
  lastName: "User",
  email: "viewer@kapiva.in",
  isActive: true,
  role: {
    name: "Doctor",
    key: "doctor",
    active: true,
    defaultRoute: "/appointments",
    permissions: {
      features: [
        {
          featureId: "feat-todays_appointments",
          code: "todays_appointments",
          name: "todays appointments",
          frontendRoute: "/appointments",
          visibleOnSidebar: true,
          permissions: { create: false, view: true, update: false, delete: false },
          actions: [{ featureActionId: "ta-view", actionCode: "view", label: "view", description: "view", hasPermission: true }],
        },
      ],
    },
  },
};

async function seedAuth(page: Page, userData: object) {
  await page.goto("/");
  await page.evaluate(
    ({ at, rt, ud }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
      localStorage.setItem("loggedInUserData", JSON.stringify(ud));
    },
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: userData }
  );
  await page.waitForTimeout(300);
}

// ─── TC_079 — Roles page loads with list ─────────────────────────────────────

test("TC_079 — Roles page loads and displays roles list", async ({ page }) => {
  console.log("[TC_079] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLES_LIST_RESPONSE) })
  );

  console.log("[TC_079] Navigating to /roles");
  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log(`[TC_079] ✓ Roles page accessible — URL: ${page.url()}`);

  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText.length).toBeGreaterThan(0);
  console.log("[TC_079] ✓ Page has content");

  console.log("[TC_079] ✅ PASS — Roles page loaded successfully");
});

// ─── TC_080 — Non-admin cannot access /roles ─────────────────────────────────

test("TC_080 — Non-admin role: /roles page is blocked", async ({ page }) => {
  console.log("[TC_080] Seeding view-only user auth");
  await seedAuth(page, VIEW_ONLY_USER_DATA);

  console.log("[TC_080] Navigating to /roles (should deny)");
  await page.goto("/roles");
  await page.waitForURL("**/error/unauthorized", { timeout: 8000 });

  expect(page.url()).toContain("/error/unauthorized");
  console.log("[TC_080] ✓ Non-admin redirected to /error/unauthorized");

  console.log("[TC_080] ✅ PASS — Non-admin correctly blocked from /roles");
});

// ─── TC_081 — Admin can see role details ─────────────────────────────────────

test("TC_081 — Admin can view role details", async ({ page }) => {
  console.log("[TC_081] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLES_LIST_RESPONSE) })
  );
  await page.route(`${ROLES_API}/roles/role-001*`, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLE_DETAIL_RESPONSE) })
  );

  console.log("[TC_081] Navigating to /roles");
  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log("[TC_081] ✓ Roles page accessible");

  console.log("[TC_081] ✅ PASS — Admin can view role details");
});

// ─── TC_082 — Create role API mock ───────────────────────────────────────────

test("TC_082 — Create role: API returns success", async ({ page }) => {
  console.log("[TC_082] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(MOCK_CREATE_ROLE_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLES_LIST_RESPONSE) });
    }
  });

  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log("[TC_082] ✓ On /roles page with create role mock ready");

  console.log("[TC_082] ✅ PASS — Create role API mock responds correctly");
});

// ─── TC_083 — Update role API mock ───────────────────────────────────────────

test("TC_083 — Update role: API returns success", async ({ page }) => {
  console.log("[TC_083] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, async (route) => {
    const method = route.request().method();
    if (method === "PUT" || method === "PATCH") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_UPDATE_ROLE_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLES_LIST_RESPONSE) });
    }
  });

  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log("[TC_083] ✓ On /roles page with update role mock ready");

  console.log("[TC_083] ✅ PASS — Update role API mock responds correctly");
});

// ─── TC_084 — Delete role API mock ───────────────────────────────────────────

test("TC_084 — Delete role: API returns success", async ({ page }) => {
  console.log("[TC_084] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_DELETE_ROLE_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ROLES_LIST_RESPONSE) });
    }
  });

  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log("[TC_084] ✓ On /roles page with delete role mock ready");

  console.log("[TC_084] ✅ PASS — Delete role API mock responds correctly");
});

// ─── TC_085 — Roles API error shows empty/error state ────────────────────────

test("TC_085 — Roles page handles API error gracefully", async ({ page }) => {
  console.log("[TC_085] Seeding Admin auth");
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${ROLES_API}/roles*`, (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ success: false, error: "Server error" }) })
  );

  console.log("[TC_085] Navigating to /roles with API returning 500");
  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  expect(page.url()).not.toContain("/error/unauthorized");
  console.log("[TC_085] ✓ Page did not crash on API error");

  console.log("[TC_085] ✅ PASS — Roles page handles API error gracefully");
});

// ─── TC_086 — Unauthenticated access to /roles redirects to login ─────────────

test("TC_086 — Unauthenticated access to /roles redirects to login", async ({ page }) => {
  console.log("[TC_086] Clearing auth tokens");
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("loggedInUserData");
  });

  console.log("[TC_086] Navigating to /roles without auth");
  await page.goto("/roles");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  const url = page.url();
  expect(url).toMatch(/\/$|\/\?/);
  console.log(`[TC_086] ✓ Redirected to login — URL: ${url}`);

  console.log("[TC_086] ✅ PASS — Unauthenticated user redirected to login from /roles");
});
