import { prove, verify } from '../src';

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
        : 'https://notary.pse.dev',
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
    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent =
      JSON.stringify(result);
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);
  }
})();