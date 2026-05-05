# Merge health-tech-suite Specs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy all 11 new TypeScript Playwright spec files from `/Users/santoshkumbar/health-tech-suite/tests/` into the current project under `tests/` without touching any existing doctor or omnicare specs.

**Architecture:** New specs land in feature-named subdirectories under `tests/` (matching the existing pattern). A shared `fixtures/mockData.ts` provides mock tokens and API response data that the new specs import. The existing `playwright.config.js`, Allure reporter, and `global-setup.js` remain untouched — new specs automatically inherit them.

**Tech Stack:** Playwright (TypeScript), Node.js, dotenv, Allure reporter

---

## File Map

| Action | File |
|--------|------|
| Create | `fixtures/mockData.ts` |
| Create | `.env.example` |
| Create | `tests/auth/auth.spec.ts` |
| Create | `tests/appointments/appointments.spec.ts` |
| Create | `tests/booking/bulk-book.spec.ts` |
| Create | `tests/booking/cs-hct-booking.spec.ts` |
| Create | `tests/capacity/capacity.spec.ts` |
| Create | `tests/dashboard/dashboard.spec.ts` |
| Create | `tests/doctors-list/doctors-list.spec.ts` |
| Create | `tests/help/help.spec.ts` |
| Create | `tests/my-profile/my-profile.spec.ts` |
| Create | `tests/navigation/sidebar.spec.ts` |
| Create | `tests/access-control/access-control.spec.ts` |
| Modify | `package.json` — add `dotenv` devDependency + new test scripts |

---

## Task 1: Copy shared fixtures

**Files:**
- Create: `fixtures/mockData.ts`

- [ ] **Step 1: Copy mockData.ts from source**

```bash
cp /Users/santoshkumbar/health-tech-suite/tests/fixtures/mockData.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/fixtures/mockData.ts
```

- [ ] **Step 2: Verify the file exists and has content**

```bash
wc -l /Users/santoshkumbar/Projects/py_health_tech_Automation/fixtures/mockData.ts
```
Expected: line count > 0

- [ ] **Step 3: Commit**

```bash
git add fixtures/mockData.ts
git commit -m "feat: add shared mockData.ts fixtures for new e2e specs"
```

---

## Task 2: Add dotenv support and .env.example

**Files:**
- Modify: `package.json`
- Create: `.env.example`

- [ ] **Step 1: Install dotenv**

```bash
npm install --save-dev dotenv
```

- [ ] **Step 2: Copy .env.example from source**

```bash
cp /Users/santoshkumbar/health-tech-suite/tests/.env.example \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/.env.example
```

- [ ] **Step 3: Verify .env.example exists**

```bash
cat /Users/santoshkumbar/Projects/py_health_tech_Automation/.env.example
```
Expected: Shows BASE_URL, AUTH_SERVICE_URL, TEST_USER_EMAIL, TEST_USER_PASSWORD lines.

- [ ] **Step 4: Add convenience run scripts to package.json**

Open `package.json` and add these entries inside `"scripts"`:

```json
"test:auth": "npx playwright test tests/auth/",
"test:appointments": "npx playwright test tests/appointments/",
"test:dashboard": "npx playwright test tests/dashboard/",
"test:booking": "npx playwright test tests/booking/",
"test:capacity": "npx playwright test tests/capacity/",
"test:navigation": "npx playwright test tests/navigation/",
"test:doctors-list": "npx playwright test tests/doctors-list/",
"test:access-control": "npx playwright test tests/access-control/",
"test:help": "npx playwright test tests/help/",
"test:my-profile": "npx playwright test tests/my-profile/"
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "feat: add dotenv, .env.example, and per-module test scripts"
```

---

## Task 3: Copy auth spec

**Files:**
- Create: `tests/auth/auth.spec.ts`

- [ ] **Step 1: Create directory and copy file**

```bash
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/auth
cp /Users/santoshkumbar/health-tech-suite/tests/e2e/auth/auth.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/auth/auth.spec.ts
```

- [ ] **Step 2: Verify import paths resolve correctly**

The file imports from `../../fixtures/mockData`. From `tests/auth/`, `../../fixtures/` resolves to `fixtures/` at project root — which is correct.

```bash
head -10 /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/auth/auth.spec.ts
```
Expected: Shows `import ... from "../../fixtures/mockData"`.

- [ ] **Step 3: Commit**

```bash
git add tests/auth/auth.spec.ts
git commit -m "feat: add auth e2e spec (7 tests — login, logout, token refresh)"
```

---

## Task 4: Copy appointments spec

**Files:**
- Create: `tests/appointments/appointments.spec.ts`

- [ ] **Step 1: Create directory and copy file**

```bash
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/appointments
cp /Users/santoshkumbar/health-tech-suite/tests/e2e/appointments/appointments.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/appointments/appointments.spec.ts
```

- [ ] **Step 2: Verify line count (this is a large file)**

```bash
wc -l /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/appointments/appointments.spec.ts
```
Expected: ~1100+ lines.

- [ ] **Step 3: Commit**

```bash
git add tests/appointments/appointments.spec.ts
git commit -m "feat: add appointments e2e spec (19 tests — list, filters, actions, disposition)"
```

---

