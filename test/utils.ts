import { Page } from 'puppeteer';

export function assert(expr: any, message = 'unknown assertion error') {
  if (!Boolean(expr)) {
    throw new Error(message || 'unknown assertion error');
  }
}

export async function check(page: Page, testId: string): Promise<string> {
  const content = await page.$eval('#' + testId, (n: any) => n.innerText);
  if (content) return content;
  await new Promise((r) => setTimeout(r, 1000));
  return check(page, testId);
}

export function safeParseJson(data: string): any | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
