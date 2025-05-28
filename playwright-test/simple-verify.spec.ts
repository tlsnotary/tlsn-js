import { test, expect } from '@playwright/test';

test('simple verify', async ({ page }) => {
  // log browser console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  await page.goto('/simple-verify');

  await expect(page.getByTestId('simple-verify')).toHaveText(/\{.*\}/s);

  const json = await page.getByTestId('simple-verify').innerText();
  const { sent, recv } = JSON.parse(json);

  expect(sent).toContain('host: raw.githubusercontent.com');
  expect(recv).toContain('*******************');
  expect(recv).toContain('"city": "Anytown"');
  expect(recv).toContain('"id": 1234567890');
  expect(recv).toContain('"postalCode": "12345"');
});
