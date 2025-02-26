import {
  Prover as _Prover,
  NotaryServer,
  Presentation as _Presentation,
} from '../../src/lib';
import * as Comlink from 'comlink';
import { Transcript } from '../../src/lib';
import { assert } from '../utils';

const { init, Prover, Presentation }: any = Comlink.wrap(
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

    const sent = Buffer.from(transcript.raw.sent).toString('utf-8');
    const recv = Buffer.from(transcript.raw.recv).toString('utf-8');

    const secretRanges = Buffer.from(transcript.raw.sent).indexOf(
      Buffer.from('secret: test_secret'),
    );
    console.log({ secretRanges });

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
    console.log('presentation:', await presentation.serialize());
    console.timeEnd('prove');

    console.time('verify');
    const { transcript: partialTranscript, server_name } =
      await presentation.verify();
    const verifyingKey = await presentation.verifyingKey();
    console.timeEnd('verify');

    console.log('verifyingKey', verifyingKey);
    const t = new Transcript({
      sent: partialTranscript.sent,
      recv: partialTranscript.recv,
    });
    const sent = t.sent();
    const recv = t.recv();
    assert(sent.includes('host: swapi.dev'));
    assert(!sent.includes('secret: test_secret'));
    assert(recv.includes('"name":"Luke Skywalker"'));
    assert(recv.includes('"hair_color":"blond"'));
    assert(recv.includes('"skin_color":"fair"'));
    assert(server_name === 'swapi.dev');

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = 'OK';
  } catch (err) {
    console.log('caught error from wasm');
    console.error(err);

    // @ts-ignore
    document.getElementById('full-integration-swapi').textContent = err.message;
  }
})();
