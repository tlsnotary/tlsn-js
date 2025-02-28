import {
  Prover as _Prover,
  NotaryServer,
  Presentation as _Presentation,
  Commit,
  mapStringToRange,
  subtractRanges,
  Transcript,
} from '../../src/lib';
import * as Comlink from 'comlink';
import { assert } from '../utils';
import { HTTPParser } from 'http-parser-js';

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
    const { sent, recv } = transcript;
    const {
      info: recvInfo,
      headers: recvHeaders,
      body: recvBody,
    } = parseHttpMessage(Buffer.from(recv), 'response');

    const body = JSON.parse(recvBody[0].toString());

    const commit: Commit = {
      sent: subtractRanges(
        { start: 0, end: sent.length },
        mapStringToRange(
          ['secret: test_secret'],
          Buffer.from(sent).toString('utf-8'),
        ),
      ),
      recv: [
        ...mapStringToRange(
          [
            recvInfo,
            `${recvHeaders[4]}: ${recvHeaders[5]}\r\n`,
            `${recvHeaders[6]}: ${recvHeaders[7]}\r\n`,
            `${recvHeaders[8]}: ${recvHeaders[9]}\r\n`,
            `${recvHeaders[10]}: ${recvHeaders[11]}\r\n`,
            `${recvHeaders[12]}: ${recvHeaders[13]}`,
            `${recvHeaders[14]}: ${recvHeaders[15]}`,
            `${recvHeaders[16]}: ${recvHeaders[17]}`,
            `${recvHeaders[18]}: ${recvHeaders[19]}`,
            `"name":"${body.name}"`,
            `"hair_color":"${body.hair_color}"`,
            `"skin_color":"${body.skin_color}"`,
          ],
          Buffer.from(recv).toString('utf-8'),
        ),
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
    const sentStr = t.sent();
    const recvStr = t.recv();
    assert(sentStr.includes('host: swapi.dev'));
    assert(!sentStr.includes('secret: test_secret'));
    assert(recvStr.includes('"name":"Luke Skywalker"'));
    assert(recvStr.includes('"hair_color":"blond"'));
    assert(recvStr.includes('"skin_color":"fair"'));
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

function parseHttpMessage(buffer: Buffer, type: 'request' | 'response') {
  const parser = new HTTPParser(
    type === 'request' ? HTTPParser.REQUEST : HTTPParser.RESPONSE,
  );
  const body: Buffer[] = [];
  let complete = false;
  let headers: string[] = [];

  parser.onBody = (t) => {
    body.push(t);
  };

  parser.onHeadersComplete = (res) => {
    headers = res.headers;
  };

  parser.onMessageComplete = () => {
    complete = true;
  };

  parser.execute(buffer);
  parser.finish();

  if (!complete) throw new Error(`Could not parse ${type.toUpperCase()}`);

  return {
    info: buffer.toString('utf-8').split('\r\n')[0] + '\r\n',
    headers,
    body,
  };
}
