import {
  Prover as _Prover,
  NotaryServer,
  Presentation as _Presentation,
  Attestation as _Attestation,
} from '../../src/lib';
import * as Comlink from 'comlink';

const { init, Prover, Presentation, Attestation }: any = Comlink.wrap(
  // @ts-ignore
  new Worker(new URL('../worker.ts', import.meta.url)),
);

(async function () {
  try {
    await init({ loggingLevel: 'Debug' });
    // @ts-ignore
    console.log('test start');
    console.time('prove');
    const prover = (await new Prover({
      id: 'test',
      serverDns: 'swapi.dev',
    })) as _Prover;
    const notary = NotaryServer.from('http://localhost:7047');
    await prover.setup(await notary.sessionUrl());
    await prover.sendRequest('wss://notary.pse.dev/proxy?token=swapi.dev', {
      url: 'https://swapi.dev/api/people/1',
      headers: {
        'content-type': 'application/json',
        secret: 'test_secret',
      },
    });
    const transcript = await prover.transcript();
    console.log({ transcript });
    const commit = {
      sent: [
        ...Object.entries(transcript.ranges.sent.headers)
          .filter(([k]) => k !== 'secret')
          .map(([, v]) => v),
        transcript.ranges.sent.info,
        ...transcript.ranges.sent.lineBreaks,
      ],
      recv: [
        ...Object.entries(transcript.ranges.recv.headers).map(([, v]) => v),
        transcript.ranges.recv.info,
        ...transcript.ranges.recv.lineBreaks,
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['hair_color'],
        transcript.ranges.recv.json!['skin_color'],
      ],
    };
    console.log(commit);
    const notarizationOutput = await prover.notarize(commit);
    const presentation = (await new Presentation({
      attestationHex: notarizationOutput.attestation,
      secretsHex: notarizationOutput.secrets,
      reveal: commit,
    })) as _Presentation;
    console.log('presentation:', presentation);
    console.timeEnd('prove');

    console.time('verify');
    const result = await presentation.verify();
    const attestation = (await new Attestation(
      result.attestation,
    )) as _Attestation;
    const verifyingKey = await attestation.verifyingKey();
    console.timeEnd('verify');

    console.log('verifyingKey', verifyingKey);
    console.log('result', result);
    // assert(result.sent.includes('host: swapi.dev'));
    // assert(!result.sent.includes('secret: test_secret'));
    // assert(result.recv.includes('"name":"Luke Skywalker"'));
    // assert(result.recv.includes('"hair_color":"blond"'));
    // assert(result.recv.includes('"skin_color":"fair"'));

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = 'OK';
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = err.message;
  }
})();
