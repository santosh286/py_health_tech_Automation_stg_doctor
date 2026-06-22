# Kapiva HER Tests

**Target:** Kapiva HER staging landing page
**Device:** Pixel 7 mobile emulation
**Workers:** 1 (always sequential — avoids slot/booking conflicts)

## Test Files (21 specs)

### Landing Page UI
| File | What It Tests |
|------|--------------|
| `landing_page_hero.spec.js` | Hero section render, headline, CTA button |
| `landing_page_doctors.spec.js` | Doctors section — names, specialties, Consult Now buttons |
| `landing_page_faq.spec.js` | FAQ accordion — open, close, content |
| `landing_page_howitworks.spec.js` | How It Works section — steps visible |
| `landing_page_symptoms.spec.js` | PCOS symptoms section — items visible |
| `landing_page_sticky_cta.spec.js` | Sticky CTA bar appears on scroll |
| `landing_page_comparison.spec.js` | Root-cause comparison table |
| `landing_page_no_infertility.spec.js` | Infertility tile and Mood section |

### Booking Flows
| File | What It Tests |
|------|--------------|
| `homepage_banner.spec.js` | Homepage banner → booking form flow |
| `booking_via_doctor_card.spec.js` | Doctor card "Consult Now" → booking |
| `booking_slot_selection.spec.js` | Slot picker — Step 2 and 3 |
| `booking_form_validation.spec.js` | Required fields, Next button enabled/disabled |
| `booking_invalid_email.spec.js` | Invalid email error message |
| `booking_invalid_phone.spec.js` | Invalid phone error message |
| `booking_confirmation_details.spec.js` | Full booking → confirmation page details |
| `consult_now_booking.spec.js` | Doctor card → booking → quiz → result |
| `shantavri_con_booking.spec.js` | Shantavri consultation + quiz flow |

### Quiz Flows
| File | What It Tests |
|------|--------------|
| `quiz_q13_skip.spec.js` | Q13 skip — skips to result without answering |
| `quiz_without_booking.spec.js` | Standalone quiz — no prior booking required |

### Navigation & Attribution
| File | What It Tests |
|------|--------------|
| `shop_now_click.spec.js` | Shop Now CTA → correct navigation target |
| `utm_attribution.spec.js` | UTM params preserved end-to-end through booking |

## Running

```bash
# All 21 HER specs (sequential)
npm run test:kapiva-her

# Landing pages + forms only
npm run test:kapiva-her:ui

# Booking + quiz only
npm run test:kapiva-her:booking
```
