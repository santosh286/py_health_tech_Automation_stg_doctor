/**
 * Shared mock data for auth tests.
 */

// A JWT with exp far in the future (year 2286) — treated as valid by isAccessTokenExpired()
export const VALID_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJleHAiOjk5OTk5OTk5OTl9." +
  "fake_valid_signature";

// A JWT with exp in 2001 — treated as expired by isAccessTokenExpired()
export const EXPIRED_ACCESS_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJleHAiOjEwMDAwMDAwMDB9." +
  "fake_expired_signature";

export const REFRESH_TOKEN = "fake-refresh-token-value";

/** Helper to build a feature with all standard actions allowed */
function makeFeature(code: string, frontendRoute: string, actions: string[]) {
  return {
    code,
    frontendRoute,
    actions: actions.map((actionCode) => ({ actionCode, hasPermission: true })),
  };
}

/**
 * Full-permission admin mock user.
 * Includes frontendRoute on each feature so the auth layout grants access,
 * and the AccessController renders gated content.
 */
export const MOCK_USER_DATA = {
  userId: "test-user-id",
  firstName: "Test",
  lastName: "User",
  email: "testuser@kapiva.in",
  profilePicture: "",
  isActive: true,
  therapyId: "",
  createdAt: "",
  updatedAt: "",
  role: {
    name: "Admin",
    key: "admin",
    active: true,
    defaultRoute: "/dashboard",
    permissions: {
      features: [
        makeFeature("dashboard", "/dashboard", ["view", "create", "update", "delete"]),
        // Covers /appointments and /appointments/appointment-details (via startsWith)
        makeFeature("todays_appointments", "/appointments", ["view", "create", "update", "delete"]),
        makeFeature("consultation", "/appointments", ["view", "create", "update", "delete"]),
        makeFeature("view_360", "/appointments", ["view", "create", "update", "delete"]),
        makeFeature("create_consultation", "/create-consultation", ["view", "create", "update", "delete"]),
      ],
    },
  },
};

/** Full login API success response */
export const LOGIN_SUCCESS_RESPONSE = {
  success: true,
  data: {
    tokens: {
      access_token: VALID_ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN,
    },
    userData: {
      user: {
        userId: "test-user-id",
        firstName: "Test",
        lastName: "User",
        email: "testuser@kapiva.in",
        isActive: true,
      },
      domain: {
        domainId: "domain-1",
        role: {
          name: "Admin",
          key: "admin",
          active: true,
          defaultRoute: "/dashboard",
          permissions: { features: [] },
        },
        features: [],
      },
    },
  },
};

/** Refresh token API success response */
export const REFRESH_TOKEN_SUCCESS_RESPONSE = {
  success: true,
  data: {
    tokens: {
      access_token: VALID_ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN,
    },
  },
};

/** Login API error response */
export const LOGIN_INVALID_CREDENTIALS_RESPONSE = {
  success: false,
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
  },
};

// ─── Appointments ─────────────────────────────────────────────────────────────

export const MOCK_CONSULTANT = {
  consultantId: "c-001",
  displayName: "Dr. Smith",
  firstName: "Smith",
  lastName: "",
  prefix: "Dr.",
  phone: "9000000001",
  email: "smith@kapiva.in",
  profilePhotoUrl: null,
  consultantOrganizationId: "org-1",
};

export const MOCK_CONSULTANT_2 = {
  consultantId: "c-002",
  displayName: "Dr. Jane",
  firstName: "Jane",
  lastName: "",
  prefix: "Dr.",
  phone: "9000000002",
  email: "jane@kapiva.in",
  profilePhotoUrl: null,
  consultantOrganizationId: "org-1",
};

export const MOCK_THERAPY = {
  therapyId: "t-001",
  therapyName: "Nutrition",
  name: "Nutrition",
};

export const MOCK_PATIENT = {
  profileId: "p-001",
  firstName: "John",
  lastName: "Doe",
  displayName: "John Doe",
  phone: "9111111111",
  email: "johndummy@kapiva.in",
};

