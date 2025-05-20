import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Web-to-Web P2P Demo/)
});

test('run web-to-web p2p demo', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('start').click();

  await expect(page.getByTestId('start')).toContainText('Start Demo', { timeout: 60000 });

  const proverMessages = await page.getByTestId('prover-data').allTextContents();
  expect(proverMessages.some(text => text.includes('Transcript received'))).toBe(true);
  // console.log('Verifier Messages:', proverMessages);
  expect(proverMessages.some(text => text.includes('"name": "John Doe",'))).toBe(true);
  expect(proverMessages.some(text => text.includes('"address": {'))).toBe(true);

  const verifierMessages = await page.getByTestId('verifier-data').allTextContents();
  expect(verifierMessages.some(text => text.includes('Verification completed'))).toBe(true);
  expect(verifierMessages.some(text => text.includes('***"name": "John Doe"*************************"street": "123 Elm Street"***'))).toBe(true);
});