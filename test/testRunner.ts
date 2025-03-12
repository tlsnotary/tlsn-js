import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { describe, it, before, after } from 'mocha';
const assert = require('assert');
import { exec, ChildProcess } from 'node:child_process';
import * as fs from 'fs';
import path from 'path';

const timeout = 300000;

// puppeteer options
let opts: LaunchOptions = {
  headless: !!process.env.HEADLESS ? true : false,
  slowMo: 100,
  timeout: timeout,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
};

if (process.env.CHROME_PATH) {
  opts = {
    ...opts,
    executablePath: process.env.CHROME_PATH,
  };
}

let browser: Browser;
let page: Page;
let server: ChildProcess;

let localNotaryServer: ChildProcess;
const spawnLocalNotaryServer = async () => {
  localNotaryServer = exec(`docker run --platform=linux/amd64 -p 7047:7047 --rm ghcr.io/tlsnotary/tlsn/notary-server:v0.1.0-alpha.8 notary-server --tls-enabled=false`);
  localNotaryServer.on('error', (error) => {
    console.error(`Failed to start Notary server: ${error}`);
    process.exit(1);
  });
  localNotaryServer.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  localNotaryServer.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // wait for the notary server to be ready
  while (true) {
    try {
      const response = await fetch('http://127.0.0.1:7047/info');
      if (response.ok) {
        return;
      }
    } catch (error) {
      console.error('Waiting for local notary server...', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

// expose variables
before(async function () {
  server = exec('serve  --config ../serve.json ./test-build -l 3001');

  await spawnLocalNotaryServer();
  browser = await puppeteer.launch(opts);
  page = await browser.newPage();
  await page.goto('http://127.0.0.1:3001');
});

// close browser and reset global variables
after(async function () {
  console.log('Cleaning up:');

  try {
    localNotaryServer.kill();
    console.log('* Stopped Notary Server ✅');

    server.kill();
    console.log('* Stopped Test Web Server ✅');

    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
      const childProcess = browser.process();
      if (childProcess) {
        childProcess.kill(9);
      }
      console.log('* Closed browser ✅');

      const tests = this.test?.parent?.suites.flatMap((suite) => suite.tests);
      const failed = tests!.some((test) => test.state === 'failed');

      console.log('tests', tests);
      console.log('failed', failed);
      process.exit(failed ? 1 : 0);
    }
    process.exit(1);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
});

describe('tlsn-js test suite', function () {
  fs.readdirSync(path.join(__dirname, 'e2e')).forEach((file) => {
    const [id] = file.split('.');
    it(`Test ID: ${id}`, async function () {
      const content = await check(id);
      assert.strictEqual(
        content,
        'OK',
        `Test ID: ${id} - Expected 'OK' but got '${content}'`,
      );
    });
  });
});

async function check(testId: string): Promise<string> {
  const startTime = Date.now();
  const attemptFetchContent = async (): Promise<string> => {
    const content = await page.$eval(
      `#${testId}`,
      (el: any) => el.textContent || '',
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