export const MOCK_APPOINTMENT = {
  bookingId: "booking-001",
  bookingCode: "BK001",
  displayStatus: "upcoming",
  appointmentTime: "2026-04-03T09:00:00.000Z",
  appointmentEndTime: "2026-04-03T09:30:00.000Z",
  consultant: MOCK_CONSULTANT,
  patient: MOCK_PATIENT,
  account: { accountId: "acc-001", phone: "9111111111" },
  therapy: { therapyId: "t-001", name: "Nutrition" },
  consultation: {
    consultationId: "cons-001",
    status: "upcoming",
    mode: null,
    prescriptionUrl: null,
    cartUrl: null,
  },
  customerIssuesAndConcerns: "Weight management",
  customerComments: null,
  consultationTypeConfigId: "ctc-001",
  concernId: "concern-001",
  concern: { concernId: "concern-001" },
  consultationType: { configId: "ctc-001" },
};

export const MOCK_APPOINTMENT_LIST_RESPONSE = {
  success: true,
  data: [MOCK_APPOINTMENT],
  pagination: { total: 1, page: 1, limit: 1000 },
};

export const MOCK_APPOINTMENT_EMPTY_RESPONSE = {
  success: true,
  data: [],
  pagination: { total: 0, page: 1, limit: 1000 },
};

export const MOCK_APPOINTMENT_DETAIL_RESPONSE = {
  success: true,
  data: MOCK_APPOINTMENT,
};

export const MOCK_PATIENT_PROFILE_RESPONSE = {
  success: true,
  data: {
    profile_id: "p-001",
    first_name: "John",
    last_name: "Doe",
    own_phone: "9111111111",
    own_email: "johndummy@kapiva.in",
    dob: "1990-01-01",
    gender: "Male",
    is_active: true,
    profile_type: "self",
    relationship_to_creator: "self",
    profile_created_by: "customer",
    created_by_account_id: "acc-001",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

/**
 * Therapies response — must match getTherapies() parsing:
 *   payload = res.data?.data          → { data: [...], meta: { hasNextPage } }
 *   list    = payload?.data ?? []     → the therapy items
 *   meta    = payload?.meta           → { hasNextPage: boolean }
 * Each item needs `name` (mapped to therapyName) and therapyId.
 */
export const MOCK_THERAPIES_RESPONSE = {
  data: {
    data: [{ therapyId: "t-001", name: "Nutrition" }],
    meta: { hasNextPage: false, total: 1 },
  },
};

export const MOCK_CONSULTANT_PROFILES_RESPONSE = {
  success: true,
  data: [
    {
      consultantId: "c-001",
      firstName: "Smith",
      lastName: "",
      prefix: "Dr.",
      therapyId: "t-001",
      languages: ["English"],
      isActive: true,
      isListed: true,
      profilePhotoUrl: null,
      consultantOrganizationId: "org-1",
    },
    {
      consultantId: "c-002",
      firstName: "Jane",
      lastName: "",
      prefix: "Dr.",
      therapyId: "t-001",
      languages: ["English", "Hindi"],
      isActive: true,
      isListed: true,
      profilePhotoUrl: null,
      consultantOrganizationId: "org-1",
    },
  ],
};

/** Available slots for reschedule/transfer — always tomorrow so date is always future */
const _tomorrow = new Date();
_tomorrow.setDate(_tomorrow.getDate() + 1);
const _futureDate = _tomorrow.toISOString().split("T")[0];

export const MOCK_SLOTS_RESPONSE = {
  success: true,
  data: [
    {
      date: _futureDate,
      therapyId: "t-001",
      slots: [
        {
          startTime: `${_futureDate}T04:30:00.000Z`,
          endTime:   `${_futureDate}T05:00:00.000Z`,
          consultantSlots: [
            { consultantId: "c-001", atomicSlotIds: ["slot-a1"] },
          ],
        },
        {
          startTime: `${_futureDate}T05:00:00.000Z`,
          endTime:   `${_futureDate}T05:30:00.000Z`,
          consultantSlots: [
            { consultantId: "c-002", atomicSlotIds: ["slot-b1"] },
          ],
        },
      ],
    },
  ],
};

export const MOCK_CANCEL_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Booking cancelled successfully." },
};

export const MOCK_RESCHEDULE_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Reschedule request submitted." },
};

