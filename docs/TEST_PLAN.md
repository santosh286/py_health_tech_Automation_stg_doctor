# Test Plan — Kapiva Health Tech Automation Suite

| Field | Details |
|-------|---------|
| **Project** | Kapiva Health Tech — HTS Portal & Kapiva HER |
| **Document Type** | Test Plan |
| **Version** | 1.0 |
| **Prepared By** | Santosh Kumbar |
| **Team** | QA Automation |
| **Date** | 2026-06-02 |
| **Status** | Active |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Scope](#2-scope)
3. [Test Objectives](#3-test-objectives)
4. [Test Environment](#4-test-environment)
5. [Test Approach](#5-test-approach)
6. [Test Modules & Coverage](#6-test-modules--coverage)
7. [Test Cases Summary](#7-test-cases-summary)
8. [Entry & Exit Criteria](#8-entry--exit-criteria)
9. [Risk & Mitigation](#9-risk--mitigation)
10. [Test Deliverables](#10-test-deliverables)
11. [Tools & Framework](#11-tools--framework)
12. [Defect Management](#12-defect-management)
13. [Schedule](#13-schedule)

---

## 1. Introduction

### 1.1 Purpose

This document describes the test plan for the **Kapiva Health Tech Automation Suite** — an end-to-end Playwright-based automation framework covering two core products:

- **HTS Admin Portal** (`stg-hts.kapiva.tech`) — Internal tool for CS, doctors, and admins to manage appointments, bookings, and consultations
- **Kapiva HER / PMOSolve** (`staging.kapivaher.com`) — Patient-facing web app for PMOS consultation booking and quiz assessment

### 1.2 Background

Kapiva HER is a women's hormonal health platform. The PMOSolve quiz determines the user's PMOS phenotype (e.g. Hyperandrogenic, Inflammatory, Adrenal, Insulin Resistant) and recommends personalized Ayurvedic products. The HTS portal enables the internal team to manage consultations end-to-end.

### 1.3 References

| Document | Location |
|----------|----------|
| Automation Framework | `/Users/santoshkumbar/Projects/py_health_tech_Automation/` |
| Playwright Config | `playwright.config.js` |
| Package Scripts | `package.json` |
| Spec Files | `tests/` |

---

## 2. Scope

### 2.1 In Scope

| Module | Application | Type |
|--------|-------------|------|
| Authentication & Token Management | HTS Portal | Functional |
| Appointments — List, Filter, Actions | HTS Portal | Functional |
| Booking — CS/HCT & Bulk | HTS Portal | Functional |
| Roles & Teams Management | HTS Portal | Functional |
| Access Control (RBAC) | HTS Portal | Functional |
| Dashboard Stats | HTS Portal | Functional |
| Doctor Portal — Full Consultation Flow | HTS Portal | Functional |
| My Profile | HTS Portal | Functional |
| Help & Leave Requests | HTS Portal | Functional |
| Navigation / Sidebar | HTS Portal | Functional |
| Landing Page Sections (Hero, FAQ, Doctors, etc.) | Kapiva HER | UI/Functional |
| Booking Flow — 3 Steps (Details → Slot → Doctor) | Kapiva HER | Functional |
| Booking Validations (email, phone, state) | Kapiva HER | Functional |
| Quiz Flow — 13 Questions | Kapiva HER | Functional |
| Quiz Result Page — PMOS Type & Products | Kapiva HER | Functional |
| Doctor Switch Before Confirmation | Kapiva HER | Functional |
| Shop Now & UTM Attribution | Kapiva HER | Functional |
| OmniCare Mobile Concern Flow | OmniCare | Functional |

### 2.2 Out of Scope

- Payment gateway testing
- Performance / load testing
- Cross-browser testing (Firefox, Safari) — Chromium only
- Native mobile app testing (iOS / Android)
- Backend / API-only testing (no UI)
- Third-party integrations (Razorpay, SMS OTP)

---

## 3. Test Objectives

1. Validate all critical user journeys work end-to-end on staging
2. Ensure booking + quiz flow completes without errors on Kapiva HER
3. Verify RBAC — each role sees only what it is permitted to see
4. Confirm form validations block invalid inputs at the UI level
5. Detect regressions early when new features are released
6. Validate doctor consultation workflow (prescriptions, reschedule, cancel, transfer)
7. Ensure Slack alerts fire on test failures so the team is notified immediately

---

## 4. Test Environment

### 4.1 Applications Under Test

| Application | URL | Type |
|-------------|-----|------|
| HTS Admin Portal | `https://stg-hts.kapiva.tech/` | Staging |
| Kapiva HER | `https://staging.kapivaher.com/` | Staging |

### 4.2 Browser & Device

| Setting | Value |
|---------|-------|
| Browser | Google Chrome (real installed Chrome via `channel: 'chrome'`) |
| Device Emulation | Pixel 7 (Kapiva HER), Desktop Chrome (HTS Portal) |
| Viewport | 412×915 (mobile), 1280×720 (desktop) |
| Headless | true |

### 4.3 Test Machine

| Setting | Value |
|---------|-------|
| OS | macOS (darwin) |
| Node.js | v20+ |
| Playwright | v1.58.2 |
| Shell | zsh |

### 4.4 Credentials

Stored in `.env` (gitignored). Never committed to version control.

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | HTS Admin login |
| `DOCTOR_EMAIL` / `DOCTOR_PASSWORD` | Doctor portal login |
| `SLACK_BOT_TOKEN` | Failure alert notifications |
| `SLACK_CHANNEL_ID` | `#app-automation` channel |

---

## 5. Test Approach

### 5.1 Testing Type

| Type | Applied To |
|------|-----------|
| Functional Testing | All modules |
| End-to-End Testing | Booking + Quiz flows, Doctor full flow, Auth flows |
| UI Validation | Landing page sections, form validations |
| Regression Testing | Full suite run after each release |
| Smoke Testing | P1 tests only (27 critical tests) |

### 5.2 Test Design Technique

- **Happy path first** — verify the golden path works before edge cases
- **Boundary testing** — invalid email, invalid phone, short inputs
- **State-based testing** — role-based access (admin vs doctor vs team lead)
- **Error path testing** — API failures, unauthorized access, booking failures

### 5.3 Execution Strategy

| Run Type | When | Command |
|----------|------|---------|
| Smoke (P1 only) | Before every deployment | `npm run test:kapiva-her:booking` |
| Regression (full suite) | After every release | `npm run test:kapiva-her` |
| Module-specific | When a module changes | `npm run test:auth` / `test:appointments` etc. |
| CI/CD | On every PR merge | GitHub Actions |

### 5.4 Workers & Retry

| Setting | Local | CI |
|---------|-------|-----|
| Workers | 1 (sequential) | 1 |
| Retries | 1 | 2 |
| Timeout | Per test (60–300s) | Per test |

> `--workers=1` is mandatory for Kapiva HER tests — staging allows only one active booking session at a time.

---

## 6. Test Modules & Coverage

### 6.1 HTS Admin Portal

#### Authentication
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-001 | Login with valid credentials redirects to dashboard | P1 |
| TC-002 | Login with invalid credentials shows error toast | P1 |
| TC-003 | Login with empty fields shows validation toast | P1 |
| TC-004 | Expired access token is auto-refreshed on 401 | P1 |
| TC-005 | Failed token refresh clears auth and redirects to login | P1 |
| TC-006 | Logout clears tokens and redirects to login | P1 |
| TC-007 | Unauthenticated access to protected route redirects to login | P1 |
| TC-008 | Mid-session 401 → auto-refresh → retry original request | P1 |
| TC-009 | Network failure on API call shows error toast | P1 |

#### Appointments
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-010 | Appointments list loads and renders cards | P1 |
| TC-011 | Filter by status — toggle Upcoming chip | P2 |
| TC-012 | Filter by status — multiple chips active simultaneously | P2 |
| TC-013 | Filter by date — navigate next/previous day, reset Today | P2 |
| TC-014 | Filter by consultant — react-select updates URL | P2 |
| TC-015 | Filter by therapy — react-select updates URL | P2 |
| TC-016 | Appointment details — renders tabs and patient name | P1 |
| TC-017 | Appointment details — actions menu shows Cancel, Reschedule, Transfer | P2 |
| TC-018 | Reschedule — fills date/time and submits API call | P2 |
| TC-019 | Reschedule — submit disabled when no slots available | P2 |
| TC-020 | Transfer — fills date/time and submits API call | P2 |
| TC-021 | Transfer — warning when no other consultant available | P2 |
| TC-022 | Cancel — fill reason, submit, success toast | P1 |
| TC-023 | Cancel — API error shows error toast | P2 |
| TC-024 | Send Reminder — click button, get toast | P2 |
| TC-025 | Raise a Ticket — fill form and submit | P2 |
| TC-026 | Call — click Call button, validate API payload | P2 |
| TC-027 | Profiles — open Create New Profile, fill and submit | P2 |
| TC-028 | Consulted — full 5-tab flow (vitals, lab, history, lifestyle, medication) | P1 |
| TC-029 | Dispose: Not Consulted → Busy → Submit | P1 |
| TC-030 | Dispose: Not Needed → Wrong Number → Submit | P2 |
| TC-031 | Dispose: DND → Auto reason → Submit | P2 |
| TC-032 | Patient 360 — Overview, Past Consultations, Orders | P2 |

#### Booking
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-033 | CS/HCT Booking page loads with Program tab | P1 |
| TC-034 | Phone search shows patient details and date slots | P1 |
| TC-035 | Non-eligible phone shows error, hides patient details | P2 |
| TC-036 | Select date and slot enables Book Consultation | P1 |
| TC-037 | Submit booking shows success toast, resets form | P1 |
| TC-038 | Reset button clears phone and hides patient details | P2 |
| TC-039 | Booking API failure shows error toast | P1 |
| TC-040 | BAU tab loads with placeholder content | P2 |
| TC-041 | Invalid phone keeps Search button disabled | P2 |
| TC-042 | Bulk Book page loads without errors | P2 |
| TC-043 | Bulk Book not accessible without auth | P2 |

#### Roles & Teams
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-044 | Roles page loads and displays roles list | P2 |
| TC-045 | Non-admin role: /roles page is blocked | P2 |
| TC-046 | Admin can view role details | P2 |
| TC-047 | Create role — API returns success | P2 |
| TC-048 | Update role — API returns success | P2 |
| TC-049 | Delete role — API returns success | P2 |
| TC-050 | Roles page handles API error gracefully | P2 |
| TC-051 | Unauthenticated access to /roles redirects to login | P2 |
| TC-052 | Teams page loads and displays teams list | P2 |
| TC-053 | Non-admin role: /teams page is blocked | P2 |
| TC-054 | Admin can view team details | P2 |
| TC-055 | Create team — API returns success | P2 |
| TC-056 | Update team — API returns success | P2 |
| TC-057 | Delete team — API returns success | P2 |
| TC-058 | Team members list loads correctly | P2 |
| TC-059 | Teams page handles API error gracefully | P2 |
| TC-060 | Unauthenticated access to /teams redirects to login | P2 |

#### Access Control (RBAC)
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-061 | Admin role: all sidebar menu items visible | P2 |
| TC-062 | Doctor role: restricted to /appointments only | P2 |
| TC-063 | Unauthorized page access redirects to /error/unauthorized | P2 |
| TC-064 | Team Lead: access appointments and doctors-list only | P2 |
| TC-065 | Unauthenticated access redirects to login | P2 |
| TC-066 | Doctor role: Edit buttons hidden on doctors-list | P2 |
| TC-067 | Inactive user — documents app behaviour | P2 |

#### Doctor Portal
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-068 | Doctor login | P2 |
| TC-069 | Doctor dashboard loads | P2 |
| TC-070 | Full consultation flow — Sindhu → Santosh | P1 |
| TC-071 | Generate prescription | P1 |
| TC-072 | Reschedule appointment | P2 |
| TC-073 | Reschedule and cancel | P2 |
| TC-074 | Cancel appointment | P2 |
| TC-075 | Call patient | P3 |
| TC-076 | Send reminder | P3 |
| TC-077 | Raise support ticket | P3 |
| TC-078 | Transfer with next day fallback | P3 |
| TC-079 | Consultation 360 — Create Profile | P2 |

#### Other
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-080 | Dashboard loads with all 4 stat cards | P3 |
| TC-081 | Dashboard shows % change, from-last-week text | P3 |
| TC-082 | Dashboard loading spinners while fetching | P3 |
| TC-083 | Dashboard API failure shows fallback zero values | P3 |
| TC-084 | Dashboard not accessible without auth | P3 |
| TC-085 | Capacity — real login, click Load, get all values | P3 |
| TC-086 | Help page loads with all 4 sections | P3 |
| TC-087 | Submit concern form shows success toast | P3 |
| TC-088 | Submit leave request shows success toast | P3 |
| TC-089 | Working Hours section renders day rows | P3 |
| TC-090 | My Profile page loads with normal user data | P3 |
| TC-091 | Upload profile photo — success toast | P3 |
| TC-092 | File >200KB shows validation toast | P3 |
| TC-093 | Consultant user sees extended profile fields | P3 |
| TC-094 | Sidebar — click each menu item, log page content | P3 |

---

### 6.2 Kapiva HER (PMOSolve)

#### Landing Page
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-095 | Hero section — headings, trust badges, CTA link | P3 |
| TC-096 | Symptoms section — tiles and heading | P3 |
| TC-097 | Comparison section — heading visible | P3 |
| TC-098 | Doctors section — BAMS badge, Consult Now link | P3 |
| TC-099 | How it works — PCOSolve plan heading and step images | P3 |
| TC-100 | FAQ section — heading, accordion expand | P3 |
| TC-101 | Symptom tiles — Infertility removed, Mood & Motivation added | P3 |
| TC-102 | Sticky CTA — price, Free label, 100% OFF text | P3 |
| TC-103 | Testimonials section — transformation stories visible | P3 |
| TC-104 | Shop Products link — visible, points to womens-health | P3 |
| TC-105 | UTM attribution — params preserved in Shop Products link | P3 |
| TC-106 | Homepage banner — hero PMOS heading visible | P2 |

#### Booking Flow
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-107 | Booking via doctor card — Consult Now leads to /booking | P1 |
| TC-108 | Booking form validation — Next button state | P2 |
| TC-109 | Booking form — invalid email keeps Next disabled | P2 |
| TC-110 | Booking form — invalid phone keeps Next disabled | P2 |
| TC-111 | Booking form — State dropdown present, Next enabled | P2 |
| TC-112 | Booking slot selection — Step 2/3 | P2 |
| TC-113 | Booking — back navigation between steps | P2 |
| TC-114 | Booking — different date tabs load new slots | P2 |
| TC-115 | Booking Step 3 — doctor cards show name and speciality | P2 |
| TC-116 | Booking Step 3 — switch selected doctor before confirming | P1 |
| TC-117 | Booking confirmation details — full flow | P1 |
| TC-118 | Shantavri booking + quiz — full end-to-end (412×815) | P1 |
| TC-119 | Consult Now — doctor card → booking → quiz (Pixel 7) | P1 |

#### Quiz
| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-120 | Quiz full flow — answer all 13 questions, reach result | P1 |
| TC-121 | Quiz Q13 — skippable, Next/Submit enabled without selection | P2 |
| TC-122 | Quiz result page — PMOS heading and recommendations visible | P2 |
| TC-123 | Quiz without booking — shows "No active booking found" | P2 |

### 6.3 OmniCare

| Test ID | Test Case | Priority |
|---------|-----------|----------|
| TC-124 | Guest User → Select Concern (Omnichannel flow) | P3 |

---

## 7. Test Cases Summary

| Priority | Count | % of Total |
|----------|-------|------------|
| 🔴 P1 — Critical | 27 | 22% |
| 🟠 P2 — High | 67 | 54% |
| 🟡 P3 — Medium | 30 | 24% |
| **Total** | **124** | **100%** |

| Module | Test Count |
|--------|-----------|
| Authentication | 9 |
| Appointments | 23 |
| Booking (Admin) | 11 |
| Roles & Teams | 17 |
| Access Control | 7 |
| Doctor Portal | 12 |
| Admin Other (Dashboard, Help, Profile, Nav) | 15 |
| Kapiva HER — Landing Page | 12 |
| Kapiva HER — Booking | 13 |
| Kapiva HER — Quiz | 4 |
| OmniCare | 1 |
| **Total** | **124** |

---

## 8. Entry & Exit Criteria

### 8.1 Entry Criteria

- Staging environment is up and accessible
- Test credentials are valid and stored in `.env`
- `npm install` completed — all dependencies installed
- `npx playwright install chromium` done
- Feature under test is deployed to staging

### 8.2 Exit Criteria

| Criteria | Target |
|----------|--------|
| P1 tests pass rate | 100% |
| P2 tests pass rate | ≥ 95% |
| P3 tests pass rate | ≥ 90% |
| No P1 test failing after retries | Mandatory |
| Allure report generated | Mandatory |
| Slack notification sent on failure | Mandatory |

---

## 9. Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Staging site down / unreachable | High | Retry logic (2 retries on CI), Slack alert |
| PCOS → PMOS rebrand changes UI text | High | All selectors use `/pcos\|pmos/i` regex |
| Staging API slow / timing out | High | `slowMo: 300`, per-test timeouts 60–300s |
| Doctor unavailable on Step 3 | Medium | Retry with next doctor card |
| Booking fails (slot conflict) | Medium | `bookingFailed` detection + retry with next doctor |
| Quiz result page uses non-semantic headings | Low | Fallback to body text check if h1/h2/h3 not found |
| State auto-selected on staging | Low | Tests check presence + enabled state, not disabled state |
| Cloudflare bot detection | Medium | Real Chrome channel, custom userAgent, stealth args |

---

## 10. Test Deliverables

| Deliverable | Location | Format |
|-------------|----------|--------|
| Test Plan | `docs/TEST_PLAN.md` | Markdown |
| Spec Files (55 files) | `tests/` | JavaScript / TypeScript |
| Allure Report | `allure-report/` | HTML |
| Playwright HTML Report | `playwright-report/` | HTML |
| Failure Screenshots | `test-results/screenshots/` | PNG |
| Slack Failure Alerts | `#app-automation` channel | Slack message |
| Test Execution Traces | `test-results/*/trace.zip` | Playwright trace |

---

## 11. Tools & Framework

| Tool | Version | Purpose |
|------|---------|---------|
| Playwright | 1.58.2 | Browser automation framework |
| Node.js | 20+ | Runtime |
| Allure Playwright | 2.15.1 | Rich test reporting |
| allure-commandline | 2.38.1 | Report generation CLI |
| dotenv | 17.4.2 | Environment variable management |
| playwright-extra | 4.3.6 | Stealth plugin support |
| puppeteer-extra-plugin-stealth | 2.11.2 | Bypass bot detection |
| GitHub Actions | — | CI/CD pipeline |

### Reporter Configuration

```
Allure  →  allure-results/  →  allure-report/   (rich charts + history)
HTML    →  playwright-report/                    (built-in Playwright report)
Slack   →  #app-automation                      (failure notifications only)
```

---

## 12. Defect Management

### Severity Levels

| Severity | Definition | Example |
|----------|-----------|---------|
| S1 — Critical | Blocks core user journey | Booking cannot be completed |
| S2 — High | Major feature broken | Quiz result page blank |
| S3 — Medium | Feature partially broken | Wrong product shown on result |
| S4 — Low | UI issue, no functional impact | Label text mismatch |

### Defect Workflow

```
Found in test → Screenshot attached → Reported to dev team → Fix deployed to staging → Re-test → Closed
```

### Slack Alert Format (auto-generated)

```
❌ TEST FAILURES — Kapiva HER Suite
Failed: 2 | Passed: 27 | Skipped: 0
• booking_doctor_filter — Step 3 doctor cards
• quiz_result_page — PMOS heading not found
Environment: Staging | Time: 2026-06-02 11:30 IST
```

---

## 13. Schedule

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Smoke test (P1 only) | Before every deployment | QA / CI |
| Full regression run | After every release | QA |
| New spec addition | When new feature released | QA Automation |
| Test plan review | Monthly | QA Lead |
| Flaky test audit | Weekly | QA Automation |
| Allure report review | After every run | QA / Dev |

---

## Appendix — npm Run Scripts

```bash
# Run full Kapiva HER suite
npm run test:kapiva-her

# Run booking + quiz tests only (P1 smoke)
npm run test:kapiva-her:booking

# Run landing page + UI tests
npm run test:kapiva-her:ui

# Run specific modules (HTS Portal)
npm run test:auth
npm run test:appointments
npm run test:booking
npm run test:roles
npm run test:teams
npm run test:doctor

# Generate and open Allure report
npm run allure:report

# Open Playwright HTML report
npm run report:html
```

---

*Document prepared by QA Automation Team — Kapiva Health Tech*  
*For queries contact: santosh.kumbar@kapiva.in*
