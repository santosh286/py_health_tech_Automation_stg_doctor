import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://staging.kapiva.in/');
  await page.getByRole('img').first().click();
  await page.goto('https://staging.kapiva.in/');
  await page.getByText('KAPIVA - TESTINGThis is our').click();
  await page.getByRole('img').first().click();
  await page.getByText('SELECT CONCERN:Gym FoodsHeart').click();
  await page.locator('div').filter({ hasText: /^Blood Sugar & Chronic Care$/ }).click();
});