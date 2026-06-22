# Kapiva HealthTech — Test Automation Project Plan

## Overview

End-to-end test automation suite for Kapiva HealthTech platform (HTS + Kapiva HER + OmniCare).

| Item | Detail |
|------|--------|
| Framework | Playwright v1.58.2 |
| Languages | JavaScript (ES modules) + TypeScript |
| Reporter | Allure v2.15.1 + Playwright HTML |
| Browser | Real Chrome (stealth — passes Cloudflare) |
| CI/CD | GitHub Actions |
| Notifications | Slack (on failure) |
| Base URLs | `https://stg-hts.kapiva.tech/` (HTS) · `https://staging.kapiva.in/` (OmniCare) |

---

## Folder Structure

```
py_health_tech_Automation/
├── .github/
│   └── workflows/
│       └── omnicare-mobile-concern.yml   # CI: runs OmniCare test on push to main
├── .claude/
│   └── settings.local.json               # Claude Code MCP permission allowlist
├── docs/
│   └── superpowers/
│       └── plans/                        # Agentic implementation plans (archived)
├── fixtures/
│   ├── users.json                        # Admin/staff login credentials (5 users)
│   ├── doctors.json                      # Doctor portal credentials
│   ├── guest_users.json                  # Auto-generated OmniCare guest users (48+)
│   └── mockData.ts                       # All API mock data (auth, appointments, roles, teams)
├── tests/
│   ├── auth/                             # Login, logout, token refresh
│   ├── appointments/                     # Appointment list, filters, Patient 360
│   ├── booking/                          # CS/HCT booking, bulk booking
│   ├── capacity/                         # Capacity management
│   ├── dashboard/                        # Dashboard load & widgets
│   ├── doctors-list/                     # Doctor search, profiles
│   ├── access-control/                   # Role-based access
│   ├── navigation/                       # Sidebar navigation
│   ├── help/                             # Help section
│   ├── my-profile/                       # User profile page
│   ├── roles/                            # Roles CRUD & permissions
│   ├── teams/                            # Teams CRUD & members
│   ├── doctor/                           # Doctor portal full flows
│   ├── kapiva_her/                       # Kapiva HER landing + booking (21 specs)
│   ├── omnicare_flow/                    # Guest user E2E (concern → checkout)
│   └── helpers/
│       └── stealth.js                    # Cloudflare anti-bot patches
├── utils/
│   └── slackNotifier.js                  # Slack failure alerts
├── playwright.config.js                  # Browser config, reporters, retries
├── global-setup.js                       # Allure history + environment.properties
├── global-teardown.js                    # Allure report generation + Slack alert
├── package.json                          # 28 npm test scripts
├── .env                                  # Environment variables (git-ignored)
└── .env.example                          # Environment variable template
```

---

## Test Modules

### 1. Auth — `tests/auth/`
| File | Tests | Covers |
|------|-------|--------|
| `auth.spec.ts` | 9 | Login success, invalid credentials, logout, token refresh, 401 redirect |

### 2. Appointments — `tests/appointments/`
| File | Tests | Covers |
|------|-------|--------|
| `appointments.spec.ts` | 63 | List view, date/status filters, appointment details, dispose, Patient 360, API cache |

### 3. Booking — `tests/booking/`
| File | Tests | Covers |
|------|-------|--------|
| `cs-hct-booking.spec.ts` | 9 | CS program booking, HCT booking, slot selection |
| `bulk-book.spec.ts` | ? | Bulk appointment creation |

### 4. Capacity — `tests/capacity/`
| File | Tests | Covers |
|------|-------|--------|
| `capacity.spec.ts` | ? | Capacity slots, management UI |

### 5. Dashboard — `tests/dashboard/`
| File | Tests | Covers |
|------|-------|--------|
| `dashboard.spec.ts` | ? | Dashboard load, widget rendering, stats |

### 6. Doctors List — `tests/doctors-list/`
| File | Tests | Covers |
|------|-------|--------|
| `doctors-list.spec.ts` | ? | Doctor search, filters, profile view, transition preview |

### 7. Access Control — `tests/access-control/`
| File | Tests | Covers |
|------|-------|--------|
| `access-control.spec.ts` | ? | Role-based UI visibility, restricted actions |

### 8. Navigation — `tests/navigation/`
| File | Tests | Covers |
|------|-------|--------|
| `sidebar.spec.ts` | ? | Sidebar links, active state, collapse/expand |

