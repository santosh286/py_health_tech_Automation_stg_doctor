import { test, expect, Page } from "@playwright/test";
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  MOCK_USER_DATA,
  CONSULT_API,
  DASHBOARD_API,
  MOCK_CONSULTANT_PROFILES_LIST_RESPONSE,
  MOCK_CONSULTANT_PROFILE_FULL,
  MOCK_CONSULTANT_PROFILE_FULL_2,
  MOCK_THERAPY_CAPABILITY_RESPONSE,
  MOCK_THERAPY_CAPABILITY_WITH_DRAFT_PLANS,
  MOCK_ACTIVE_THERAPIES_RESPONSE,
  MOCK_UPDATE_PROFILE_SUCCESS_RESPONSE,
  MOCK_UPDATE_THERAPY_SUCCESS_RESPONSE,
  MOCK_TRANSITION_PREVIEW_RESPONSE,
  MOCK_ACTIVATE_PLANS_SUCCESS_RESPONSE,
  MOCK_CANCEL_TRANSITION_PLANS_RESPONSE,
  MOCK_TOGGLE_ACTIVE_SUCCESS_RESPONSE,
  MOCK_TOGGLE_INACTIVE_SUCCESS_RESPONSE,
} from "../../fixtures/mockData";

// ─── Mock user with doctors_list permissions ──────────────────────────────────

function makeDoctorsListFeature(canUpdate = true) {
  return {
    code: "doctors_list",
    frontendRoute: "/doctors-list",
    actions: [
      { actionCode: "view", hasPermission: true },
      { actionCode: "create", hasPermission: true },
      { actionCode: "update", hasPermission: canUpdate },
      { actionCode: "delete", hasPermission: true },
    ],
  };
}

function getDoctorsListUserData(canUpdate = true) {
  return {
    ...MOCK_USER_DATA,
    role: {
      ...MOCK_USER_DATA.role,
      permissions: {
        features: [
          ...MOCK_USER_DATA.role.permissions.features,
          makeDoctorsListFeature(canUpdate),
        ],
      },
    },
  };
}

function getDoctorsListUserDataNoView() {
  return {
    ...MOCK_USER_DATA,
    // no doctors_list feature at all → AccessController denies view
    role: {
      ...MOCK_USER_DATA.role,
      permissions: {
        features: MOCK_USER_DATA.role.permissions.features.filter(
          (f: { code: string }) => f.code !== "doctors_list"
        ),
      },
    },
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function seedAuth(page: Page, userData = getDoctorsListUserData()) {
  await page.goto("/");
  await page.evaluate(
    ({ at, rt, ud }) => {
      localStorage.setItem("accessToken", at);
      localStorage.setItem("refreshToken", rt);
      localStorage.setItem("loggedInUserData", JSON.stringify(ud));
    },
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: userData }
  );
}

/**
 * Common API mocks — global fallback first (LIFO: registered last = highest priority).
 * Specific endpoint mocks must be registered AFTER this call.
 */
async function mockCommonApis(page: Page) {
  // Global fallback — absorbs unmocked API calls to prevent real network
  await page.route("**/*", (route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes("/api/") || url.includes("-service/")) {
      console.log(`⚠ FALLBACK: ${method} ${url.replace(/https?:\/\/[^/]+/, "")}`);
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: {} }),
      });
    } else {
      route.continue();
    }
  });

  await page.route(`${DASHBOARD_API}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    })
  );

  await page.route(`${CONSULT_API}/**`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [] }),
    })
  );

  await page.route("**/events-middleware*/**", (route) => route.abort());
}

/**
 * Default consultant-profiles list mock (2 consultants).
 * Call AFTER mockCommonApis to override the catch-all.
 */
async function mockProfilesList(page: Page, response = MOCK_CONSULTANT_PROFILES_LIST_RESPONSE) {
  await page.route(`${CONSULT_API}/consultant-profiles`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(response),
    })
  );
}

/**
 * Mock therapy-capability GET for a consultant.
 */
