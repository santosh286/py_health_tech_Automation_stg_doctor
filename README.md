# py_health_tech_Automation

Playwright-based end-to-end test automation suite for the Kapiva HealthTech platform, covering **Auth**, **Appointments**, **Booking**, **Capacity**, **Dashboard**, **Doctors List**, **Navigation**, **Access Control**, **Help**, **My Profile**, **Doctor**, and **OmniCare** workflows.

## Tech Stack

- [Playwright](https://playwright.dev/) v1.58.2 — browser automation & test runner
- [Allure](https://allurereport.org/) v2.15.1 — test reporting with history & environment info
- Node.js v20+ / TypeScript & JavaScript

---

## Project Structure

```
.
├── playwright.config.js               # Playwright config (Chromium, Allure + HTML reporters, env info)
├── global-setup.js                    # Preserves Allure history, wipes old results, writes environment.properties
├── global-teardown.js                 # Generates & opens Allure report after each run
├── package.json                       # Dependencies & npm test scripts
├── .env.example                       # Environment variable template
│
├── fixtures/
│   ├── mockData.ts                    # Shared mock tokens & API responses (used by all TS specs)
│   ├── doctors.json                   # Doctor login credentials
│   ├── users.json                     # Admin/staff users
│   └── guest_users.json              # Auto-saved guest users (OmniCare flow)
│
├── utils/
│   └── slackNotifier.js              # Slack notification helper
│
└── tests/
    ├── auth/
    │   └── auth.spec.ts              # 9 tests — login, logout, token refresh, auth guards
    ├── appointments/
    │   └── appointments.spec.ts      # 63 tests — list, filters, details, dispose, patient 360, cache
    ├── booking/
    │   ├── cs-hct-booking.spec.ts    # 9 tests — CS/HCT booking flow
    │   └── bulk-book.spec.ts         # Bulk booking flow
    ├── capacity/
    │   └── capacity.spec.ts          # Capacity management
    ├── dashboard/
    │   └── dashboard.spec.ts         # Dashboard load & widgets
    ├── doctors-list/
    │   └── doctors-list.spec.ts      # Doctors list & search
    ├── help/
    │   └── help.spec.ts              # Help section
    ├── my-profile/
    │   └── my-profile.spec.ts        # My profile page
    ├── navigation/
    │   └── sidebar.spec.ts           # Sidebar navigation
    ├── access-control/
    │   └── access-control.spec.ts    # Role-based access control
    ├── doctor/                        # Original doctor module (JS specs)
    │   ├── authentication.spec.js
    │   ├── call_patient.spec.js
    │   ├── cancel_appointment.spec.js
    │   ├── consultation_360_dynamic.spec.js
    │   ├── dashboard_load.spec.js
    │   ├── doctor_full_flow.spec.ts
    │   ├── doctor-generate-prescription.spec.js
    │   ├── raise_ticket.spec.js
    │   ├── reschedule.spec.js
    │   ├── reschedule_and_cancel.spec.js
    │   ├── send_reminder.spec.js
    │   └── transfer_with_fallback.spec.js
    └── omnicare_flow/
        └── mobile_concern.spec.js    # Guest user omnichannel flow
```

---

## Getting Started

### Prerequisites

- Node.js >= 20
- npm

### Installation

```bash
npm install
npx playwright install
```

### Environment Setup

```bash
cp .env.example .env
# Fill in your credentials in .env
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run a specific module
npm run test:auth
npm run test:appointments
npm run test:booking
npm run test:dashboard
npm run test:capacity
npm run test:navigation
npm run test:doctors-list
npm run test:access-control
npm run test:help
npm run test:my-profile

# Run a specific spec file
npx playwright test tests/auth/auth.spec.ts
npx playwright test tests/appointments/appointments.spec.ts

# Run specific tests by name pattern (e.g. Group 3)
npx playwright test tests/appointments/appointments.spec.ts --grep "11a\.|11b\.|11c\.|11d\.|11e\."

# Run in headed mode
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium
```

---

## Allure Report

Allure report is **auto-generated and opened** after every test run via `global-teardown.js`.

```bash
# Manually regenerate and open
npm run allure:generate
npm run allure:open

# Generate + open in one command
npm run allure:report
```

### Allure Features Enabled

| Feature | Details |
|---|---|
| History & Trends | Preserved across runs via `allure-results-history/` |
| Environment Panel | Browser, OS, Node version, Playwright version, Base URL |
| Suite Grouping | Tests grouped by file/suite |
| Step Details | Full step-by-step trace per test |

---

## Test Modules

### Auth (`auth.spec.ts`) — 9 tests

| # | Test |
|---|---|
| 1 | Login with valid credentials → dashboard redirect |
| 2 | Invalid credentials → error toast |
| 2b | Empty email/password → validation toast |
| 3 | Expired token → auto-refresh on 401 |
| 3b | Failed refresh → clear auth + redirect to login |
| 4 | Logout → clears tokens + redirect |
| 4b | Unauthenticated access → login redirect |
| 8 | Mid-session 401 → auto-refresh + retry original request |
| 9 | Network failure → error toast |

### Appointments (`appointments.spec.ts`) — 63 tests

| Group | Tests |
|---|---|
| List & Filters (5–5f) | Load, status chips, date nav, consultant filter, therapy filter |
| Details & Actions (6–10f) | Tabs, actions menu, reschedule, transfer, cancel, reminder, ticket, call, profiles |
| Dispose & Patient 360 (11a–11e) | Consulted 5-tab flow, Not Consulted, Not Needed, DND, Patient 360 |
| Retry Time (R1–R6) | Set, clear, time picker validation, payload check |
| Consultation Cache (TC_01–TC_37) | localStorage draft-save across tabs, refresh, browsers, edge cases |

### CS/HCT Booking (`cs-hct-booking.spec.ts`) — 9 tests

| # | Test |
|---|---|
| 1 | Booking page loads with Program tab |
| 2 | Phone search shows patient details and slots |
| 2b | Non-eligible phone shows error |
| 3 | Select date/time enables Book button |
| 4 | Submit booking → success toast + form reset |
| 5 | Reset button clears form |
| 6 | Booking API failure → error toast |
| 7 | BAU tab loads |
| 8 | Invalid phone keeps Search disabled |

### Doctor Module (JS specs) — 12 files

| Spec | Description |
|---|---|
| `authentication` | Doctor login and session handling |
| `dashboard_load` | Dashboard rendering and data load |
| `call_patient` | Initiating patient calls |
| `consultation_360_dynamic` | 360° consultation dynamic flows |
| `doctor_full_flow` | End-to-end doctor journey |
| `doctor-generate-prescription` | Prescription generation |
| `raise_ticket` | Support ticket creation |
| `reschedule` | Appointment rescheduling |
| `reschedule_and_cancel` | Reschedule + cancel combined |
| `send_reminder` | Patient reminder notifications |
| `transfer_with_fallback` | Call transfer with fallback |

### OmniCare Flow (`mobile_concern.spec.js`)

End-to-end guest user journey on `staging.kapiva.in`:

| Step | Action |
|---|---|
| 1 | Generate unique phone, email, name |
| 2 | Open staging homepage |
| 3 | Dismiss staging popup |
| 4–6 | Select concern → "Blood Sugar & Chronic Care" |
| 7–11 | Find product → PDP → select AOV pack |
| 12–13 | BUY NOW → checkout page |
| 14–15 | Fill address, phone, email → Save |
| 16 | PAY SECURELY |
| 17 | Juspay sandbox → CHARGED → Submit |
| 18 | Confirm Booking → order confirmation |
| 19 | Save guest user to `fixtures/guest_users.json` |

---

## Configuration

| Setting | Value |
|---|---|
| Base URL (HTS) | `https://stg-hts.kapiva.tech/` |
| Base URL (Staging) | `https://staging.kapiva.in/` |
| Browser | Chromium (headless) |
| Retries | 2 (on failure) |
| Reporters | HTML + Allure |
| Allure History | Persisted across runs |
| Environment | Staging |
