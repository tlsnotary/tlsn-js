import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TLSNotary React TypeScript Demo/)
});

test('run demo (normal)', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  await page.getByRole('button', { name: 'Start Demo (Normal config)' }).click();

  await expect(page.getByTestId('proof-data')).toContainText('"data":', { timeout: 60000 });

  let verify_data = await page.getByTestId('verify-data').innerText();
  expect(verify_data).toContain('"serverName": "raw.githubusercontent.com"');
  expect(verify_data).toContain('John Doe');
});

test('run demo (helper)', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  await page.getByRole('button', { name: 'Start Demo 2 (With helper method)' }).click();

  await expect(page.getByTestId('proof-data')).toContainText('"data":', { timeout: 60000 });

  // await page.screenshot({ path: 'screenshot.png', fullPage: true });

  let verify_data = await page.getByTestId('verify-data').innerText();
  expect(verify_data).toContain('"serverName": "raw.githubusercontent.com"');
  expect(verify_data).toContain('"recv"');
});