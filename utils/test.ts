import { prove, verify, NOTARY_SERVER_PUBKEY } from '../src';

(async function runTest() {
  console.log('hi1')
  const proof = await prove('https://swapi.dev/api/people/1', {
    method: 'GET',
    headers: {
      Connection: 'close',
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
    },
    body: '',
    maxTranscriptSize: 20000,
    notaryUrl: 'https://127.0.0.1:7047',
    websocketProxyUrl: 'ws://127.0.0.1:55688',
  });

  const result = await verify(proof, NOTARY_SERVER_PUBKEY);

  console.log(result);
})();
