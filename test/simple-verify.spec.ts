import { verify } from '../src';
import simple_proof_redacted from './assets/simple_proof_redacted.json';

(async function verify_simple() {
  try {
    const pem = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr\ncRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==\n-----END PUBLIC KEY-----`;
    const proof = {
      notaryUrl: 'http://localhost:7047',
      ...simple_proof_redacted,
    };
    console.log(proof);
    console.time('verify');
    const result = await verify(proof, pem);
    console.timeEnd('verify');

    // assert(result.serverName === 'example.com');
    // assert(
    //   result.sent.includes(
    //     'user-agent: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    //   ),
    // );
    // assert(result.sent.includes('<h1>XXXXXXXXXXXXXX</h1'));

    console.log(result);
    // @ts-ignore
    document.getElementById('simple-verify').textContent =
      JSON.stringify(result);
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);
  }
})();
