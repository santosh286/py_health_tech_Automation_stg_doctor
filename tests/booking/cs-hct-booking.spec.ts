import { test, expect, Page } from "@playwright/test";
import { VALID_ACCESS_TOKEN, REFRESH_TOKEN } from "../../fixtures/mockData";

// ─── API URL patterns ─────────────────────────────────────────────────────────
const ELIGIBILITY_API = "**/programs-service/api/v1/user-programs*";
const CONCERN_API     = "**/consultations-service/api/v1/concerns/*";
const SLOTS_API       = "**/consultations-service/api/v1/slots*";
const PROFILES_API    = "**/patients-service/api/v1/accounts/**/profiles*";
const BOOKING_API     = "**/consultations-service/api/v1/bookings*";

// ─── User with cs-hct-booking access ─────────────────────────────────────────
function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    code,
    frontendRoute,
    actions: actions.map((actionCode) => ({ actionCode, hasPermission: true })),
  };
}

const CSHCT_USER_DATA = {
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
    defaultRoute: "/cs-hct-booking",
    permissions: {
      features: [
        makeFeature("cs_hct_booking", "/cs-hct-booking", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

// ─── Mock API responses ───────────────────────────────────────────────────────

const MOCK_ELIGIBILITY_RESPONSE = {
  data: [
    {
      priority: 1,
      showBanner: true,
      concernId: "concern-001",
      therapy_id: "t-001",
      therapy_display_name: "Nutrition",
      accountId: "acc-001",
      milestones: [
        {
          milestoneStatus: "available",
          isUnlocked: true,
          consultationTypeConfigId: "ctc-001",
          userMilestoneId: "um-001",
        },
      ],
    },
  ],
};

const MOCK_CONCERN_RESPONSE = {
  data: { name: "Nutrition", concern_name: "Nutrition" },
};

// Uses today's date for slots — first available date will be selected automatically
const SLOT_DATE = "2026-04-09";
const MOCK_SLOTS_RESPONSE = {
  data: [
    {
      date: SLOT_DATE,
      slots: [
        {
          startTime: `${SLOT_DATE}T04:30:00.000Z`,
          endTime: `${SLOT_DATE}T05:00:00.000Z`,
          consultantSlots: [{ consultantId: "c-001", atomicSlotIds: ["slot-a1"] }],
        },
        {
          startTime: `${SLOT_DATE}T05:00:00.000Z`,
          endTime: `${SLOT_DATE}T05:30:00.000Z`,
          consultantSlots: [{ consultantId: "c-001", atomicSlotIds: ["slot-b1"] }],
        },
      ],
    },
  ],
};

// Store checks response.data?.success before reading response.data?.data
const MOCK_PROFILES_RESPONSE = {
  success: true,
  data: [
    {
      profile_id: "p-001",
      first_name: "John",
      last_name: "Doe",
      own_email: "johndoe@kapiva.in",
      own_phone: "9111111111",
      profile_type: "self",
    },
  ],
};

const MOCK_BOOKING_SUCCESS_RESPONSE = {
  success: true,
  message: "Booking created successfully!",
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
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: CSHCT_USER_DATA }
  );
  await page.waitForTimeout(300);
}

async function mockAllSearchAPIs(page: Page) {
  await page.route(ELIGIBILITY_API, async (route) => {
    console.log("  → eligibility API called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ELIGIBILITY_RESPONSE),
    });
  });
  await page.route(CONCERN_API, async (route) => {
    console.log("  → concern API called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CONCERN_RESPONSE),
    });
  });
  await page.route(SLOTS_API, async (route) => {
    console.log("  → slots API called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_SLOTS_RESPONSE),
    });
  });
  await page.route(PROFILES_API, async (route) => {
    console.log("  → profiles API called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROFILES_RESPONSE),
    });
  });
}