### 9. Help — `tests/help/`
| File | Tests | Covers |
|------|-------|--------|
| `help.spec.ts` | ? | Help page load, content sections |

### 10. My Profile — `tests/my-profile/`
| File | Tests | Covers |
|------|-------|--------|
| `my-profile.spec.ts` | ? | Profile page display, edit fields |

### 11. Roles — `tests/roles/`
| File | Tests | Covers |
|------|-------|--------|
| `roles.spec.js` | 7 | Create role, read list, update role, delete role, permissions assignment, access control |

### 12. Teams — `tests/teams/`
| File | Tests | Covers |
|------|-------|--------|
| `teams.spec.js` | 9 | Create team, list, add member, remove member, update, delete, permissions |

### 13. Doctor Portal — `tests/doctor/`
| File | Tests | Covers |
|------|-------|--------|
| `authentication.spec.js` | ? | Doctor login, session handling |
| `dashboard_load.spec.js` | ? | Doctor dashboard rendering |
| `call_patient.spec.js` | ? | Initiate patient call |
| `consultation_360_dynamic.spec.js` | ? | 360° consultation flow |
| `doctor-generate-prescription.spec.js` | ? | Prescription generation |
| `raise_ticket.spec.js` | ? | Support ticket creation |
| `reschedule.spec.js` | ? | Appointment reschedule |
| `reschedule_and_cancel.spec.js` | ? | Combined reschedule + cancel |
| `cancel_appointment.spec.js` | ? | Appointment cancellation |
| `send_reminder.spec.js` | ? | Patient reminder dispatch |
| `transfer_with_fallback.spec.js` | ? | Call transfer with fallback logic |
| `doctor_full_flow.spec.ts` | ? | Full doctor E2E journey |

### 14. Kapiva HER — `tests/kapiva_her/`
All specs run with `--workers=1` (sequential — avoids slot conflicts).

| File | Covers |
|------|--------|
| `landing_page_hero.spec.js` | Hero section render, CTA |
| `landing_page_doctors.spec.js` | Doctors section |
| `landing_page_faq.spec.js` | FAQ accordion open/close |
| `landing_page_howitworks.spec.js` | How It Works section |
| `landing_page_symptoms.spec.js` | PCOS symptoms section |
| `landing_page_sticky_cta.spec.js` | Sticky CTA bar on scroll |
| `landing_page_comparison.spec.js` | Root-cause comparison |
| `landing_page_no_infertility.spec.js` | Infertility tile & Mood section |
| `homepage_banner.spec.js` | Banner → booking flow |
| `booking_via_doctor_card.spec.js` | Doctor card Consult Now → booking |
| `booking_slot_selection.spec.js` | Slot selection step 2/3 |
| `booking_form_validation.spec.js` | Form validation, Next button logic |
| `booking_invalid_email.spec.js` | Invalid email error handling |
| `booking_invalid_phone.spec.js` | Invalid phone error handling |
| `booking_confirmation_details.spec.js` | Full booking → confirmation details |
| `consult_now_booking.spec.js` | Doctor card → booking → quiz → result |
| `shantavri_con_booking.spec.js` | Shantavri consultation + quiz |
| `quiz_q13_skip.spec.js` | Quiz Q13 skip logic |
| `quiz_without_booking.spec.js` | Quiz standalone flow |
| `shop_now_click.spec.js` | Shop Now CTA navigation |
| `utm_attribution.spec.js` | UTM parameter preservation end-to-end |

### 15. OmniCare Flow — `tests/omnicare_flow/`
Mobile emulation (Pixel 7). Hits `staging.kapiva.in` — Cloudflare protected.

| File | Steps | Covers |
|------|-------|--------|
| `mobile_concern.spec.js` | 26 | Guest user: homepage → select concern → view products → PDP → Add to cart → Checkout → Fill address → Pay → Confirm booking |

---

## Fixtures & Mock Data

### `fixtures/users.json`
5 staff/admin users for HTS portal login tests.

### `fixtures/doctors.json`
Doctor credentials keyed by name for doctor portal tests.

### `fixtures/guest_users.json`
Auto-populated by `mobile_concern.spec.js` after each successful OmniCare checkout.
Each entry: `{ phone, email, name, createdAt }`.

### `fixtures/mockData.ts`
Central mock data library (724 lines):

