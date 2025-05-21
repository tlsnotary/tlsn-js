import { test, expect } from '@playwright/test';

test('run test in browser', async ({ page }) => {
  // log browser console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  await page.goto('/');

  await expect(page.getByTestId('simple-verify')).toHaveText('OK');

  await expect(page.getByTestId('full-integration')).toHaveText('OK', {
    timeout: 60000,
  });
});