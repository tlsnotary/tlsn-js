import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/TLSNotary/)
});

test('run demo', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  await page.getByRole('button', { name: 'Start Prover' }).click();

  await expect(page.getByTestId('proof-data')).toContainText('Unredacted data successfully revealed to Verifier', { timeout: 60000 });

});