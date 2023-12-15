import { prove, verify, NOTARY_SERVER_PUBKEY } from '../src';

(async function runTest() {
  console.time('prove');
  const proof = await prove('https://swapi.dev/api/people/1', {
    method: 'GET',
    maxTranscriptSize: 16384,
    notaryUrl: 'https://notary.efprivacyscaling.org',
    websocketProxyUrl: 'ws://notary.efprivacyscaling.org:55688?token=swapi.dev',
  });
  console.timeEnd('prove');

  console.time('verify');
  const result = await verify(proof, NOTARY_SERVER_PUBKEY);
  console.timeEnd('verify');
  console.log(result);
})();
