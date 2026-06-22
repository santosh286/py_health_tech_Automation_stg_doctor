# Doctor Portal Tests

**Target:** `https://stg-hts.kapiva.tech/` (HTS staging)
**Auth:** Doctor credentials from `fixtures/doctors.json`

## Test Files

| File | What It Tests |
|------|--------------|
| `authentication.spec.js` | Doctor login, invalid credentials, session persistence |
| `dashboard_load.spec.js` | Doctor dashboard load, appointment list visible |
| `call_patient.spec.js` | Initiate patient call from appointment |
| `consultation_360_dynamic.spec.js` | 360° consultation — notes, diagnosis, prescription dynamically |
| `doctor-generate-prescription.spec.js` | Prescription creation and PDF generation |
| `raise_ticket.spec.js` | Support ticket creation from appointment |
| `reschedule.spec.js` | Reschedule appointment to new slot |
| `reschedule_and_cancel.spec.js` | Reschedule then cancel combined flow |
| `cancel_appointment.spec.js` | Cancel appointment with reason |
| `send_reminder.spec.js` | Send patient reminder (SMS/email) |
| `transfer_with_fallback.spec.js` | Transfer call to another doctor with fallback |
| `doctor_full_flow.spec.ts` | Full E2E: login → dashboard → consult → prescription → close |

## Running

```bash
npm run test:doctor
# or
npx playwright test tests/doctor/
```