| Export | Used By |
|--------|---------|
| `VALID_ACCESS_TOKEN` / `EXPIRED_ACCESS_TOKEN` | auth tests |
| `LOGIN_SUCCESS_RESPONSE` / `LOGIN_INVALID_CREDENTIALS_RESPONSE` | auth tests |
| `MOCK_APPOINTMENT`, `MOCK_APPOINTMENT_LIST_RESPONSE` | appointment tests |
| `MOCK_SLOTS_RESPONSE` | booking tests |
| `MOCK_CANCEL/RESCHEDULE/TRANSFER_SUCCESS_RESPONSE` | appointment tests |
| `generateDashboardStats(date)` | dashboard tests |
| `MOCK_ROLE`, `MOCK_ROLE_2` | roles tests |
| `MOCK_TEAM`, `MOCK_TEAM_MEMBER` | teams tests |
| `MOCK_CONSULTANT_PROFILE_FULL` | doctors-list tests |
| `CONSULT_API`, `PATIENT_API`, `DASHBOARD_API` | all API intercept patterns |

---

## Helpers

### `tests/helpers/stealth.js`
Applies 8 Cloudflare anti-bot patches via `page.addInitScript()`:

| Patch | What It Fixes |
|-------|--------------|
| `navigator.webdriver` deletion | Primary automation detection flag |
| `chrome.runtime` full mock | Bare object is a known bot signal |
| `navigator.plugins` (5 entries) | Empty plugins array = headless signal |
| `navigator.languages` | Set to `['en-US', 'en']` |
| `navigator.permissions.query` | Notifications API automation leak |
| `WebGLRenderingContext.getParameter` | Masks "Google SwiftShader" renderer |
| `window.outerWidth/outerHeight` | Headless returns 0 — real Chrome doesn't |
| `navigator.vendor` | Set to `'Google Inc.'` |

**Usage:**
```js
import { applyStealthScripts } from '../helpers/stealth.js';
test.beforeEach(async ({ page }) => {
  await applyStealthScripts(page);
});
```

---

## Infrastructure

### `global-setup.js`
Runs once before all tests:
1. Copies `allure-report/history/` → `allure-results/history/` (preserves trend charts)
2. Clears `allure-results/` and `allure-report/`
3. Recreates directories
4. Writes `allure-results/environment.properties`

### `global-teardown.js`
Runs once after all tests:
1. Parses `allure-results/*.json` → counts pass/fail/skip
2. Sends Slack alert if failures > 0
3. Runs `allure generate` → builds HTML report
4. Opens report in browser (detached)

### `utils/slackNotifier.js`
Posts rich Slack block message with:
- Pass / Fail / Skip counts
- Total duration
- Timestamp (IST timezone)
- Configured via `SLACK_BOT_TOKEN` + `SLACK_CHANNEL_ID`

### `.github/workflows/omnicare-mobile-concern.yml`
Triggered on: push/PR to `main` (path: `tests/omnicare_flow/`) + manual dispatch.
Steps: checkout → Node 20 → npm ci → cache Playwright → install browsers → run test → upload artifacts.

---

## Environment Variables

```bash
# .env (copy from .env.example)
BASE_URL=https://stg-hts.kapiva.tech/
AUTH_SERVICE_URL=https://kapiva-auth-service-stg-*.run.app/auth-service/api/v1
TEST_USER_EMAIL=testuser@kapiva.in
TEST_USER_PASSWORD=yourpassword
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C0XXXXXXX
SLACK_RUN_BY=YourName
```

---

## Running Tests

```bash
# All tests
npm test

# Single module
npm run test:auth
npm run test:appointments
npm run test:booking
npm run test:roles
npm run test:teams
npm run test:doctor
npm run test:kapiva-her          # all 21 HER specs (sequential)
npm run test:kapiva-her:ui       # landing pages + forms only
npm run test:kapiva-her:booking  # booking + quiz only
npm run test:omnicare            # OmniCare mobile concern

# Allure report
npm run allure:generate
npm run allure:open
npm run allure:report            # generate + open
```

---

## Test Count Summary

| Module | Spec Files | Tests |
|--------|-----------|-------|
| Auth | 1 | 9 |
| Appointments | 1 | 63 |
| Booking | 2 | 10+ |
| Capacity | 1 | ? |
| Dashboard | 1 | ? |
| Doctors List | 1 | ? |
| Access Control | 1 | ? |
| Navigation | 1 | ? |
| Help | 1 | ? |
| My Profile | 1 | ? |
| Roles | 1 | 7 |
| Teams | 1 | 9 |
| Doctor Portal | 12 | ? |
| Kapiva HER | 21 | 21+ |
| OmniCare | 1 | 1 |
| **Total** | **48** | **120+** |
