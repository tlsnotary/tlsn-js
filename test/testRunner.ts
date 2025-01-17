import puppeteer, { Browser, LaunchOptions, Page } from 'puppeteer';
import { describe, it, before, after } from 'mocha';
const assert = require('assert');
import { exec, ChildProcess } from 'node:child_process';
import * as fs from 'fs';
import path from 'path';
const yaml = require('js-yaml');

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

let tlsnServerFixture: ChildProcess;
const spawnTlsnServerFixture = () => {
  const tlsnServerFixturePath = './utils/tlsn/crates/server-fixture/';
  tlsnServerFixture = exec(`../../target/release/tlsn-server-fixture`, {
    cwd: tlsnServerFixturePath,
  });

  tlsnServerFixture.on('error', (error) => {
    console.error(`Failed to start TLSN Server Fixture: ${error}`);
    process.exit(1);
  });

  tlsnServerFixture.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  tlsnServerFixture.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
};

let localNotaryServer: ChildProcess;
const spawnLocalNotaryServer = async () => {
  const localNotaryServerPath = './utils/tlsn/crates/notary/server';
  console.log(localNotaryServerPath);
  localNotaryServer = exec(`../../../target/release/notary-server`, {
    cwd: localNotaryServerPath,
  });
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

const configureNotaryServer = () => {
  try {
    const configPath = './utils/tlsn/crates/notary/server/config/config.yaml';
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const data = yaml.load(fileContents) as any;
    data.tls.enabled = false;
    data.server.host = '127.0.0.1';
    const newYaml = yaml.dump(data);
    fs.writeFileSync(configPath, newYaml, 'utf8');
    console.log('YAML file has been updated.');
  } catch (error) {
    console.error('Error reading or updating the YAML file:', error);
  }
};

// expose variables
before(async function () {
  server = exec('serve  --config ../serve.json ./test-build -l 3001');

  spawnTlsnServerFixture();
  configureNotaryServer(); //TODO: After alpha.8: remove this and add as argument to notary server
  await spawnLocalNotaryServer();
  browser = await puppeteer.launch(opts);
  page = await browser.newPage();
  await page.goto('http://127.0.0.1:3001');
});

// close browser and reset global variables
after(async function () {
  console.log('Cleaning up:');

  try {
    tlsnServerFixture.kill();
    console.log('* Stopped TLSN Server Fixture ✅');

    localNotaryServer.kill();
    console.log('* Stopped Notary Server ✅');

    server.kill();
    console.log('* Stopped Test Web Server ✅');

    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
    const childProcess = browser.process();
    if (childProcess) {
      childProcess.kill(9);
    }
    console.log('* Closed browser ✅');
  } catch (e) {
    console.error(e);
  }
});

describe('tlsn-js test suite', function () {
  fs.readdirSync(path.join(__dirname, 'specs')).forEach((file) => {
    const [id] = file.split('.');
    it(`Test ID: ${id}`, async function () {
      const content = await check(id);
      assert.strictEqual(content, 'OK', `Test ID: ${id} - Expected 'OK' but got '${content}'`);
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
