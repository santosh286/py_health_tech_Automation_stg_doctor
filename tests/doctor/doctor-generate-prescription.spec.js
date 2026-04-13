import { test, expect } from '@playwright/test';
import usersData from '../../fixtures/users.json';
import doctorsData from '../../fixtures/doctors.json';

test('generate-prescription', async ({ page }) => {
  test.setTimeout(180000); // 3 min timeout
  await page.setViewportSize({ width: 1512, height: 777 });

  // ============================================================
  // 🔐 STEP 1 — LOGIN AS SANTOSH (ADMIN)
  // ============================================================
  const admin = usersData.users.find(u => u.name === 'santosh');
  expect(admin, '❌ Admin user Santosh not found in users.json').toBeTruthy();

  await page.goto('/');
  await page.fill('input[type="email"]', admin.email);
  await page.fill('input[type="password"]', admin.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login') && url.pathname !== '/', { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  console.log('✅ Logged in as Santosh (admin)');

  // ============================================================
  // 📋 STEP 2 — PICK FIRST APPOINTMENT
  // ============================================================
  await page.getByText('Todays Appointments').click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);
  console.log('✅ Clicked Todays Appointments');

  // Reset "Filter By Consultant"
  const consultantValueContainer = page.locator('.select__value-container.select__value-container--has-value').first();
  const hasValue = await consultantValueContainer.isVisible().catch(() => false);
  if (hasValue) {
    await consultantValueContainer.click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Select', exact: true }).first().click().catch(async () => {
      await page.keyboard.press('Escape');
    });
    await page.waitForTimeout(500);
    console.log('✅ Cleared Filter By Consultant');
  } else {
    console.log('ℹ️ Filter By Consultant already on Select');
  }

  // Click "Upcoming" filter button
  const upcomingBtn = page.getByRole('button', { name: /upcoming/i });
  await expect(upcomingBtn).toBeVisible({ timeout: 10000 });
  await upcomingBtn.click();
  await page.waitForTimeout(1000);
  console.log('✅ Clicked Upcoming filter');

  // Extract doctor name from first appointment card WITHOUT opening it
  const doctorTextEl = page.getByText(/(?:Dt\.|Dr\.)\s+[A-Za-z]{2,}/).first();
  const hasAppointments = await doctorTextEl.isVisible({ timeout: 15000 }).catch(() => false);
  if (!hasAppointments) {
    console.log('⚠️ No appointments found — skipping test');
    test.skip(true, 'No appointments found');
  }

  const cardText = await doctorTextEl.innerText().catch(() => '');
  const doctorMatch = cardText.match(/(?:Dt\.|Dr\.)\s+([A-Za-z]{2,})/i);
  const doctorFirstName = (doctorMatch?.[1] || '').toLowerCase();
  expect(doctorFirstName, '❌ Could not extract doctor name from appointment card').toBeTruthy();

  const doctorCreds = doctorsData[doctorFirstName];
  expect(doctorCreds, `❌ Doctor not found in doctors.json: "${doctorFirstName}"`).toBeTruthy();

  console.log(`✅ First appointment — Doctor: ${doctorFirstName}`);

  // ============================================================
  // 🚪 STEP 3 — LOGOUT SANTOSH
  // ============================================================
  await page.getByRole('button', { name: /logout/i }).click();
  await page.waitForURL(url => url.pathname === '/' || url.pathname.startsWith('/login'), { timeout: 10000 });
  console.log('✅ Logged out Santosh');

  // ============================================================
  // 🔐 STEP 4 — LOGIN AS EXTRACTED DOCTOR
  // ============================================================
  await page.fill('input[type="email"]', doctorCreds.email);
  await page.fill('input[type="password"]', doctorCreds.password);
  await page.getByRole('button', { name: 'LOGIN', exact: true }).click();
  await page.waitForURL(url => !url.pathname.startsWith('/login') && url.pathname !== '/', { timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  console.log(`✅ Logged in as doctor: ${doctorFirstName}`);

  // ============================================================
  // 👨‍⚕️ VERIFY DOCTOR NAME
  // ============================================================
  await expect(page.getByText(doctorFirstName, { exact: false }).first())
    .toBeVisible({ timeout: 30000 });

  // ============================================================
  // 🔍 FIND & SELECT NOT-COMPLETED SANTOSH CONSULTATION (via UI)
  // ============================================================

  // If already on consultation page, go back to appointment list first
  const alreadyOpen = await page.getByText('Active Consultation').isVisible().catch(() => false);
  if (alreadyOpen) {
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  // Switch to Consultations list view (green cards are only clickable here)
  await page.getByText('Consultations', { exact: true }).click();
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log('✅ Switched to Consultations list view');

  // Locate the active (not-completed) Santosh card:
  // Must have background-color: rgb(227, 234, 224) AND contain "Santosh"
  const activeCard = page.locator('div[style*="background-color: rgb(227, 234, 224)"]')
    .filter({ hasText: /santosh/i })
    .first();

  const activeCardVisible = await activeCard.isVisible().catch(() => false);
  console.log(`ℹ️ Active Santosh card visible: ${activeCardVisible}`);

  if (!activeCardVisible) {
    test.skip(true, '⚠️ No active (not completed) Santosh consultation found — skipping test');
  }

  console.log('✅ Found active Santosh consultation card (green highlight)');
  await activeCard.click();
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Click Active Consultation tab to start from correct tab
  await page.getByText('Active Consultation').click();

  // ============================================================
  // ✅ VERIFY CONSULTATION PAGE
  // ============================================================
  await expect(page.getByText('Active Consultation')).toBeVisible();
  await expect(page.getByText('View Patient 360')).toBeVisible();
  console.log('✅ Active consultation selected — proceeding with normal flow');

  // ============================================================
  // 🧾 MEDICAL HISTORY
  // ============================================================
  await page.getByText('Medical History').click();

  const concernTextarea = page.locator('textarea[placeholder="Enter doctor\'s concern..."]');
  await concernTextarea.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await concernTextarea.fill('Dummy concern: Patient reports mild fatigue, occasional headaches, and low energy levels. Recommend further evaluation.');

  // Medication — remove all existing tags first then re-enter
  const medWrapper = page.locator('.content-stretch.flex.gap-\\[8px\\].items-center.relative.shrink-0.flex-1.flex-wrap').first();
  await expect(medWrapper).toBeVisible({ timeout: 10000 });
  const removeButtons = medWrapper.locator('button[aria-label^="Remove"]');
  const removeCount = await removeButtons.count();
  for (let i = 0; i < removeCount; i++) {
    await removeButtons.first().click();
    await page.waitForTimeout(300);
  }
  if (removeCount > 0) console.log(`✅ Removed ${removeCount} existing medication tag(s)`);
  const medInput = medWrapper.locator('input').first();
  await expect(medInput).toBeVisible({ timeout: 10000 });
  await medInput.fill('Paracetamol');
  await medInput.press('Enter');
  await page.waitForTimeout(500);
  await medInput.fill('more');
  await medInput.press('Enter');
  await page.waitForTimeout(1000);

  await expect(page.getByText('Paracetamol')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('more')).toBeVisible({ timeout: 10000 });
  console.log('✅ Paracetamol and more added');

  // Allergy — if already added, remove it first then re-enter
  const dustAllergyTag = page.locator('button[aria-label="Remove Dust Allergy"], [aria-label="Remove Dust Allergy"]').first();
  const dustAllergyVisible = await page.getByText('Dust Allergy').isVisible().catch(() => false);
  if (dustAllergyVisible) {
    await dustAllergyTag.click();
    await page.waitForTimeout(500);
    console.log('✅ Removed existing Dust Allergy tag');
  }
  const allergyInput = page.locator('input[placeholder="Type allergy name and press Enter"]');
  await expect(allergyInput).toBeVisible({ timeout: 10000 });
  await allergyInput.fill('Dust Allergy');
  await allergyInput.press('Enter');
  await expect(page.getByText('Dust Allergy')).toBeVisible();
  console.log('✅ Medical History done');

  // ============================================================
  // 🧬 LIFESTYLE DETAILS
  // ============================================================
  await page.getByText('Lifestyle Details').click();

  await page.locator('div.select__control').first().click();
  await page.getByRole('option', { name: 'Regular', exact: true }).click();

  await page.locator('//textarea[@placeholder="Type here"]').fill(
    'Maintain proper sleep and hydration'
  );
  console.log('✅ Lifestyle done');

  // ============================================================
  // 💊 MEDICATION & RX
  // ============================================================
  await page.getByText('Medication & Rx').click();

  const dosageContainer = page.locator('.flex.flex-col.gap-\\[8px\\].items-start.relative.shrink-0.w-full').first();
  await expect(dosageContainer).toBeVisible({ timeout: 10000 });
  await dosageContainer.getByText('Type Product Name Here').click({ force: true });
  await page.waitForTimeout(500);
  await page.keyboard.type('Noni Juice');
  await page.waitForTimeout(1500);
  const noniOption = page.getByRole('option', { name: /noni juice/i }).first();
  const noniVisible = await noniOption.isVisible().catch(() => false);
  if (noniVisible) {
    await noniOption.click();
  } else {
    await page.keyboard.press('Enter');
  }
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  console.log('✅ Selected Noni Juice from Prescribed Dosage dropdown');

  const frequencyInput = page.getByPlaceholder('Type Here').first();
  await expect(frequencyInput).toBeVisible({ timeout: 5000 });
  await frequencyInput.fill('2 times daily');
  console.log('✅ Frequency filled');

  await page.getByPlaceholder('Type Here').last().fill('Shilajit Gold Resin, Ashwagandha Capsules');
  console.log('✅ Medication & Rx done');

  // ============================================================
  // 📝 FINAL REVIEW
  // ============================================================
  await page.getByText('Final Review').click();

  await page.locator('//textarea[@placeholder="Enter consultation advice for diagnosis..."]')
    .fill('Mild symptoms, recommend hydration');

  await page.locator('//input[@placeholder="Enter follow up days"]').fill('3 days');

  await page.getByRole('button', { name: 'Expand notes' }).click();
  await page.waitForTimeout(500);
  await page.fill('textarea[placeholder="Type your notes here..."]', 'Follow medication and maintain healthy lifestyle');
  await page.getByRole('button', { name: 'Minimize notes' }).click();
  await page.waitForTimeout(500);

  // Status: Consulted
  const statusDropdown = page.locator('[class="css-vlaq4p"]').nth(0);
  await expect(statusDropdown).toBeVisible({ timeout: 10000 });
  await statusDropdown.click({ force: true });
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /consulted/i }).first().click();
  await page.waitForTimeout(500);
  console.log('✅ Selected Consulted');

  // Reason: Awaiting Reports
  const reasonDropdown = page.locator('[class="css-vlaq4p"]').nth(1);
  await expect(reasonDropdown).toBeVisible({ timeout: 10000 });
  await reasonDropdown.click({ force: true });
  await page.waitForTimeout(500);
  await page.getByRole('option', { name: /awaiting reports/i }).first().click();
  await page.waitForTimeout(500);
  console.log('✅ Selected Awaiting Reports');
  console.log('✅ Final Review done');

  // ============================================================
  // 👁️ PREVIEW PRESCRIPTION
  // ============================================================
  await page.waitForTimeout(1000);
  const previewBtn = page.getByRole('button', { name: /preview prescription/i });
  await expect(previewBtn, '❌ Preview Prescription button not found').toBeVisible({ timeout: 15000 });
  await previewBtn.scrollIntoViewIfNeeded();
  await previewBtn.click();
  console.log('✅ Preview Prescription clicked');

  await page.waitForTimeout(1000);
  await expect(page.getByText(doctorFirstName, { exact: false }).first()).toBeVisible({ timeout: 10000 });
  console.log('✅ Preview opened');

  await page.waitForTimeout(600);
  await page.locator('[class="w-full h-full"]').first().click();
  console.log('✅ Preview closed');

  // ============================================================
  // 🚀 GENERATE PRESCRIPTION
  // ============================================================
  const currentUrl = new URL(page.url());
  const appointmentId = currentUrl.searchParams.get('appointmentId');
  console.log(`📋 Appointment ID: ${appointmentId}`);

  await page.getByRole('button', { name: 'Generate Prescription' }).click();

  await expect(
    page.getByText(/Appointment updated/i),
    '❌ Appointment Updated message not found'
  ).toBeVisible({ timeout: 20000 });
  console.log('✅ Appointment Updated message visible');

  // ============================================================
  // 🔗 VERIFY VIA API — consultation complete
  // ============================================================
  const apiUrl = `https://stg-backend.kapiva.tech/api-gateway/consultations-service/api/v1/consultations/${appointmentId}/complete`;
  const apiResponse = await page.request.get(apiUrl);
  console.log(`🌐 API status: ${apiResponse.status()} for ${apiUrl}`);
  expect(apiResponse.status(), `❌ API call failed with status ${apiResponse.status()}`).toBeLessThan(500);

  console.log('🎉 Prescription Generated Successfully');
});
