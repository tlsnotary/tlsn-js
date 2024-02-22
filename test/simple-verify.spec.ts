import { verify } from '../src';
import simple_proof_redacted from './assets/simple_proof_redacted.json';
const assert = require('assert');

(async function verify_simple() {
  try {
    const pem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr\ncRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==\n-----END PUBLIC KEY-----`;
    const proof = {
      ...simple_proof_redacted,
      notaryUrl: 'http://localhost:7047',
    };
    console.log(proof);
    console.time('verify');
    const result = await verify(proof, pem);
    console.timeEnd('verify');

    // @ts-ignore
    document.getElementById('simple-verify').textContent = JSON.stringify(result);
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);
  }
})();
