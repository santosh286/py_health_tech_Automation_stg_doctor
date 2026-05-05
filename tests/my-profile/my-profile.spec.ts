import { test, expect, Page } from "@playwright/test";
import { VALID_ACCESS_TOKEN, REFRESH_TOKEN } from "../../fixtures/mockData";

const GCF_UPLOAD_URL = "**/media-files-uploader-backend/image/upload";
const USERS_PATCH_API = "**users-service**";
const CONSULTANT_PROFILE_API = "**/consultations-service/api/v1/consultant-profiles/**";

function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    code,
    frontendRoute,
    actions: actions.map((actionCode) => ({ actionCode, hasPermission: true })),
  };
}

// Normal user — no consultation:create (non-consultant path)
// userId must be a valid UUID — usersService.updateUserProfilePhoto validates via isValidUUID()
const NORMAL_USER_DATA = {
  userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  firstName: "Test",
  lastName: "User",
  email: "testuser@kapiva.in",
  phone: "9876543210",
  profilePicture: "",
  isActive: true,
  therapyId: "",
  yearsOfExperience: "5",
  qualification: "MBBS",
  licenseNumber: "LIC12345",
  createdAt: "",
  updatedAt: "",
  role: {
    name: "Admin",
    key: "admin",
    active: true,
    defaultRoute: "/my-profile",
    permissions: {
      features: [
        makeFeature("my_profile", "/my-profile", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

// Consultant user — has consultation:create (consultant path)
const CONSULTANT_USER_DATA = {
  ...NORMAL_USER_DATA,
  role: {
    name: "Doctor",
    key: "doctor",
    active: true,
    defaultRoute: "/my-profile",
    permissions: {
      features: [
        makeFeature("my_profile", "/my-profile", ["view", "create", "update", "delete"]),
        makeFeature("consultation", "/appointments", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

const MOCK_CONSULTANT_PROFILE_RESPONSE = {
  success: true,
  data: {
    consultantId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    firstName: "Test",
    lastName: "Consultant",
    prefix: "Dr.",
    displayName: "Dr. Test Consultant",
    phone: "9876543210",
    email: "testuser@kapiva.in",
    profilePhotoUrl: null,
    qualifications: ["MBBS", "MD"],
    specializations: ["Nutrition", "Wellness"],
    languages: ["English", "Hindi"],
    licenseNumber: "LIC12345",
    licenseAuthority: "MCI",
    yearsOfExperience: 5,
    patientsTreated: 200,
    ratingCount: 50,
    therapies: [{ therapyId: "t-001", therapyName: "Nutrition" }],
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

// ─── Test 1 ───────────────────────────────────────────────────────────────────

test("1. My Profile page loads with normal user data", async ({ page }) => {
  console.log("[1] Seeding normal user auth");
  await seedAuth(page, NORMAL_USER_DATA);

  console.log("[1] Navigating to /my-profile");
  await page.goto("/my-profile");
  await page.waitForLoadState("domcontentloaded");

  console.log("[1] Verifying page heading");
  await expect(page.locator("text=My Profile").first()).toBeVisible({ timeout: 8000 });

  console.log("[1] Verifying display name shown");
  await expect(page.locator("text=Test User").first()).toBeVisible({ timeout: 5000 });

  console.log("[1] Verifying email displayed");
  await expect(page.locator("text=testuser@kapiva.in")).toBeVisible();

  console.log("[1] Verifying license number displayed");
  await expect(page.locator("text=LIC12345")).toBeVisible();

  console.log("[1] Verifying login form NOT shown (user is authenticated)");
  const loginForm = await page.locator("#email").isVisible().catch(() => false);
  expect(loginForm).toBe(false);

  console.log("[1] ✓ Profile page loaded with correct user data");
});

// ─── Test 2 ───────────────────────────────────────────────────────────────────

test("2. Upload profile photo — success shows toast", async ({ page }) => {
  console.log("[2] Seeding normal user auth");
  await seedAuth(page, NORMAL_USER_DATA);

  console.log("[2] Mocking GCF photo upload → returns public URL");
  await page.route(GCF_UPLOAD_URL, async (route) => {
    console.log("[2] → GCF upload endpoint called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ cloudStoragePublicUrl: "https://cdn.kapiva.tech/test-profile.jpg" }),
    });
  });

  console.log("[2] Mocking PATCH users API → 200");
  await page.route(USERS_PATCH_API, async (route) => {
    console.log("[2] → PATCH users endpoint called");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  console.log("[2] Navigating to /my-profile");
  await page.goto("/my-profile");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("text=My Profile").first()).toBeVisible({ timeout: 8000 });

  console.log("[2] Attaching valid small image file (1KB) via hidden file input");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "profile.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(1024), // 1KB — well under 200KB limit
  });

  console.log("[2] Waiting for Update button to appear");
  await expect(page.locator("#update")).toBeVisible({ timeout: 3000 });

  console.log("[2] Clicking Update button");
  await page.locator("#update").click();

  console.log("[2] Expecting success toast");
  await expect(page.locator(".Toastify")).toContainText("Profile image updated successfully", {
    timeout: 8000,
  });
  console.log("[2] ✓ Profile photo upload succeeded");
});

// ─── Test 3 ───────────────────────────────────────────────────────────────────

test("3. File size >200KB shows validation toast and hides Update button", async ({ page }) => {
  console.log("[3] Seeding normal user auth");
  await seedAuth(page, NORMAL_USER_DATA);

  console.log("[3] Navigating to /my-profile");
  await page.goto("/my-profile");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("text=My Profile").first()).toBeVisible({ timeout: 8000 });

  console.log("[3] Attaching oversized image file (210KB)");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "large-profile.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(210 * 1024), // 210KB — exceeds 200KB limit
  });

  console.log("[3] Expecting validation toast");
  await expect(page.locator(".Toastify")).toContainText("Image size should not exceed 200 KB", {
    timeout: 5000,
  });
  console.log("[3] ✓ Validation toast shown");

  console.log("[3] Verifying Update button is NOT visible");
  await expect(page.locator("#update")).not.toBeVisible();
  console.log("[3] ✓ Update button hidden — oversized file rejected");
});

// ─── Test 4 ───────────────────────────────────────────────────────────────────

test("4. Consultant user sees extended profile fields", async ({ page }) => {
  console.log("[4] Seeding consultant user auth (has consultation:create)");
  await seedAuth(page, CONSULTANT_USER_DATA);

  console.log("[4] Mocking consultant-profiles GET → full consultant data");
  await page.route(CONSULTANT_PROFILE_API, async (route) => {
    if (route.request().method() === "GET") {
      console.log("[4] → consultant-profiles GET called");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CONSULTANT_PROFILE_RESPONSE),
      });
    } else {
      await route.continue();
    }
  });

  console.log("[4] Navigating to /my-profile");
  await page.goto("/my-profile");
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("text=My Profile").first()).toBeVisible({ timeout: 8000 });

  // Give Zustand store time to hydrate consultant profile
  await page.waitForTimeout(1500);

  console.log("[4] Verifying consultant-specific fields visible");
  await expect(page.locator("text=MBBS, MD")).toBeVisible({ timeout: 5000 });
  console.log("[4] ✓ Qualifications: MBBS, MD");

  await expect(page.locator("text=Nutrition, Wellness")).toBeVisible();
  console.log("[4] ✓ Specializations: Nutrition, Wellness");

  await expect(page.locator("text=English, Hindi")).toBeVisible();
  console.log("[4] ✓ Languages: English, Hindi");

  await expect(page.locator("text=LIC12345")).toBeVisible();
  console.log("[4] ✓ License number visible");

  console.log("[4] ✅ PASS — Consultant extended profile fields displayed");
});