async function performSearch(page: Page) {
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toBeVisible({ timeout: 8000 });
  await phoneInput.fill("9111111111");
  await page.getByRole("button", { name: /search/i }).click();
  // Wait for eligibility check + slots to load
  await page.waitForTimeout(2000);
}

// ─── Test 1 ───────────────────────────────────────────────────────────────────

test("1. CS/HCT Booking page loads with Program tab active", async ({ page }) => {
  console.log("[1] Seeding auth");
  await seedAuth(page);

  console.log("[1] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[1] Verifying phone input is visible");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toBeVisible({ timeout: 8000 });

  console.log("[1] Verifying Search button is visible");
  await expect(page.getByRole("button", { name: /search/i })).toBeVisible();

  console.log("[1] Verifying Reset and Book Consultation buttons are visible");
  await expect(page.getByRole("button", { name: /reset/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeVisible();

  console.log("[1] Verifying Book Consultation is disabled (no data yet)");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeDisabled();

  console.log("[1] ✓ Page loaded correctly with Program tab");
});

// ─── Test 2 ───────────────────────────────────────────────────────────────────

test("2. Phone search shows patient details and date slots when eligible", async ({ page }) => {
  console.log("[2] Seeding auth and mocking APIs");
  await seedAuth(page);
  await mockAllSearchAPIs(page);

  console.log("[2] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[2] Entering phone number and clicking Search");
  await performSearch(page);

  console.log("[2] Verifying patient name is displayed");
  await expect(page.locator("text=John Doe")).toBeVisible({ timeout: 5000 });

  console.log("[2] Verifying patient email is displayed");
  await expect(page.locator("text=johndoe@kapiva.in")).toBeVisible();

  console.log("[2] Verifying 'Date & Time Slot' section is visible");
  await expect(page.locator("text=Date & Time Slot")).toBeVisible();

  console.log("[2] Verifying date buttons are rendered");
  await expect(page.locator("text=Select Date")).toBeVisible();

  console.log("[2] ✓ Patient details and slots shown after successful search");
});

// ─── Test 2b ──────────────────────────────────────────────────────────────────

test("2b. Non-eligible phone number shows error message and hides patient details", async ({ page }) => {
  console.log("[2b] Seeding auth");
  await seedAuth(page);

  console.log("[2b] Mocking eligibility API → no programs (not eligible)");
  await page.route(ELIGIBILITY_API, async (route) => {
    console.log("  → eligibility API called — returning empty (not eligible)");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }), // empty list → not eligible
    });
  });

  console.log("[2b] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[2b] Entering non-eligible phone number and searching");
  await performSearch(page);

  console.log("[2b] Verifying eligibility error message is shown");
  await expect(
    page.locator("text=This number is not eligible for a consultation")
  ).toBeVisible({ timeout: 5000 });
  console.log("[2b] ✓ Error message shown");

  console.log("[2b] Verifying patient details section is NOT shown");
  await expect(page.locator("text=User Details")).not.toBeVisible();
  await expect(page.locator("text=Date & Time Slot")).not.toBeVisible();
  console.log("[2b] ✓ Patient details hidden");

  console.log("[2b] Verifying Book Consultation button is still disabled");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeDisabled();
  console.log("[2b] ✓ Book button disabled");

  console.log("[2b] ✅ PASS — Non-eligible number handled correctly");
});

// ─── Test 3 ───────────────────────────────────────────────────────────────────