export const MOCK_TRANSFER_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Transfer request submitted." },
};

export const MOCK_CONFIG_RESPONSE = {
  success: true,
  data: {
    allowedCancelReasons: ["Patient unavailable", "Doctor unavailable"],
    maxRescheduleCount: 3,
  },
};

export const MOCK_CATALOG_RESPONSE = {
  success: true,
  data: { concerns: [], consultationTypes: [] },
};

export const MOCK_COUPON_RESPONSE = {
  success: true,
  data: null,
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Generates dashboard stats that vary by date — simulating real API behaviour
 * where each day returns different counts/percentages.
 *
 * Stats response shape: axios response.data === { data: [...] }
 * Dashboard reads: response.data?.data (the array)
 *
 * @param date - date to generate stats for (defaults to today)
 */
export function generateDashboardStats(date: Date = new Date()) {
  const day = date.getDate();           // 1–31
  const month = date.getMonth() + 1;   // 1–12
  const seed = day + month * 31;

  const totalConsultations = 10 + (seed % 20);          // 10–29
  const attendance = Math.floor(totalConsultations * 0.7) + (seed % 5);
  const yetToConsult = totalConsultations - attendance;
  const cartValue = 1000 + (seed % 50) * 100;            // ₹1000–₹5900
  const pct1 = (seed % 15) + 1;                          // 1–15%
  const pct2 = (seed % 10) + 1;                          // 1–10%
  const pct3 = (seed % 20) + 1;                          // 1–20%

  return {
    data: [
      {
        label: "Today's Consultations",
        value: String(totalConsultations),
        includesPercentageChange: true,
        upTick: seed % 2 === 0,
        percentageChange: `${pct1}%`,
      },
      {
        label: "Attendance",
        value: String(attendance),
        includesPercentageChange: true,
        upTick: seed % 3 !== 0,
        percentageChange: `${pct2}%`,
      },
      {
        label: "Yet to Consult",
        value: String(yetToConsult),
        includesPercentageChange: false,
        upTick: true,
        percentageChange: "0%",
      },
      {
        label: "Today's cart value",
        value: `₹ ${cartValue}`,
        includesPercentageChange: true,
        upTick: seed % 2 !== 0,
        percentageChange: `${pct3}%`,
      },
    ],
  };
}

// ─── Consultation service URL patterns (env-agnostic globs) ───────────────────
export const CONSULT_API = "**/consultations-service/api/v1";
export const PATIENT_API = "**/patients-service/api/v1";
export const DASHBOARD_API = "https://stg-doctors.kapiva.tech/api";

// ─── Set Retry ───────────────────────────────────────────────────────────────

export const MOCK_APPOINTMENT_WITH_RETRY = {
  ...MOCK_APPOINTMENT,
  consultation: {
    ...MOCK_APPOINTMENT.consultation,
    nextRetryTime: new Date(
      new Date().setHours(10, 0, 0, 0)
    ).toISOString(),
  },
};

export const MOCK_APPOINTMENT_DETAIL_WITH_RETRY_RESPONSE = {
  success: true,
  data: MOCK_APPOINTMENT_WITH_RETRY,
};

export const MOCK_APPOINTMENT_CONSULTED = {
  ...MOCK_APPOINTMENT,
  displayStatus: "consulted",
  consultation: {
    ...MOCK_APPOINTMENT.consultation,
    status: "consulted",
  },
};

export const MOCK_APPOINTMENT_DETAIL_CONSULTED_RESPONSE = {
  success: true,
  data: MOCK_APPOINTMENT_CONSULTED,
};

export const MOCK_SET_RETRY_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Retry time set successfully" },
};

export const MOCK_CLEAR_RETRY_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Retry time cleared successfully" },
};

// ─── Doctors List ─────────────────────────────────────────────────────────────

