import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from 'puppeteer';
import { describe, it, before, after } from 'mocha';
const assert = require('assert');
import { exec, ChildProcess } from 'node:child_process';
import * as fs from 'fs';
const yaml = require('js-yaml');
import 'wtfnode';

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

let tlsnServerFixture: ChildProcess;
const spawnTlsnServerFixture = () => {
  const tlsnServerFixturePath = './utils/tlsn/tlsn/tlsn-server-fixture/';
  // Spawn the server process
  // tlsnServerFixture = spawn(tlsnServerFixturePath, []);
  tlsnServerFixture = exec(`../target/release/main`, { cwd: tlsnServerFixturePath });

  tlsnServerFixture.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  tlsnServerFixture.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

let localNotaryServer: ChildProcess;
const spawnLocalNotaryServer = async () => {
  const localNotaryServerPath = './utils/tlsn/notary-server/';
  localNotaryServer = exec(`target/release/notary-server`, { cwd: localNotaryServerPath });
  localNotaryServer.stdout?.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  localNotaryServer.stderr?.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // wait for the notary server to be ready
  while (true) {
    try {
      const response = await fetch("http://127.0.0.1:7047/info");
      if (response.ok) {
        return;
      }
    } catch (error) {
      console.error('Waiting for local notary server...', error);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

const configureNotarySerer = () => {
  try {
    const configPath = './utils/tlsn/notary-server/config/config.yaml';
    const fileContents = fs.readFileSync(configPath, 'utf8');
    const data = yaml.load(fileContents) as any;
    data.tls.enabled = false
    data.server.host = "127.0.0.1"
    const newYaml = yaml.dump(data);
    fs.writeFileSync(configPath, newYaml, 'utf8');
    console.log('YAML file has been updated.');
  } catch (error) {
    console.error('Error reading or updating the YAML file:', error);
  }
}

// expose variables
before(async function () {
  require('wtfnode').dump();
  server = exec('serve  --config ../serve.json ./test-build -l 3001');

  spawnTlsnServerFixture();
  require('wtfnode').dump();
  configureNotarySerer();
  await spawnLocalNotaryServer();
  require('wtfnode').dump();
  browser = await puppeteer.launch(opts);
  page = await browser.newPage();
  require('wtfnode').dump();
  await page.goto('http://127.0.0.1:3001');
});


// close browser and reset global variables
after(async function () {
  console.log("Cleaning up:")
  try {
    await tlsnServerFixture.kill();
    console.log("* Stopped TLSN Server Fixture ✅");
  } catch (e) {
    console.error("Error stopping TLSN Server Fixture:", e);
  }
  try {
    await localNotaryServer.kill();
    await localNotaryServer.kill();
    console.log("* Stopped Notary Server ✅")
  } catch (e) {
    console.error("Error stopping Notary Server:", e);
  }
  try {
    await server.kill();
    await server.kill();
    console.log("* Stopped Test Web Server ✅")
  } catch (e) {
    console.error("Error stopping Test Web Server:", e);
  }
  // @ts-ignore
  try {
    await browser.close();
    console.log("* Closed browser ✅")
  } catch (e) {
    console.error("Error closing Browser:", e);
  }
  console.debug("XXX", localNotaryServer);
});

before(function () {
  console.log("wtfnode")
  require('wtfnode').dump();
});

after(function () {
  console.log("wtfnode")
  require('wtfnode').dump();
});

describe('tlsn-js test suite', function () {
  // it('should prove and verify swapi.dev', async function () {
  //   const content = await check('full-integration-swapi');
  //   const result = safeParseJson(content);
  //   assert(result.sent.includes('host: swapi.dev'));
  //   assert(result.sent.includes('secret: XXXXXXXXXXX'));
  //   assert(result.recv.includes('Luke Skywalker'));
  //   assert(result.recv.includes('"hair_color":"XXXXX"'));
  //   assert(result.recv.includes('"skin_color":"XXXX"'));
  // });

  it('should prove and verify data from the local tlsn-server-fixture', async function () {
    const content = await check('full-integration-swapi');
    const result = safeParseJson(content);
    assert(result.sent.includes('host: swapi.dev'));
    assert(result.sent.includes('secret: XXXXXXXXXXX'));
    assert(result.recv.includes('Luke Skywalker'));
    assert(result.recv.includes('"hair_color":"XXXXX"'));
    assert(result.recv.includes('"skin_color":"XXXX"'));
    console.log("Finished notarization test ✅")
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
    console.log("Finished verification test ✅")
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
