# User Management Tests

**Target:** `https://stg-hts.kapiva.tech`
**Pages:** `/users-management`, `/roles`, `/teams`
**Source:** `health-tech-suite/apps/frontend/care-studio`

## Spec Files

| File | Test Cases | What It Tests |
|------|-----------|---------------|
| `user_list.spec.js` | TC01–TC04 | User list load, search, click to view profile |
| `create_user.spec.js` | TC05–TC07 | Create form open, validation, bulk mode |
| `roles.spec.js` | TC08–TC12 | Roles list, add role, edit, view users |
| `teams.spec.js` | TC13–TC19 | Teams list, create, edit, members, status toggle |
| `access_control.spec.js` | TC20–TC25 | Admin access to all 3 pages + sidebar links |

## Total Test Cases: 25

## Run Commands

```bash
# Run all user management tests
npx playwright test tests/staging/user_management/

# Run individual spec
npx playwright test tests/staging/user_management/user_list.spec.js
npx playwright test tests/staging/user_management/roles.spec.js
npx playwright test tests/staging/user_management/teams.spec.js
npx playwright test tests/staging/user_management/create_user.spec.js
npx playwright test tests/staging/user_management/access_control.spec.js
```