export const MOCK_CONSULTANT_PROFILE_FULL = {
  consultantId: "c-001",
  organizationId: "org-001",
  firstName: "Smith",
  lastName: "Kumar",
  displayName: "Dr. Smith Kumar",
  fullName: "Dr. Smith Kumar",
  prefix: "Dr.",
  email: "smith@kapiva.in",
  phone: "9000000001",
  profilePhotoUrl: null,
  signatureUrl: null,
  licenseNumber: "LIC-001",
  licenseAuthority: "MCI",
  licenseValidTill: "2030-01-01",
  qualifications: ["MBBS", "MD"],
  specializations: ["Nutrition"],
  languages: ["English", "Hindi"],
  bio: "Senior nutritionist with 10 years experience.",
  yearsOfExperience: 10,
  patientsTreated: 500,
  rating: 4.5,
  ratingCount: 200,
  isFeatured: false,
  featuredRank: null,
  isListed: true,
  isActive: true,
  therapies: [{ therapyId: "t-001", therapyName: "Nutrition" }],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

export const MOCK_CONSULTANT_PROFILE_FULL_2 = {
  ...MOCK_CONSULTANT_PROFILE_FULL,
  consultantId: "c-002",
  organizationId: "org-002",
  firstName: "Jane",
  lastName: "Doe",
  displayName: "Dr. Jane Doe",
  fullName: "Dr. Jane Doe",
  email: "jane@kapiva.in",
  phone: "9000000002",
  isActive: false,
};

export const MOCK_CONSULTANT_PROFILES_LIST_RESPONSE = {
  success: true,
  data: [MOCK_CONSULTANT_PROFILE_FULL, MOCK_CONSULTANT_PROFILE_FULL_2],
};

export const MOCK_THERAPY_CAPABILITY_RESPONSE = {
  success: true,
  data: {
    therapyId: "t-001",
    therapyName: "Nutrition",
    capabilityScope: "BOTH",
    concerns: [{ concernId: "cn-001", concernName: "Weight Management" }],
    consultantStatus: { isActive: true, isDeactivated: false },
    transitionPlans: { exists: false, status: "NONE", count: 0 },
  },
};

export const MOCK_THERAPY_CAPABILITY_WITH_DRAFT_PLANS = {
  success: true,
  data: {
    therapyId: "t-001",
    therapyName: "Nutrition",
    capabilityScope: "BOTH",
    concerns: [{ concernId: "cn-001", concernName: "Weight Management" }],
    consultantStatus: { isActive: true, isDeactivated: false },
    transitionPlans: { exists: true, status: "DRAFT", count: 2 },
  },
};

export const MOCK_ACTIVE_THERAPIES_RESPONSE = {
  data: {
    data: [
      { therapyId: "t-001", name: "Nutrition" },
      { therapyId: "t-002", name: "Yoga" },
    ],
    meta: { hasNextPage: false, total: 2 },
  },
};

export const MOCK_UPDATE_PROFILE_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Consultant profile updated successfully." },
};

export const MOCK_UPDATE_THERAPY_SUCCESS_RESPONSE = {
  success: true,
  data: {
    newCapabilities: [{ capabilityId: "cap-001", consultantId: "c-001", isActive: true }],
    transitionPlans: [],
    removedConfigIds: [],
  },
};

export const MOCK_TRANSITION_PREVIEW_RESPONSE = {
  success: true,
  data: [
    {
      planId: "plan-001",
      actionStrategy: "TRANSFER_ALL",
      effectiveFrom: "2026-04-20T00:00:00.000Z",
      reason: null,
      therapyId: "t-001",
      concernId: "cn-001",
      affectedBookings: {
        total: 5,
        byStatus: { upcoming: 5 },
        dateRange: {
          earliest: "2026-04-16T00:00:00.000Z",
          latest: "2026-04-30T00:00:00.000Z",
        },
      },
      transferDistribution: [
        { targetId: "tgt-001", toConsultantId: "c-002", expectedBookings: 5 },
      ],
    },
  ],
};

export const MOCK_ACTIVATE_PLANS_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Plans activated successfully." },
};

export const MOCK_CANCEL_TRANSITION_PLANS_RESPONSE = {
  success: true,
  data: { message: "Plans cancelled successfully." },
};

export const MOCK_TOGGLE_ACTIVE_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Consultant marked active" },
};

export const MOCK_TOGGLE_INACTIVE_SUCCESS_RESPONSE = {
  success: true,
  data: { message: "Consultant marked inactive" },
};
