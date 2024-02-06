import { prove, verify } from '../src';
import simple_proof_redacted from './assets/simple_proof_redacted.json';

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
