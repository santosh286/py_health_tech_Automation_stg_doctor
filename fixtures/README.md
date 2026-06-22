# Fixtures

Shared test data used across all spec files.

## files

### `users.json`
Staff / admin credentials for HTS portal tests.

```json
[
  { "email": "sindhu@kapiva.in", "password": "s", "name": "sindhu" },
  { "email": "santosh.kumbar@kapiva.in", "password": "s", "name": "santosh", "profileId": "...", "appointmentId": "..." },
  ...
]
```

Used by: `tests/auth/`, `tests/appointments/`, `tests/booking/`, and most HTS specs.

---

### `doctors.json`
Doctor portal credentials keyed by name.

Used by: `tests/doctor/`

---

### `guest_users.json`
Auto-populated by `tests/omnicare_flow/mobile_concern.spec.js`.

Each entry added after a successful OmniCare checkout:
```json
{
  "phone": "9XXXXXXXXXX",
  "email": "testuserXXX@kapiva.test",
  "name": "Test UserXXXX",
  "createdAt": "2026-05-26T..."
}
```

Used by: future tests that need an existing guest user to re-enter checkout.

---

### `mockData.ts`
Central mock data library (724 lines). All API intercept data lives here.

**Auth:**
- `VALID_ACCESS_TOKEN` — JWT with exp year 2286 (never expires in tests)
- `EXPIRED_ACCESS_TOKEN` — JWT expired in 2001
- `REFRESH_TOKEN`
- `LOGIN_SUCCESS_RESPONSE`, `LOGIN_INVALID_CREDENTIALS_RESPONSE`

**Appointments:**
- `MOCK_APPOINTMENT`, `MOCK_APPOINTMENT_LIST_RESPONSE`
- `MOCK_SLOTS_RESPONSE` — slots always set to tomorrow's date
- `MOCK_CANCEL_SUCCESS_RESPONSE`, `MOCK_RESCHEDULE_SUCCESS_RESPONSE`, `MOCK_TRANSFER_SUCCESS_RESPONSE`
- `MOCK_APPOINTMENT_CONSULTED`, `MOCK_APPOINTMENT_WITH_RETRY`

**Dashboard:**
- `generateDashboardStats(date)` — deterministic stats seeded by day/month

**Roles & Teams:**
- `MOCK_ROLE`, `MOCK_ROLE_2`, `MOCK_TEAM`, `MOCK_TEAM_MEMBER`, `MOCK_TEAM_MEMBER_2`
- Full CRUD response mocks

**Doctors List:**
- `MOCK_CONSULTANT_PROFILE_FULL`, `MOCK_CONSULTANT_PROFILE_FULL_2`
- `MOCK_THERAPY_CAPABILITY_RESPONSE`, `MOCK_TRANSITION_PREVIEW_RESPONSE`

**API URL patterns (for `page.route()`):**
- `CONSULT_API = "**/consultations-service/api/v1"`
- `PATIENT_API = "**/patients-service/api/v1"`
- `DASHBOARD_API = "https://stg-doctors.kapiva.tech/api"`
