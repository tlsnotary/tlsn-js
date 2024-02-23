import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { describe, it, before, after } from 'mocha';
const assert = require('assert');
import { exec, ChildProcess } from 'node:child_process';

const timeout = 60000;

// puppeteer options
let opts: PuppeteerLaunchOptions = {
  headless: !!process.env.HEADLESS ? 'new' : false,
  slowMo: 100,
  timeout: timeout,
};

if (process.env.CHROME_PATH) {
  opts = {
    ...opts,
    executablePath: process.env.CHROME_PATH,
  };
}

console.log('puppeteer options', opts);

let browser: Browser;
let page: Page;
let server: ChildProcess;

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
  it('should prove and verify swapi.dev', async function () {
    const content = await check('full-integration-swapi');
    const result = safeParseJson(content);
    assert(result.sent.includes('host: swapi.dev'));
    assert(result.sent.includes('secret: XXXXXXXXXXX'));
    assert(result.recv.includes('Luke Skywalker'));
    assert(result.recv.includes('"hair_color":"XXXXX"'));
    assert(result.recv.includes('"skin_color":"XXXX"'));
  });

  it('should verify', async function () {
    const content = await check('simple-verify');
    const result = safeParseJson(content);
    assert(
      result.sent.includes(
        'user-agent: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ),
    );
    assert(result.recv.includes('<h1>XXXXXXXXXXXXXX</h1>'));
    assert(result);
  });
});

async function check(testId: string): Promise<string> {
  const startTime = Date.now();
  const attemptFetchContent = async (): Promise<string> => {
    const content = await page.$eval(
      `#${testId}`,
      (el: Element) => el.textContent || '',
    );
    if (content) return content;
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime >= timeout) {
      throw new Error(
        `Timeout: Failed to retrieve content for '#${testId}' within ${timeout} ms.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return attemptFetchContent();
  };
  return attemptFetchContent();
}

function safeParseJson(data: string): any | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}
