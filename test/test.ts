import puppeteer from 'puppeteer';
import { describe, it, before, after } from 'mocha';

// puppeteer options
const opts = {
  headless: false,
  slowMo: 100,
  timeout: 60000,
};

let browser: any, page: any;

// expose variables
before(async function () {
  browser = await puppeteer.launch(opts);
  page = await browser.newPage();
  await page.goto('http://localhost:3001');
});

// close browser and reset global variables
after(function () {
  // @ts-ignore
  browser.close();
});

describe('tlsn-js test suite', function () {
  it('should prove and verify', async function () {
    const assert = require('assert');

    for (var div of ["root", "simple_verify"]) {

      const content = await check(div);
      const result = JSON.parse(content);
      assert(result);
    }

    async function check(div: string): Promise<string> {
      const content = await page.$eval(`#${div}`, (n: any) => n.innerText);
      if (content) return content;
      await new Promise((r) => setTimeout(r, 1000));
      return check(div);
    }
  });
});