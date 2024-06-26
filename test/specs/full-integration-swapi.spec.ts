import { prove, verify } from '../../src';
import { assert } from '../utils';

(async function () {
  try {
    // @ts-ignore
    console.log('test start');
    console.time('prove');
    const proof = await prove('https://swapi.dev/api/people/1', {
      method: 'GET',
      headers: { secret: 'test_secret' },
      maxTranscriptSize: 16384,
      notaryUrl: process.env.LOCAL_NOTARY
        ? 'http://localhost:7047'
        : 'https://notary.pse.dev/v0.1.0-alpha.6',
      websocketProxyUrl: process.env.LOCAL_WS
        ? 'ws://localhost:55688'
        : 'wss://notary.pse.dev/proxy?token=swapi.dev',
      secretHeaders: ['test_secret'],
      secretResps: ['blond', 'fair'],
    });
    console.timeEnd('prove');

    console.log('Proof: ', JSON.stringify(proof));

    console.time('verify');
    const result = await verify(proof);
    console.timeEnd('verify');

    console.log(result);

    assert(result.sent.includes('host: swapi.dev'));
    assert(result.sent.includes('secret: XXXXXXXXXXX'));
    assert(result.recv.includes('Luke Skywalker'));
    assert(result.recv.includes('"hair_color":"XXXXX"'));
    assert(result.recv.includes('"skin_color":"XXXX"'));

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = 'OK';
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = err.message;
  }
})();
