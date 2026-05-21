# py_health_tech_Automation

Playwright-based end-to-end test automation suite for the Kapiva HealthTech platform, covering **Auth**, **Appointments**, **Booking**, **Capacity**, **Dashboard**, **Doctors List**, **Navigation**, **Access Control**, **Help**, **My Profile**, **Roles**, **Teams**, **Doctor**, **Kapiva HER**, and **OmniCare** workflows.

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
    ├── roles/
    │   └── roles.spec.js             # 7 tests — roles CRUD & access control
    ├── teams/
    │   └── teams.spec.js             # 9 tests — teams CRUD, members & access control
    ├── kapiva_her/                    # Kapiva HER landing page & booking (21 JS specs)
    │   ├── booking_confirmation_details.spec.js
    │   ├── booking_form_validation.spec.js
    │   ├── booking_invalid_email.spec.js
    │   ├── booking_invalid_phone.spec.js
    │   ├── booking_slot_selection.spec.js
    │   ├── booking_via_doctor_card.spec.js
    │   ├── consult_now_booking.spec.js
    │   ├── homepage_banner.spec.js
    │   ├── landing_page_comparison.spec.js
    │   ├── landing_page_doctors.spec.js
    │   ├── landing_page_faq.spec.js
    │   ├── landing_page_hero.spec.js
    │   ├── landing_page_howitworks.spec.js
    │   ├── landing_page_no_infertility.spec.js
    │   ├── landing_page_sticky_cta.spec.js
    │   ├── landing_page_symptoms.spec.js
    │   ├── quiz_q13_skip.spec.js
    │   ├── quiz_without_booking.spec.js
    │   ├── shantavri_con_booking.spec.js
    │   ├── shop_now_click.spec.js
    │   └── utm_attribution.spec.js
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
npm run test:roles
npm run test:teams
npm run test:doctor
npm run test:kapiva-her          # Full kapiva_her suite (21 specs, serial)
npm run test:kapiva-her:ui       # Landing pages + form validation only (fast)
npm run test:kapiva-her:booking  # Booking flows + quiz (API-dependent)
npm run test:omnicare

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

### Roles (`roles.spec.js`) — 7 tests

| # | Test |
|---|---|
| TC_079 | Roles page loads and displays roles list |
| TC_080 | Non-admin role: /roles page is blocked |
| TC_081 | Admin can view role details |
| TC_082 | Create role: API returns success |
| TC_083 | Update role: API returns success |
| TC_084 | Delete role: API returns success |
| TC_085 | Roles page handles API error gracefully |
| TC_086 | Unauthenticated access to /roles redirects to login |

### Teams (`teams.spec.js`) — 9 tests

| # | Test |
|---|---|
| TC_087 | Teams page loads and displays teams list |
| TC_088 | Non-admin role: /teams page is blocked |
| TC_089 | Admin can view team details |
| TC_090 | Create team: API returns success |
| TC_091 | Update team: API returns success |
| TC_092 | Delete team: API returns success |
| TC_093 | Team members list loads correctly |
| TC_094 | Teams page handles API error gracefully |
| TC_095 | Unauthenticated access to /teams redirects to login |

### Kapiva HER (`kapiva_her/`) — 21 specs

All specs run on **Pixel 7 mobile emulation** against `https://staging.kapivaher.com/`.

| Spec | Description |
|---|---|
| `landing_page_hero` | Hero section heading, stats badges, CTA button |
| `landing_page_doctors` | Doctors section heading and Consult Now link |
| `landing_page_faq` | FAQ accordion expand/collapse |
| `landing_page_howitworks` | How it works section |
| `landing_page_symptoms` | PCOS symptoms section content |
| `landing_page_sticky_cta` | Sticky CTA bar visibility on scroll |
| `landing_page_comparison` | Root-cause comparison section |
| `landing_page_no_infertility` | Infertility tile removed, Mood & Motivation added |
| `homepage_banner` | Homepage banner → booking → confirmation |
| `booking_via_doctor_card` | Booking via doctor card Consult Now link |
| `booking_slot_selection` | Slot selection Step 2/3 flow |
| `booking_form_validation` | Next button disabled until all fields filled |
| `booking_invalid_email` | Invalid email keeps Next disabled |
| `booking_invalid_phone` | Invalid phone keeps Next disabled |
| `booking_confirmation_details` | Full booking → confirmation details |
| `consult_now_booking` | Doctor card → booking → quiz → result (full E2E) |
| `shantavri_con_booking` | Shantavri consultation booking + quiz |
| `quiz_q13_skip` | Quiz Q13 skippable (Next enabled without selection) |
| `quiz_without_booking` | Quiz flow accessible without prior booking |
| `shop_now_click` | Shop Now CTA click and navigation |
| `utm_attribution` | UTM params preserved in Shop Products link |

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
| Base URL (Kapiva HER) | `https://staging.kapivaher.com/` |
| Browser | Real Chrome (stealth mode — bypasses Cloudflare bot checks) |
| Retries | 2 on CI / 1 locally (auto-retry flaky staging tests) |
| Reporters | HTML + Allure |
| Allure History | Persisted across runs |
| Environment | Staging |
