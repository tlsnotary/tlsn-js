import { prove, verify, NOTARY_SERVER_PUBKEY } from '../src';

(async function runTest() {
  const proof = await prove('https://api.coindesk.com/v1/bpi/currentprice.json', {
    method: 'GET',
    headers: {
      // Connection: 'close',
      // Accept: 'application/json',
      // "accept-encoding": "identity"
    },
    body: '',
    maxTranscriptSize: 16384,
    notaryUrl: 'https://127.0.0.1:7047',
    websocketProxyUrl: 'ws://127.0.0.1:55688?token=api.coindesk.com',
  });

  const result = await verify(proof, NOTARY_SERVER_PUBKEY);
})();
