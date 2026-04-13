# py_health_tech_Automation - Doctor Module

Playwright-based end-to-end test automation suite for the HealthTech platform, focused on the **Doctor** and **OmniCare** workflows.

## Tech Stack

- [Playwright](https://playwright.dev/) — browser automation & test runner
- [Allure](https://allurereport.org/) — test reporting
- Node.js / JavaScript & TypeScript

## Project Structure

```
.
├── tests/
│   ├── doctor/               # Doctor module test specs
│   │   ├── authentication.spec.js
│   │   ├── call_patient.spec.js
│   │   ├── cancel_appointment.spec.js
│   │   ├── consultation_360_dynamic.spec.js
│   │   ├── dashboard_load.spec.js
│   │   ├── doctor_full_flow.spec.ts
│   │   ├── doctor-generate-prescription.spec.js
│   │   ├── raise_ticket.spec.js
│   │   ├── reschedule.spec.js
│   │   ├── reschedule_and_cancel.spec.js
│   │   ├── send_reminder.spec.js
│   │   └── transfer_with_fallback.spec.js
│   ├── omnicare_flow/        # OmniCare flow test specs
│   │   └── mobile_concern.spec.js
│   └── test-2.spec.ts
├── fixtures/                 # Test data (users, doctors, guests)
│   ├── doctors.json
│   ├── users.json
│   └── guest_users.json
├── utils/                    # Shared utilities
│   └── slackNotifier.js
├── playwright.config.js      # Playwright configuration
├── global-setup.js           # Global test setup
└── global-teardown.js        # Global test teardown
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

# Run with a specific browser
npx playwright test --project=chromium
```

### Generate Allure Report

```bash
# Generate and open report
npm run allure:report

# Or step by step:
npm run allure:generate
npm run allure:open
```

## Test Modules

| Module | Description |
|---|---|
| `authentication` | Doctor login and session handling |
| `dashboard_load` | Dashboard rendering and data load |
| `call_patient` | Initiating patient calls |
| `consultation_360_dynamic` | 360° consultation dynamic flows |
| `doctor_full_flow` | End-to-end doctor journey |
| `doctor-generate-prescription` | Prescription generation |
| `raise_ticket` | Support ticket creation |
| `reschedule` / `reschedule_and_cancel` | Appointment rescheduling and cancellation |
| `send_reminder` | Patient reminder notifications |
| `transfer_with_fallback` | Call transfer with fallback logic |
| `mobile_concern` | OmniCare mobile concern flow |