async function mockTherapyCapability(
  page: Page,
  consultantId: string,
  response = MOCK_THERAPY_CAPABILITY_RESPONSE
) {
  await page.route(
    `${CONSULT_API}/consultant-capabilities/consultant/${consultantId}/therapy`,
    (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(response),
        });
      } else {
        route.continue();
      }
    }
  );
}

/**
 * Mock active therapies list for the therapy dropdown.
 */
async function mockActiveTherapies(page: Page) {
  await page.route(`${CONSULT_API}/therapies/active*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ACTIVE_THERAPIES_RESPONSE),
    })
  );
  // Also match the general therapies endpoint used in some builds
  await page.route(`${CONSULT_API}/therapies*`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ACTIVE_THERAPIES_RESPONSE),
    })
  );
}

async function goToDoctorsList(page: Page) {
  await page.goto("/doctors-list");
  await page.waitForLoadState("domcontentloaded");
}

/**
 * Click the Edit button in the row matching the given consultant name.
 */
async function openEditModal(page: Page, name = "Smith Kumar") {
  const row = page.locator("tr", { hasText: name });
  await row.getByRole("button", { name: /edit/i }).click();
  // Wait for modal heading
  await expect(page.getByText("Edit Consultant")).toBeVisible({ timeout: 8000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe("Doctors List", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page);
    await mockCommonApis(page);
  });

  // ─── List Page ─────────────────────────────────────────────────────────────

  test.describe("List Page", () => {
    test("DL_01: Load page — table renders consultant rows", async ({ page }) => {
      await mockProfilesList(page);
      await goToDoctorsList(page);

      // Both consultants visible
      await expect(page.getByText("Smith Kumar")).toBeVisible({ timeout: 8000 });
      await expect(page.getByText("Jane Doe")).toBeVisible();

      // Column headers
      await expect(page.getByText("Consultant ID")).toBeVisible();
      await expect(page.getByText("Name")).toBeVisible();
      await expect(page.getByText("Therapy")).toBeVisible();
      await expect(page.getByText("Email Address")).toBeVisible();
      await expect(page.getByText("Phone")).toBeVisible();
      await expect(page.getByText("Actions")).toBeVisible();

      // org ID and email in first row
      await expect(page.getByText("org-001")).toBeVisible();
      await expect(page.getByText("smith@kapiva.in")).toBeVisible();
    });

    test("DL_02: Empty state — shows no rows when API returns []", async ({ page }) => {
      await mockProfilesList(page, { success: true, data: [] });
      await goToDoctorsList(page);

      // Neither consultant should appear
      await expect(page.getByText("Smith Kumar")).not.toBeVisible();
      await expect(page.getByText("Jane Doe")).not.toBeVisible();
    });

    test("DL_03: Error state — shows toast on API 500", async ({ page }) => {
      await page.route(`${CONSULT_API}/consultant-profiles`, (route) =>
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: { code: "SERVER_ERROR" } }),
        })
      );
      await goToDoctorsList(page);

      // Should display an error toast
      await expect(
        page.getByText(/server error|failed to load/i)
      ).toBeVisible({ timeout: 8000 });
    });

    test("DL_04: Therapy badge visible in row", async ({ page }) => {
      await mockProfilesList(page);
      await goToDoctorsList(page);

      // Nutrition badge appears at least once
      const nutritionBadges = page.getByText("Nutrition");
      await expect(nutritionBadges.first()).toBeVisible({ timeout: 8000 });
    });

    test("DL_05: Pagination controls present when list has > 20 rows", async ({ page }) => {
      // Build 21 consultant profiles
      const manyConsultants = Array.from({ length: 21 }, (_, i) => ({
        ...MOCK_CONSULTANT_PROFILE_FULL,
        consultantId: `c-${String(i + 1).padStart(3, "0")}`,
        organizationId: `org-${String(i + 1).padStart(3, "0")}`,
        firstName: `Consultant${i + 1}`,
        lastName: "Test",
        email: `consultant${i + 1}@kapiva.in`,
        phone: `90000000${String(i + 1).padStart(2, "0")}`,
      }));

      await mockProfilesList(page, { success: true, data: manyConsultants });
      await goToDoctorsList(page);

      // Should show first 20 rows (react-data-table-component paginationPerPage=20)
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(20, { timeout: 8000 });

      // Pagination navigation should exist
      await expect(
        page.locator('[aria-label="Next Page"]').or(
          page.getByRole("button", { name: /next page/i })
        )
      ).toBeVisible();
    });
  });

  // ─── Access Control ────────────────────────────────────────────────────────

  test.describe("Access Control", () => {
    test("DL_06: Edit button visible for user with update permission", async ({ page }) => {
      await mockProfilesList(page);
      await goToDoctorsList(page);

      const editButtons = page.getByRole("button", { name: /edit/i });
      await expect(editButtons.first()).toBeVisible({ timeout: 8000 });
    });

    test("DL_07: Edit button hidden for user without update permission", async ({ page }) => {
      // Override auth with view-only user
      await page.evaluate(
        ({ at, rt, ud }) => {
          localStorage.setItem("accessToken", at);
          localStorage.setItem("refreshToken", rt);
          localStorage.setItem("loggedInUserData", JSON.stringify(ud));
        },
        {
          at: VALID_ACCESS_TOKEN,
          rt: REFRESH_TOKEN,
          ud: getDoctorsListUserData(false), // canUpdate = false
        }
      );
      await mockProfilesList(page);
      await goToDoctorsList(page);

      await expect(page.getByText("Smith Kumar")).toBeVisible({ timeout: 8000 });
      // No Edit buttons should appear
      await expect(page.getByRole("button", { name: /edit/i })).not.toBeVisible();
    });

    test("DL_08: Availability panel not rendered when user has no doctors_list feature", async ({
      page,
    }) => {
      await page.evaluate(
        ({ at, rt, ud }) => {
          localStorage.setItem("accessToken", at);
          localStorage.setItem("refreshToken", rt);
          localStorage.setItem("loggedInUserData", JSON.stringify(ud));
        },
        {
          at: VALID_ACCESS_TOKEN,
          rt: REFRESH_TOKEN,
          ud: getDoctorsListUserDataNoView(),
        }
      );
      await mockProfilesList(page);
      await goToDoctorsList(page);

      // The "Availability" toggle button should not render
      await expect(page.getByText("Availability")).not.toBeVisible({ timeout: 5000 });
    });
  });

  // ─── Edit Modal — Profile Tab ───────────────────────────────────────────────

  test.describe("Edit Modal — Profile Tab", () => {
    test.beforeEach(async ({ page }) => {
      await mockProfilesList(page);
      await mockTherapyCapability(page, "c-001");
      await mockActiveTherapies(page);
    });

    test("DL_09: Open Edit — modal opens with consultant data pre-filled", async ({ page }) => {
      await goToDoctorsList(page);
      await openEditModal(page);

      // Profile Information tab is active by default
      await expect(page.getByRole("button", { name: "Profile Information" })).toBeVisible();

      // First name pre-filled
      const firstNameInput = page.getByLabel(/first name/i);
      await expect(firstNameInput).toHaveValue("Smith");

      // Last name pre-filled
      const lastNameInput = page.getByLabel(/last name/i);
      await expect(lastNameInput).toHaveValue("Kumar");

      // Email is read-only and shows correct value
      await expect(page.getByText("smith@kapiva.in")).toBeVisible();

      // Active checkbox is checked (consultant isActive = true)
      const activeCheckbox = page.getByRole("checkbox", { name: /active/i });
      await expect(activeCheckbox).toBeChecked();
    });

    test("DL_10: Save profile — PUT request sent with updated firstName", async ({ page }) => {
      let capturedBody: Record<string, unknown> = {};

      await page.route(`${CONSULT_API}/consultant-profiles/c-001`, (route) => {
        if (route.request().method() === "PUT") {
          capturedBody = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_UPDATE_PROFILE_SUCCESS_RESPONSE),
          });
        } else {
          route.continue();
        }
      });

      await goToDoctorsList(page);
      await openEditModal(page);

      // Change first name
      const firstNameInput = page.getByLabel(/first name/i);
      await firstNameInput.clear();
      await firstNameInput.fill("NewName");

      // Submit
      const saveBtn = page.getByRole("button", { name: /save/i });
      await saveBtn.click();

      // PUT was called with updated value
      await expect(async () => {
        expect(capturedBody.firstName).toBe("NewName");
      }).toPass({ timeout: 5000 });

      // Success toast
      await expect(
        page.getByText(/updated successfully|saved|success/i)
      ).toBeVisible({ timeout: 8000 });

      // Modal closed
      await expect(page.getByText("Edit Consultant")).not.toBeVisible({ timeout: 5000 });
    });

    test("DL_11: Validation — empty firstName shows error and blocks PUT", async ({ page }) => {
      let putCalled = false;
      await page.route(`${CONSULT_API}/consultant-profiles/c-001`, (route) => {
        if (route.request().method() === "PUT") {
          putCalled = true;
        }
        route.continue();
      });

      await goToDoctorsList(page);
      await openEditModal(page);

      // Clear first name
      const firstNameInput = page.getByLabel(/first name/i);
      await firstNameInput.clear();

      // Try to save
      await page.getByRole("button", { name: /save/i }).click();

      // Validation error should appear
      await expect(
        page.getByText(/required|cannot be empty|first name/i)
      ).toBeVisible({ timeout: 5000 });

      // PUT must not have been fired
      expect(putCalled).toBe(false);
    });

    test("DL_12: Deactivate consultant — PUT body contains isActive false", async ({ page }) => {
      let capturedBody: Record<string, unknown> = {};

      await page.route(`${CONSULT_API}/consultant-profiles/c-001`, (route) => {
        if (route.request().method() === "PUT") {
          capturedBody = JSON.parse(route.request().postData() || "{}");
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_UPDATE_PROFILE_SUCCESS_RESPONSE),
          });
        } else {
          route.continue();
        }
      });

      await goToDoctorsList(page);
      await openEditModal(page);

      // Uncheck Active
      const activeCheckbox = page.getByRole("checkbox", { name: /active/i });
      await expect(activeCheckbox).toBeChecked();
      await activeCheckbox.uncheck();

      await page.getByRole("button", { name: /save/i }).click();

      await expect(async () => {
        expect(capturedBody.isActive).toBe(false);
      }).toPass({ timeout: 5000 });
    });

    test("DL_13: Close modal — modal disappears without saving", async ({ page }) => {
      let putCalled = false;
      await page.route(`${CONSULT_API}/consultant-profiles/c-001`, (route) => {
        if (route.request().method() === "PUT") putCalled = true;
        route.continue();
      });

      await goToDoctorsList(page);
      await openEditModal(page);

      // Click X or Cancel to close
      const closeBtn = page
        .locator('[role="dialog"]')
        .getByRole("button", { name: /close|cancel|×/i })
        .first();
      await closeBtn.click();

      await expect(page.getByText("Edit Consultant")).not.toBeVisible({ timeout: 5000 });
      expect(putCalled).toBe(false);
    });
  });

  // ─── Edit Modal — Therapy Tab ───────────────────────────────────────────────

  test.describe("Edit Modal — Therapy Tab", () => {
    test.beforeEach(async ({ page }) => {
      await mockProfilesList(page);
      await mockTherapyCapability(page, "c-001");
      await mockActiveTherapies(page);
    });

    test("DL_14: Shows current therapy and scope on Therapy tab", async ({ page }) => {
      await goToDoctorsList(page);
      await openEditModal(page);

      // Switch to Therapy Management tab
      await page.getByRole("button", { name: "Therapy Management" }).click();

      // Current therapy displayed
      await expect(page.getByText("Nutrition")).toBeVisible({ timeout: 8000 });

      // Scope displayed (BOTH)
      await expect(page.getByText("BOTH")).toBeVisible();
    });

    test("DL_15: Change therapy — PUT therapy endpoint called with new therapyId", async ({
      page,
    }) => {
      let capturedBody: Record<string, unknown> = {};

      await page.route(
        `${CONSULT_API}/consultant-capabilities/consultant/c-001/therapy`,
        (route) => {
          if (route.request().method() === "PUT") {
            capturedBody = JSON.parse(route.request().postData() || "{}");
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_UPDATE_THERAPY_SUCCESS_RESPONSE),
            });
          } else {
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_THERAPY_CAPABILITY_RESPONSE),
            });
          }
        }
      );

      await goToDoctorsList(page);
      await openEditModal(page);
      await page.getByRole("button", { name: "Therapy Management" }).click();

      // Select Yoga from the therapy dropdown
      // react-select: click the control then pick option by text
      const therapyControl = page.locator('[class*="control"]').first();
      await therapyControl.click();
      await page.getByText("Yoga").click();

      await page.getByRole("button", { name: /save/i }).click();

      await expect(async () => {
        expect(capturedBody.therapyId).toBe("t-002");
      }).toPass({ timeout: 5000 });

      await expect(
        page.getByText(/updated successfully|saved|success/i)
      ).toBeVisible({ timeout: 8000 });
    });

    test("DL_16: Blocked by DRAFT plans — shows error, does not submit", async ({ page }) => {
      // Override capability mock to return DRAFT plans
      await page.route(
        `${CONSULT_API}/consultant-capabilities/consultant/c-001/therapy`,
        (route) => {
          if (route.request().method() === "GET") {
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_THERAPY_CAPABILITY_WITH_DRAFT_PLANS),
            });
          } else {
            route.continue();
          }
        }
      );

      let putCalled = false;
      await page.route(
        `${CONSULT_API}/consultant-capabilities/consultant/c-001/therapy`,
        (route) => {
          if (route.request().method() === "PUT") putCalled = true;
          route.continue();
        }
      );

      await goToDoctorsList(page);
      await openEditModal(page);
      await page.getByRole("button", { name: "Therapy Management" }).click();

      // The page should show an alert about existing plans
      await expect(
        page.getByText(/draft|transition plan|cannot change/i)
      ).toBeVisible({ timeout: 8000 });

      expect(putCalled).toBe(false);
    });
  });

  // ─── Transition Plans ─────────────────────────────────────────────────────

  test.describe("Transition Plans", () => {
    test.beforeEach(async ({ page }) => {
      await mockProfilesList(page);
      await mockTherapyCapability(page, "c-001");
      await mockActiveTherapies(page);
    });

    test("DL_17: Preview transition — fetches and shows impact modal", async ({ page }) => {
      await page.route(
        `${CONSULT_API}/transition-plans/consultant/c-001/preview`,
        (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_TRANSITION_PREVIEW_RESPONSE),
          })
      );

      await goToDoctorsList(page);
      await openEditModal(page);
      await page.getByRole("button", { name: "Therapy Management" }).click();

      // Click Preview button
      await page.getByRole("button", { name: /preview/i }).click();

      // Preview modal shows affected bookings
      await expect(page.getByText("5")).toBeVisible({ timeout: 8000 });
    });

    test("DL_18: Activate plans — POST to activate endpoint, success toast", async ({ page }) => {
      await page.route(
        `${CONSULT_API}/transition-plans/consultant/c-001/preview`,
        (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_TRANSITION_PREVIEW_RESPONSE),
          })
      );

      let activateCalled = false;
      await page.route(
        `${CONSULT_API}/transition-plans/consultant/c-001/therapy/t-001/activate`,
        (route) => {
          activateCalled = true;
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_ACTIVATE_PLANS_SUCCESS_RESPONSE),
          });
        }
      );

      await goToDoctorsList(page);
      await openEditModal(page);
      await page.getByRole("button", { name: "Therapy Management" }).click();
      await page.getByRole("button", { name: /preview/i }).click();

      // Confirm activation
      await page.getByRole("button", { name: /confirm activation/i }).click();

      await expect(async () => {
        expect(activateCalled).toBe(true);
      }).toPass({ timeout: 5000 });

      await expect(
        page.getByText(/activated|success/i)
      ).toBeVisible({ timeout: 8000 });
    });

    test("DL_19: Cancel plans — POST to cancel endpoint, success toast", async ({ page }) => {
      // Override capability to show DRAFT plans (so Cancel button appears)
      await page.route(
        `${CONSULT_API}/consultant-capabilities/consultant/c-001/therapy`,
        (route) => {
          if (route.request().method() === "GET") {
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(MOCK_THERAPY_CAPABILITY_WITH_DRAFT_PLANS),
            });
          } else {
            route.continue();
          }
        }
      );

      let cancelCalled = false;
      await page.route(
        `${CONSULT_API}/transition-plans/consultant/c-001/cancel`,
        (route) => {
          cancelCalled = true;
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_CANCEL_TRANSITION_PLANS_RESPONSE),
          });
        }
      );

      await goToDoctorsList(page);
      await openEditModal(page);
      await page.getByRole("button", { name: "Therapy Management" }).click();

      // Cancel Plans button
      await page.getByRole("button", { name: /cancel plan/i }).click();

      // Confirm cancellation
      await page.getByRole("button", { name: /confirm cancellation/i }).click();

      await expect(async () => {
        expect(cancelCalled).toBe(true);
      }).toPass({ timeout: 5000 });

      await expect(
        page.getByText(/cancelled|success/i)
      ).toBeVisible({ timeout: 8000 });
    });
  });

  // ─── Availability Panel ────────────────────────────────────────────────────

  test.describe("Availability Panel", () => {
    test.beforeEach(async ({ page }) => {
      await mockProfilesList(page);
    });

    test("DL_20: Panel toggles open and closed via Availability button", async ({ page }) => {
      await goToDoctorsList(page);

      const toggleBtn = page.getByText("Availability");
      await expect(toggleBtn).toBeVisible({ timeout: 8000 });

      // Click to open
      await toggleBtn.click();
      await page.waitForTimeout(600); // slide animation

      // The availability DataTable should now be visible (check for Status column header)
      await expect(page.getByText("Status").first()).toBeVisible({ timeout: 5000 });

      // Click again to close
      await toggleBtn.click();
      await page.waitForTimeout(600);

      await expect(page.getByText("Status")).not.toBeVisible({ timeout: 5000 });
    });

    test("DL_21: Toggle active→inactive — PATCH /deactivate called, toast shown", async ({
      page,
    }) => {
      let deactivateCalled = false;
      await page.route(
        `${CONSULT_API}/consultant-profiles/c-001/deactivate`,
        (route) => {
          deactivateCalled = true;
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_TOGGLE_INACTIVE_SUCCESS_RESPONSE),
          });
        }
      );

      await goToDoctorsList(page);

      // Open availability panel
      await page.getByText("Availability").click();
      await page.waitForTimeout(600);

      // Find the Active switch for c-001 (Smith Kumar — isActive: true)
      // The RectangularSwitch shows "Active" text when consultant is active
      const smithRow = page.locator("tr", { hasText: "Smith" });
      const activeSwitch = smithRow.getByRole("button", { name: /active/i });
      await activeSwitch.click();

      await expect(async () => {
        expect(deactivateCalled).toBe(true);
      }).toPass({ timeout: 5000 });

      await expect(
        page.getByText(/marked inactive|inactive/i)
      ).toBeVisible({ timeout: 8000 });
    });

    test("DL_22: Toggle inactive→active — PATCH /activate called, toast shown", async ({
      page,
    }) => {
      let activateCalled = false;
      await page.route(
        `${CONSULT_API}/consultant-profiles/c-002/activate`,
        (route) => {
          activateCalled = true;
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(MOCK_TOGGLE_ACTIVE_SUCCESS_RESPONSE),
          });
        }
      );

      await goToDoctorsList(page);

      // Open availability panel
      await page.getByText("Availability").click();
      await page.waitForTimeout(600);

      // Find the Inactive switch for c-002 (Jane Doe — isActive: false)
      const janeRow = page.locator("tr", { hasText: "Jane" });
      const inactiveSwitch = janeRow.getByRole("button", { name: /inactive/i });
      await inactiveSwitch.click();

      await expect(async () => {
        expect(activateCalled).toBe(true);
      }).toPass({ timeout: 5000 });

      await expect(
        page.getByText(/marked active|active/i)
      ).toBeVisible({ timeout: 8000 });
    });
  });
});
