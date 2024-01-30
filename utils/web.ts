import { prove, verify } from '../src';

(async function runTest() {
  try {
    console.log('hihihihihihihih')
    console.time('prove');
    const proof = await prove('https://swapi.dev/api/people/1', {
      method: 'GET',
      maxTranscriptSize: 16384,
      notaryUrl: 'http://localhost:7047',
      websocketProxyUrl: 'ws://localhost:55688',
    });
    console.timeEnd('prove');

    console.time('verify');
    const result = await verify(proof);
    console.timeEnd('verify');

    console.log(result);
    // @ts-ignore
    document.getElementById('root').textContent = JSON.stringify(result);
  } catch(err) {
    console.log('caught error from wasm');
    console.error(err);
  }

})();