# DiafFree MVP Tests

**Target:** Kapiva Staging — 100-day Dia Free Transform purchase flow
**Device:** Pixel 7 mobile emulation
**Workers:** 1 (sequential — full end-to-end payment flow)

## Test Files

| File | Steps | Description |
|------|-------|-------------|
| `diafree_mvp.spec.js` | 26 | Original flow — homepage to doctor booking confirmation |
| `diafree_mvp_v2.spec.js` | 26 | Enhanced flow — full in-page assessment + doctor extraction |

---

## Full Flow (both specs)

```
Homepage
  → Select "Blood Sugar & Chronic Care" concern
  → Solution page → Dia Free Juice PDP
  → Select "100-day Dia Free Transform" pack (chronic_bucket=20)
  → "How it works" slider (4 slides)
  → BUY NOW → Checkout
  → Address + OTP (Shiprocket widget)
  → PAY SECURELY → Juspay sandbox
  → Test wallet → Proceed to Pay
  → CHARGED → Submit (sandbox)
  → Order Confirmation page
  → Take Assessment Now
      → Gender (Male)
      → Height (5ft 8in) / Weight (70kg) / Waist (44cm)
      → Blood Sugar Level (Not tested / Don't know)
      → Health Conditions (None of these)
      → Submit
  → Doctor matched + slot shown
  → Confirm Booking
  → Booking confirmed screen
  → Save to fixtures/guest_users.json
```

---

## Key Differences: v1 vs v2

| Feature | v1 (`diafree_mvp.spec.js`) | v2 (`diafree_mvp_v2.spec.js`) |
|---------|---------------------------|-------------------------------|
| Assessment form | Basic click flow | Full React-compatible input handling |
| Input filling | Standard click | `setReactInput()` helper (real keystrokes) |
| Gender screen | Fixed order | Handles before OR after Height/Weight |
| Doctor details | Step 25 summary | Extracts name, rating, qualification, slot |
| Timeout | 180s (flaky) | 480s (stable) |
| Assessment detection | `isVisible()` | `waitForFunction()` polls 12s |

---

## Doctor Details Extraction (v2)

After assessment Submit, the test extracts and logs:
```
[STEP 22A] 👨‍⚕️ Doctor: Aditi Anand | 4.8 ★ | B.A.M.S | 1+ years
[STEP 22A] 📅 First consultation slot: Fri 12 Jun · 2:20 PM
[STEP 22A] ✅ Confirm Booking clicked
```

---

## Run Commands

```bash
# Run v2 (recommended)
npx playwright test tests/diafree_mvp/diafree_mvp_v2.spec.js

# Run v1
npx playwright test tests/diafree_mvp/diafree_mvp.spec.js

# Run both
npx playwright test tests/diafree_mvp/

# Headed mode (watch browser)
npx playwright test tests/diafree_mvp/diafree_mvp_v2.spec.js --headed
```

---

## Notes

- Each run generates a **fresh test user** (random phone/email) — no shared state
- Payment uses **Juspay sandbox test wallet** (DUMMY/WALLET) — no real charges
- Assessment button uses `waitForFunction` (12s poll) to handle React lazy render
- `chronic_bucket=20` is injected via URL param to enable the 100-day pack selection
- Saved users land in `fixtures/guest_users.json` under `guest_users[]`
