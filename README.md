# py_health_tech_Automation

Playwright-based end-to-end test automation suite for the Kapiva HealthTech platform, covering the **Doctor** and **OmniCare** workflows.

## Tech Stack

- [Playwright](https://playwright.dev/) — browser automation & test runner
- [Allure](https://allurereport.org/) — test reporting
- Node.js / JavaScript & TypeScript

## Project Structure

```
.
├── tests/
│   ├── doctor/                        # Doctor module test specs
│   │   ├── authentication.spec.js          # Doctor login & session
│   │   ├── call_patient.spec.js            # Initiate patient call
│   │   ├── cancel_appointment.spec.js      # Cancel appointment
│   │   ├── consultation_360_dynamic.spec.js # 360° consultation flow
│   │   ├── dashboard_load.spec.js          # Dashboard load & render
│   │   ├── doctor_full_flow.spec.ts        # Full doctor journey (E2E)
│   │   ├── doctor-generate-prescription.spec.js # Prescription generation
│   │   ├── raise_ticket.spec.js            # Support ticket creation
│   │   ├── reschedule.spec.js              # Appointment reschedule
│   │   ├── reschedule_and_cancel.spec.js   # Reschedule + cancel
│   │   ├── send_reminder.spec.js           # Patient reminder
│   │   └── transfer_with_fallback.spec.js  # Call transfer with fallback
│   ├── omnicare_flow/                 # OmniCare flow test specs
│   │   └── mobile_concern.spec.js         # Guest user omnichannel flow
│   └── test-2.spec.ts
├── fixtures/                          # Test data
│   ├── doctors.json                       # Doctor credentials
│   ├── users.json                         # Admin/staff users
│   └── guest_users.json                   # Created guest users (auto-saved)
├── utils/                             # Shared utilities
│   └── slackNotifier.js                   # Slack notification helper
├── playwright.config.js               # Playwright configuration
├── global-setup.js                    # Global test setup
└── global-teardown.js                 # Global test teardown
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
npm install
npx playwright install
```

### Run Tests

```bash
# Run all tests
npm test

# Run a specific spec file
npx playwright test tests/doctor/authentication.spec.js
npx playwright test tests/omnicare_flow/mobile_concern.spec.js

# Run with UI (headed mode)
npx playwright test --headed

# Run with a specific browser
npx playwright test --project=chromium
```

### Generate Allure Report

```bash
# Generate and open report
npm run allure:report

# Step by step
npm run allure:generate
npm run allure:open
```

## Test Modules

### Doctor Module

| Spec | Description |
|---|---|
| `authentication` | Doctor login and session handling |
| `dashboard_load` | Dashboard rendering and data load |
| `call_patient` | Initiating patient calls |
| `consultation_360_dynamic` | 360° consultation dynamic flows |
| `doctor_full_flow` | End-to-end doctor journey |
| `doctor-generate-prescription` | Prescription generation with medical history, lifestyle, medication & Rx, final review |
| `raise_ticket` | Support ticket creation |
| `reschedule` | Appointment rescheduling |
| `reschedule_and_cancel` | Reschedule and cancel combined flow |
| `send_reminder` | Patient reminder notifications |
| `transfer_with_fallback` | Call transfer with fallback logic |

### OmniCare Module

| Spec | Description |
|---|---|
| `mobile_concern` | Guest user omnichannel flow — concern selection → PDP → AOV pack → checkout → payment → booking confirmation |

## OmniCare Flow — mobile_concern.spec.js

End-to-end guest user journey on `staging.kapiva.in`:

| Step | Action |
|---|---|
| 1 | Generate unique phone, email, name |
| 2 | Open staging homepage |
| 3 | Dismiss staging popup |
| 4 | Verify SELECT CONCERN section |
| 5 | Click "Blood Sugar & Chronic Care" |
| 6 | Verify selected concern label |
| 7 | Navigate to solution page |
| 8–9 | Find "Dia Free Juice" product → open PDP |
| 10–11 | Select first AOV pack |
| 12 | Click BUY NOW |
| 13 | Land on checkout page |
| 14 | Handle Shiprocket widget (if visible) → enter phone |
| 15 | Fill address, pincode, email, name → Save Changes (if available) |
| 16 | Click PAY SECURELY |
| 17 | Juspay sandbox — select CHARGED → Submit |
| 18 | Confirm Booking → wait for order confirmation |
| 19 | Save guest user data to `fixtures/guest_users.json` |

## Fixtures

| File | Purpose |
|---|---|
| `fixtures/users.json` | Admin/staff login credentials |
| `fixtures/doctors.json` | Doctor login credentials mapped by first name |
| `fixtures/guest_users.json` | Auto-saved guest users created by omnicare flow |

## Configuration

- **Base URL (HTS):** `https://stg-hts.kapiva.tech/`
- **Base URL (Staging):** `https://staging.kapiva.in/`
- **Browser:** Chromium (headless)
- **Mobile device:** Pixel 7 emulation for OmniCare flow
- **Reporters:** HTML + Allure
