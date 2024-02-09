import puppeteer from 'puppeteer';
import { describe, it, before, after } from 'mocha';
const assert = require('assert');
const { exec } = require('node:child_process');

// puppeteer options
const opts = {
  headless: !!process.env.HEADLESS,
  slowMo: 100,
  timeout: 60000,
};

let browser: any, page: any, server: any;

// expose variables
before(async function () {
  server = exec('serve  --config ../serve.json ./test-build -l 3001');
  browser = await puppeteer.launch(opts);
  page = await browser.newPage();
  await page.goto('http://localhost:3001');
});

// close browser and reset global variables
after(async function () {
  await server.kill();
  // @ts-ignore
  await browser.close();
});

describe('tlsn-js test suite', function () {
  it('should prove and verify', async function () {
    const content = await check('full-integration-swapi');
    const result = safeParseJson(content);
    assert(result);
  });

  it('should prove and verify', async function () {
    const content = await check('simple-verify');
    const result = safeParseJson(content);
    assert(result);
  });
});

async function check(testId: string): Promise<string> {
  const content = await page.$eval('#' + testId, (n: any) => n.innerText);
  if (content) return content;
  await new Promise((r) => setTimeout(r, 1000));
  return check(testId);
}

function safeParseJson(data: string): string | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
