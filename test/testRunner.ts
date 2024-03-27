import puppeteer from 'puppeteer';
import { describe, it, before, after } from 'mocha';
import { check, safeParseJson } from './utils';
const assert = require('assert');
const { exec } = require('node:child_process');

// puppeteer options
const opts = {
  headless: !!process.env.HEADLESS,
  slowMo: 100,
  timeout: 300000,
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
  it('should prove and verify swapi.dev', async function () {
    const content = await check(page, 'full-integration-swapi');
    assert(content === 'OK');
  });

  it('should verify', async function () {
    const content = await check(page, 'simple-verify');
    assert(content === 'OK');
  });
});
