import { prove, verify } from '../src';
import simple_proof_redacted from './simple_proof_redacted.json';

const assert = require('assert');

(async function () {
  try {
    console.log('test start');
    console.time('prove');
    const proof = await prove('https://swapi.dev/api/people/1', {
      method: 'GET',
      maxTranscriptSize: 16384,
      notaryUrl: process.env.LOCAL
        ? 'http://localhost:7047'
        : 'https://notary.pse.dev',
      websocketProxyUrl: process.env.LOCAL
        ? 'ws://localhost:55688'
        : 'wss://notary.pse.dev/proxy?token=swapi.dev',
    });
    console.timeEnd('prove');

    console.log('Proof: ', JSON.stringify(proof));

    console.time('verify');
    const result = await verify(proof);
    console.timeEnd('verify');

    console.log(result);
    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent =
      JSON.stringify(result);
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);
  }
})();

(async function verify_simple() {
  try {
    const pem = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr
cRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==
-----END PUBLIC KEY-----`;

    const proof = {
      notaryUrl: 'http://localhost',
      ...simple_proof_redacted,
    };

    console.log(proof);

    console.time('verify');
    const result = await verify(proof, pem);
    console.timeEnd('verify');

    assert(result.serverName === 'example.com');
    assert(
      result.sent.includes(
        'user-agent: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      ),
    );
    assert(result.sent.includes('<h1>XXXXXXXXXXXXXX</h1'));

    console.log(result);
    // @ts-ignore
    document.getElementById('verify_simple').textContent =
      JSON.stringify(result);
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);
  }
})();
