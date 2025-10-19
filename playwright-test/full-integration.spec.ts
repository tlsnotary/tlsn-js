import { test, expect } from '@playwright/test';

test('full-integration', async ({ page }) => {
  // log browser console messages
  page.on('console', (msg) => {
    console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  await page.goto('/full-integration');

  await expect(page.getByTestId('full-integration')).toHaveText(/\{.*\}/s, { timeout: 60000 });

  const json = await page.getByTestId('full-integration').innerText();
  const { sent, recv, server_name, version, meta } = JSON.parse(json);

  expect(version).toBe('0.1.0-alpha.13');
  expect(new URL(meta.notaryUrl!).protocol === 'http:');
  expect(server_name).toBe('raw.githubusercontent.com');

  expect(sent).toContain('host: raw.githubusercontent.com');
  expect(sent).not.toContain('secret: test_secret');
  expect(recv).toContain('"id": 1234567890');
  expect(recv).toContain('"city": "Anytown"');
  expect(recv).toContain('"postalCode": "12345"');

});
