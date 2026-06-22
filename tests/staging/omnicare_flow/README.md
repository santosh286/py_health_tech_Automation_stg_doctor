# OmniCare Flow Tests

**Target:** `https://staging.kapiva.in/` (Cloudflare-protected)
**Device:** Pixel 7 mobile emulation
**Browser:** Real Chrome + stealth patches

## Test: Guest User → Select Concern (Omnichannel Flow)

`mobile_concern.spec.js`

Full guest user purchase journey on mobile, 26 steps:

| Step | Action |
|------|--------|
| 1 | Generate unique phone / email / name |
| 2 | Open staging.kapiva.in |
| 3 | Dismiss staging popup |
| 4 | Verify SELECT CONCERN section visible |
| 5 | Click "Blood Sugar & Chronic Care" concern |
| 6 | Verify selected concern label |
| 7 | Click "View All Blood Sugar" → navigate to /solution/ page |
| 8 | Loop product grid → find "Dia Free Juice - Blood Sugar Management" |
| 9 | Click product → navigate to PDP |
| 10 | Verify "Select a Pack" section |
| 11 | Click first AOV pack |
| 12 | Click BUY NOW |
| 13 | Wait for checkout page URL |
| 14 | Handle Shiprocket widget OTP (if visible) → enter phone |
| 15 | Fill address, pincode, email, name → Save Changes |
| 18 | Scroll → click PAY SECURELY |
| 19 | Wait for payment section `#80000141` → click radio |
| 20 | Click Proceed to Pay |
| 21 | Wait for modal → open `txnStateDropdownToggle` |
| 22 | Select "CHARGED" → click Submit |
| 23 | Handle "Something Went Wrong" → Try Again if visible |
| 24 | Click Confirm Booking → wait for confirmation |
| 25 | Extract doctor name + booking time |
| 26 | Save guest user to `fixtures/guest_users.json` |

## Cloudflare Handling

`waitForCloudflare(page, label, timeoutMs)` polls every 2s for up to 20s for the JS challenge to auto-resolve before throwing.

Called at:
- Homepage (Step 2)
- /solution/ page (Step 7)
- PDP (Step 9)

Anti-bot patches applied via `applyStealthScripts(page)` from `tests/helpers/stealth.js`.

## Running

```bash
npm run test:omnicare
# or
npx playwright test tests/omnicare_flow/mobile_concern.spec.js
```

## CI

GitHub Actions: `.github/workflows/omnicare-mobile-concern.yml`
Triggered on push/PR to `main` touching this file.