## Task 5: Copy booking specs

**Files:**
- Create: `tests/booking/bulk-book.spec.ts`
- Create: `tests/booking/cs-hct-booking.spec.ts`

- [ ] **Step 1: Create directory and copy both files**

```bash
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/booking
cp /Users/santoshkumbar/health-tech-suite/tests/e2e/booking/bulk-book.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/booking/bulk-book.spec.ts
cp /Users/santoshkumbar/health-tech-suite/tests/e2e/booking/cs-hct-booking.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/booking/cs-hct-booking.spec.ts
```

- [ ] **Step 2: Verify both files exist**

```bash
ls /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/booking/
```
Expected: `bulk-book.spec.ts  cs-hct-booking.spec.ts`

- [ ] **Step 3: Commit**

```bash
git add tests/booking/
git commit -m "feat: add booking e2e specs (bulk-book stub + cs-hct-booking 9 tests)"
```

---

## Task 6: Copy capacity, dashboard, navigation specs

**Files:**
- Create: `tests/capacity/capacity.spec.ts`
- Create: `tests/dashboard/dashboard.spec.ts`
- Create: `tests/navigation/sidebar.spec.ts`

- [ ] **Step 1: Create directories and copy files**

```bash
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/capacity
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/dashboard
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/navigation

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/capacity/capacity.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/capacity/capacity.spec.ts

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/dashboard/dashboard.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/dashboard/dashboard.spec.ts

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/navigation/sidebar.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/navigation/sidebar.spec.ts
```

- [ ] **Step 2: Verify**

```bash
ls /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/capacity/ && \
ls /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/dashboard/ && \
ls /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/navigation/
```
Expected: One `.spec.ts` file in each directory.

- [ ] **Step 3: Commit**

```bash
git add tests/capacity/ tests/dashboard/ tests/navigation/
git commit -m "feat: add capacity, dashboard, and navigation/sidebar e2e specs"
```

---

## Task 7: Copy doctors-list, help, my-profile, access-control specs

**Files:**
- Create: `tests/doctors-list/doctors-list.spec.ts`
- Create: `tests/help/help.spec.ts`
- Create: `tests/my-profile/my-profile.spec.ts`
- Create: `tests/access-control/access-control.spec.ts`

- [ ] **Step 1: Create directories and copy files**

```bash
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/doctors-list
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/help
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/my-profile
mkdir -p /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/access-control

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/doctors-list/doctors-list.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/doctors-list/doctors-list.spec.ts

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/help/help.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/help/help.spec.ts

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/my-profile/my-profile.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/my-profile/my-profile.spec.ts

cp /Users/santoshkumbar/health-tech-suite/tests/e2e/access-control/access-control.spec.ts \
   /Users/santoshkumbar/Projects/py_health_tech_Automation/tests/access-control/access-control.spec.ts
```

- [ ] **Step 2: Verify all 4 files exist**

```bash
find /Users/santoshkumbar/Projects/py_health_tech_Automation/tests \
  -name "*.spec.ts" | grep -E "doctors-list|help|my-profile|access-control"
```
Expected: 4 lines, one per spec file.

- [ ] **Step 3: Commit**

```bash
git add tests/doctors-list/ tests/help/ tests/my-profile/ tests/access-control/
git commit -m "feat: add doctors-list, help, my-profile, access-control e2e specs"
```

---

## Task 8: Smoke-run one new spec to verify no breakage

- [ ] **Step 1: Run auth spec (uses mocks only, no real login needed)**

```bash
cd /Users/santoshkumbar/Projects/py_health_tech_Automation && \
npx playwright test tests/auth/ --reporter=list 2>&1 | tail -20
```
Expected: Tests pass or show meaningful failures (not import errors or config errors).

- [ ] **Step 2: Confirm existing doctor specs still pass**

```bash
npx playwright test tests/doctor/authentication.spec.js --reporter=list 2>&1 | tail -10
```
Expected: Test passes exactly as before.

- [ ] **Step 3: If any import errors appear, check the mockData path**

If you see `Cannot find module '../../fixtures/mockData'`, verify:
```bash
ls /Users/santoshkumbar/Projects/py_health_tech_Automation/fixtures/mockData.ts
```
The file must exist at `fixtures/mockData.ts` (project root level).

---

## Task 9: Final verification and push

- [ ] **Step 1: List all spec files to confirm structure**

```bash
find /Users/santoshkumbar/Projects/py_health_tech_Automation/tests -name "*.spec.*" | sort
```
Expected: 14 original specs + 11 new specs = 25 total spec files.

- [ ] **Step 2: Confirm no uncommitted changes**

```bash
git status
```
Expected: `nothing to commit, working tree clean`

- [ ] **Step 3: Push branch to remote**

```bash
git push origin new_docotor_scrpit
```
Expected: Branch pushed successfully.

---

## What is NOT changed

- `tests/doctor/*.spec.js` — all 12 files untouched
- `tests/omnicare_flow/mobile_concern.spec.js` — untouched
- `playwright.config.js` — untouched (Allure reporter, baseURL, global setup all preserved)
- `global-setup.js` / `global-teardown.js` — untouched
- `fixtures/doctors.json`, `users.json`, `guest_users.json` — untouched