test("3. Select date and time slot enables Book Consultation button", async ({ page }) => {
  console.log("[3] Seeding auth and mocking APIs");
  await seedAuth(page);
  await mockAllSearchAPIs(page);

  console.log("[3] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[3] Searching for patient");
  await performSearch(page);

  console.log("[3] Waiting for date buttons to appear");
  await expect(page.locator("text=Select Date")).toBeVisible({ timeout: 5000 });

  // Date is auto-selected (first available date from slots) — time slots should already be visible
  console.log("[3] Waiting for time slot buttons to appear");
  await page.waitForTimeout(500);

  const timeSlotButtons = page.locator("text=Select Time Slot").locator("..").locator("button");
  // Time slots are shown in the Date & Time Slot section — pick the first one
  const slotSection = page.locator("text=Select Time Slot").locator("..");
  const firstSlotBtn = slotSection.locator("button").first();
  await expect(firstSlotBtn).toBeVisible({ timeout: 5000 });

  console.log("[3] Clicking first available time slot");
  await firstSlotBtn.click();

  console.log("[3] Verifying Book Consultation button is now enabled");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeEnabled({ timeout: 3000 });

  console.log("[3] ✓ Book button enabled after slot selection");
});

// ─── Test 4 ───────────────────────────────────────────────────────────────────

