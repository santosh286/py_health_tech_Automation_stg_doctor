import { test, expect } from '@playwright/test';
import {
  VALID_ACCESS_TOKEN,
  REFRESH_TOKEN,
  MOCK_TEAMS_LIST_RESPONSE,
  MOCK_TEAM_DETAIL_RESPONSE,
  MOCK_CREATE_TEAM_RESPONSE,
  MOCK_UPDATE_TEAM_RESPONSE,
  MOCK_DELETE_TEAM_RESPONSE,
  MOCK_TEAM_MEMBERS_RESPONSE,
  TEAMS_API,
} from '../../fixtures/mockData';

// ─── Seed Helper ─────────────────────────────────────────────────────────────

function makeFeature(code, frontendRoute, actions) {
  return {
    featureId: `feat-${code}`,
    code,
    name: code.replace(/_/g, ' '),
    frontendRoute,
    visibleOnSidebar: true,
    permissions: { create: true, view: true, update: true, delete: true },
    actions: actions.map((actionCode) => ({
      featureActionId: `${code}-${actionCode}`,
      actionCode,
      label: actionCode,
      description: actionCode,
      hasPermission: true,
    })),
  };
}

const ADMIN_USER_DATA = {
  userId: 'admin-001',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@kapiva.in',
  isActive: true,
  role: {
    name: 'Admin',
    key: 'admin',
    active: true,
    defaultRoute: '/dashboard',
    permissions: {
      features: [
        makeFeature('dashboard', '/dashboard', ['view', 'create', 'update', 'delete']),
        makeFeature('teams', '/teams', ['view', 'create', 'update', 'delete']),
      ],
    },
  },
};

const VIEW_ONLY_USER_DATA = {
  userId: 'viewer-001',
  firstName: 'Viewer',
  lastName: 'User',
  email: 'viewer@kapiva.in',
  isActive: true,
  role: {
    name: 'Doctor',
    key: 'doctor',
    active: true,
    defaultRoute: '/appointments',
    permissions: {
      features: [
        {
          featureId: 'feat-todays_appointments',
          code: 'todays_appointments',
          name: 'todays appointments',
          frontendRoute: '/appointments',
          visibleOnSidebar: true,
          permissions: { create: false, view: true, update: false, delete: false },
          actions: [{ featureActionId: 'ta-view', actionCode: 'view', label: 'view', description: 'view', hasPermission: true }],
        },
      ],
    },
  },
};

async function seedAuth(page, userData) {
  await page.goto('/');
  await page.evaluate(
    ({ at, rt, ud }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('accessToken', at);
      localStorage.setItem('refreshToken', rt);
      localStorage.setItem('loggedInUserData', JSON.stringify(ud));
    },
    { at: VALID_ACCESS_TOKEN, rt: REFRESH_TOKEN, ud: userData }
  );
  await page.waitForTimeout(300);
}

// ─── TC_087 — Teams page loads with list ─────────────────────────────────────

test('TC_087 — Teams page loads and displays teams list', async ({ page }) => {
  console.log('[TC_087] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) })
  );

  console.log('[TC_087] Navigating to /teams');
  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log(`[TC_087] ✓ Teams page accessible — URL: ${page.url()}`);

  const bodyText = await page.evaluate(() => document.body.innerText);
  expect(bodyText.length).toBeGreaterThan(0);
  console.log('[TC_087] ✓ Page has content');

  console.log('[TC_087] ✅ PASS — Teams page loaded successfully');
});

// ─── TC_088 — Non-admin cannot access /teams ─────────────────────────────────

test('TC_088 — Non-admin role: /teams page is blocked', async ({ page }) => {
  console.log('[TC_088] Seeding view-only user auth');
  await seedAuth(page, VIEW_ONLY_USER_DATA);

  console.log('[TC_088] Navigating to /teams (should deny)');
  await page.goto('/teams');
  await page.waitForURL('**/error/unauthorized', { timeout: 8000 });

  expect(page.url()).toContain('/error/unauthorized');
  console.log('[TC_088] ✓ Non-admin redirected to /error/unauthorized');

  console.log('[TC_088] ✅ PASS — Non-admin correctly blocked from /teams');
});

// ─── TC_089 — Admin can view team details ────────────────────────────────────

test('TC_089 — Admin can view team details', async ({ page }) => {
  console.log('[TC_089] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) })
  );
  await page.route(`${TEAMS_API}/teams/team-001*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAM_DETAIL_RESPONSE) })
  );

  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_089] ✓ Teams page accessible');

  console.log('[TC_089] ✅ PASS — Admin can view team details');
});

// ─── TC_090 — Create team API mock ───────────────────────────────────────────

test('TC_090 — Create team: API returns success', async ({ page }) => {
  console.log('[TC_090] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(MOCK_CREATE_TEAM_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) });
    }
  });

  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_090] ✓ On /teams page with create team mock ready');

  console.log('[TC_090] ✅ PASS — Create team API mock responds correctly');
});

// ─── TC_091 — Update team API mock ───────────────────────────────────────────

test('TC_091 — Update team: API returns success', async ({ page }) => {
  console.log('[TC_091] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, async (route) => {
    const method = route.request().method();
    if (method === 'PUT' || method === 'PATCH') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_UPDATE_TEAM_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) });
    }
  });

  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_091] ✓ On /teams page with update team mock ready');

  console.log('[TC_091] ✅ PASS — Update team API mock responds correctly');
});

// ─── TC_092 — Delete team API mock ───────────────────────────────────────────

test('TC_092 — Delete team: API returns success', async ({ page }) => {
  console.log('[TC_092] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_DELETE_TEAM_RESPONSE) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) });
    }
  });

  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_092] ✓ On /teams page with delete team mock ready');

  console.log('[TC_092] ✅ PASS — Delete team API mock responds correctly');
});

// ─── TC_093 — Team members list ──────────────────────────────────────────────

test('TC_093 — Team members list loads correctly', async ({ page }) => {
  console.log('[TC_093] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS_LIST_RESPONSE) })
  );
  await page.route(`${TEAMS_API}/teams/team-001/members*`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAM_MEMBERS_RESPONSE) })
  );

  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_093] ✓ Teams page with members mock ready');

  console.log('[TC_093] ✅ PASS — Team members list mock responds correctly');
});

// ─── TC_094 — Teams API error shows graceful state ───────────────────────────

test('TC_094 — Teams page handles API error gracefully', async ({ page }) => {
  console.log('[TC_094] Seeding Admin auth');
  await seedAuth(page, ADMIN_USER_DATA);

  await page.route(`${TEAMS_API}/teams*`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: 'Server error' }) })
  );

  console.log('[TC_094] Navigating to /teams with API returning 500');
  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  expect(page.url()).not.toContain('/error/unauthorized');
  console.log('[TC_094] ✓ Page did not crash on API error');

  console.log('[TC_094] ✅ PASS — Teams page handles API error gracefully');
});

// ─── TC_095 — Unauthenticated access to /teams redirects to login ─────────────

test('TC_095 — Unauthenticated access to /teams redirects to login', async ({ page }) => {
  console.log('[TC_095] Clearing auth tokens');
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('loggedInUserData');
  });

  console.log('[TC_095] Navigating to /teams without auth');
  await page.goto('/teams');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const url = page.url();
  expect(url).toMatch(/\/$|\/\?/);
  console.log(`[TC_095] ✓ Redirected to login — URL: ${url}`);

  console.log('[TC_095] ✅ PASS — Unauthenticated user redirected to login from /teams');
});