test("4. Submit booking shows success toast and resets form", async ({ page }) => {
  console.log("[4] Seeding auth and mocking all APIs");
  await seedAuth(page);
  await mockAllSearchAPIs(page);

  let bookingCalled = false;
  await page.route(BOOKING_API, async (route) => {
    if (route.request().method() === "POST") {
      bookingCalled = true;
      console.log("  → POST /bookings called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_BOOKING_SUCCESS_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });

  console.log("[4] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[4] Searching for patient");
  await performSearch(page);

  console.log("[4] Waiting for time slots to load");
  await expect(page.locator("text=Select Time Slot")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);

  console.log("[4] Selecting first time slot");
  const slotSection = page.locator("text=Select Time Slot").locator("..");
  const firstSlotBtn = slotSection.locator("button").first();
  await expect(firstSlotBtn).toBeVisible({ timeout: 5000 });
  await firstSlotBtn.click();

  console.log("[4] Clicking Book Consultation");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeEnabled({ timeout: 3000 });
  await page.getByRole("button", { name: /book consultation/i }).click();

  console.log("[4] Expecting success toast");
  await expect(page.locator(".Toastify")).toContainText("Booking created successfully!", { timeout: 8000 });
  console.log("[4] ✓ Success toast shown");

  expect(bookingCalled).toBe(true);
  console.log("[4] ✓ POST /bookings was called");

  console.log("[4] Expecting form to reset (phone input cleared)");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toHaveValue("", { timeout: 3000 });
  console.log("[4] ✓ Form reset after successful booking");

  console.log("[4] ✅ PASS — Full booking flow verified");
});

// ─── Test 5 ───────────────────────────────────────────────────────────────────

test("5. Reset button clears phone input and hides patient details", async ({ page }) => {
  console.log("[5] Seeding auth and mocking APIs");
  await seedAuth(page);
  await mockAllSearchAPIs(page);

  console.log("[5] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[5] Searching for patient to populate the form");
  await performSearch(page);

  console.log("[5] Verifying patient details are visible before reset");
  await expect(page.locator("text=John Doe")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Date & Time Slot")).toBeVisible();

  console.log("[5] Clicking Reset button");
  await page.getByRole("button", { name: /reset/i }).click();
  await page.waitForTimeout(500);

  console.log("[5] Verifying phone input is cleared");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toHaveValue("");

  console.log("[5] Verifying patient details are hidden");
  await expect(page.locator("text=John Doe")).not.toBeVisible();
  await expect(page.locator("text=johndoe@kapiva.in")).not.toBeVisible();

  console.log("[5] Verifying Date & Time Slot section is hidden");
  await expect(page.locator("text=Date & Time Slot")).not.toBeVisible();

  console.log("[5] Verifying Book Consultation button is disabled again");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeDisabled();

  console.log("[5] ✅ PASS — Reset clears phone input and hides patient details");
});

// ─── Test 6 ───────────────────────────────────────────────────────────────────

test("6. Booking API failure shows error toast", async ({ page }) => {
  console.log("[6] Seeding auth and mocking all APIs");
  await seedAuth(page);
  await mockAllSearchAPIs(page);

  console.log("[6] Mocking booking API to return 500 error");
  await page.route(BOOKING_API, async (route) => {
    if (route.request().method() === "POST") {
      console.log("  → POST /bookings called — returning 500");
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Failed to create booking" }),
      });
    } else {
      await route.continue();
    }
  });

  console.log("[6] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[6] Searching for patient");
  await performSearch(page);

  console.log("[6] Waiting for time slots to load");
  await expect(page.locator("text=Select Time Slot")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(500);

  console.log("[6] Selecting first time slot");
  const slotSection = page.locator("text=Select Time Slot").locator("..");
  const firstSlotBtn = slotSection.locator("button").first();
  await expect(firstSlotBtn).toBeVisible({ timeout: 5000 });
  await firstSlotBtn.click();

  console.log("[6] Clicking Book Consultation");
  await expect(page.getByRole("button", { name: /book consultation/i })).toBeEnabled({ timeout: 3000 });
  await page.getByRole("button", { name: /book consultation/i }).click();

  console.log("[6] Expecting error toast");
  await expect(page.locator(".Toastify")).toContainText("Failed to create booking", { timeout: 8000 });
  console.log("[6] ✓ Error toast shown");

  console.log("[6] Verifying phone input is NOT cleared (form not reset on failure)");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toHaveValue("9111111111");
  console.log("[6] ✓ Form preserved after failure");

  console.log("[6] ✅ PASS — Booking API failure handled with error toast");
});

// ─── Test 7 ───────────────────────────────────────────────────────────────────

test("7. BAU tab loads with placeholder content", async ({ page }) => {
  console.log("[7] Seeding auth");
  await seedAuth(page);

  console.log("[7] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[7] Verifying Program tab is active by default (phone input visible)");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toBeVisible({ timeout: 8000 });

  console.log("[7] Clicking the BAU tab");
  await page.getByRole("tab", { name: /bau/i }).click();
  await page.waitForTimeout(500);

  console.log("[7] Verifying BAU content is visible");
  await expect(page.locator("text=BAU")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=BAU content goes here")).toBeVisible();

  console.log("[7] Verifying Program tab phone input is hidden");
  await expect(phoneInput).not.toBeVisible();

  console.log("[7] ✅ PASS — BAU tab loads with placeholder content");
});

// ─── Test 8 ───────────────────────────────────────────────────────────────────

test("8. Invalid phone (less than 10 digits) keeps Search button disabled", async ({ page }) => {
  console.log("[8] Seeding auth");
  await seedAuth(page);

  console.log("[8] Navigating to /cs-hct-booking");
  await page.goto("/cs-hct-booking");
  await page.waitForLoadState("domcontentloaded");

  console.log("[8] Entering only 5 digits in phone input");
  const phoneInput = page.locator('input[placeholder="Enter 10-digit mobile number"]');
  await expect(phoneInput).toBeVisible({ timeout: 8000 });
  await phoneInput.fill("91111");

  console.log("[8] Verifying Search button is disabled");
  await expect(page.getByRole("button", { name: /search/i })).toBeDisabled();
  console.log("[8] ✓ Search button disabled for 5-digit input");

  console.log("[8] Entering 9 digits");
  await phoneInput.fill("911111111");

  console.log("[8] Verifying Search button is still disabled");
  await expect(page.getByRole("button", { name: /search/i })).toBeDisabled();
  console.log("[8] ✓ Search button disabled for 9-digit input");

  console.log("[8] Entering full 10 digits");
  await phoneInput.fill("9111111111");

  console.log("[8] Verifying Search button is now enabled");
  await expect(page.getByRole("button", { name: /search/i })).toBeEnabled({ timeout: 3000 });
  console.log("[8] ✓ Search button enabled for valid 10-digit input");

  console.log("[8] ✅ PASS — Phone validation blocks search for invalid input");
});
