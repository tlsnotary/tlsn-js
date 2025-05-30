import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
import {
  Prover as TProver,
  Presentation as TPresentation,
  Commit,
  NotaryServer,
  Transcript,
  mapStringToRange,
  subtractRanges,
} from 'tlsn-js';
import { PresentationJSON } from 'tlsn-js/build/types';
import './app.scss';
import { HTTPParser } from 'http-parser-js';
const { init, Prover, Presentation }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

const local = true; // Toggle between local and remote notary
const notaryUrl = local
  ? 'http://localhost:7047'
  : 'https://notary.pse.dev/v0.1.0-alpha.11';
const websocketProxyUrl = local
  ? 'ws://localhost:55688'
  : 'wss://notary.pse.dev/proxy?token=raw.githubusercontent.com';
const loggingLevel = 'Info'; // https://github.com/tlsnotary/tlsn/blob/main/crates/wasm/src/log.rs#L8

const serverUrl = 'https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.11/crates/server-fixture/server/src/data/1kb.json';
const serverDns = 'raw.githubusercontent.com';

function App(): ReactElement {
  const [initialized, setInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [presentationJSON, setPresentationJSON] =
    useState<null | PresentationJSON>(null);

  useEffect(() => {
    (async () => {
      await init({ loggingLevel: loggingLevel });
      setInitialized(true);
    })();
  }, []);

  const onClick = useCallback(async () => {
    setProcessing(true);
    const notary = NotaryServer.from(notaryUrl);
    console.time('submit');
    const prover = (await new Prover({
      serverDns: serverDns,
      maxRecvData: 2048,
    })) as TProver;

    await prover.setup(await notary.sessionUrl());

    const resp = await prover.sendRequest(websocketProxyUrl, {
      url: serverUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        secret: 'test_secret',
      },
      body: {
        hello: 'world',
        one: 1,
      },
    });

    console.timeEnd('submit');
    console.log(resp);

    console.time('transcript');
    const transcript = await prover.transcript();
    const { sent, recv } = transcript;
    console.log(new Transcript({ sent, recv }));
    console.timeEnd('transcript');
    console.time('commit');

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
            `"name": "${body.information.name}"`,
            `"street": "${body.information.address.street}"`,
          ],
          Buffer.from(recv).toString('utf-8'),
        ),
      ],
    };
    const notarizationOutputs = await prover.notarize(commit);
    console.timeEnd('commit');
    console.time('proof');

    const presentation = (await new Presentation({
      attestationHex: notarizationOutputs.attestation,
      secretsHex: notarizationOutputs.secrets,
      notaryUrl: notarizationOutputs.notaryUrl,
      websocketProxyUrl: notarizationOutputs.websocketProxyUrl,
      reveal: commit,
    })) as TPresentation;

    console.log(await presentation.serialize());
    setPresentationJSON(await presentation.json());
    console.timeEnd('proof');
  }, [setPresentationJSON, setProcessing]);

  const onAltClick = useCallback(async () => {
    setProcessing(true);
    const proof = await (Prover.notarize as typeof TProver.notarize)({
      notaryUrl: notaryUrl,
      websocketProxyUrl: websocketProxyUrl,
      maxRecvData: 2048,
      url: serverUrl,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },

      body: {
        hello: 'world',
        one: 1,
      },
      commit: {
        sent: [{ start: 0, end: 50 }],
        recv: [{ start: 0, end: 50 }],
      },
    });

    setPresentationJSON(proof);
  }, [setPresentationJSON, setProcessing]);

  useEffect(() => {
    (async () => {
      if (presentationJSON) {
        const proof = (await new Presentation(
          presentationJSON.data,
        )) as TPresentation;
        const notary = NotaryServer.from(notaryUrl);
        const notaryKey = await notary.publicKey('hex');
        const verifierOutput = await proof.verify();
        const transcript = new Transcript({
          sent: verifierOutput.transcript?.sent || [],
          recv: verifierOutput.transcript?.recv || [],
        });
        const vk = await proof.verifyingKey();
        setResult({
          time: verifierOutput.connection_info.time,
          verifyingKey: Buffer.from(vk.data).toString('hex'),
          notaryKey: notaryKey,
          serverName: verifierOutput.server_name,
          sent: transcript.sent(),
          recv: transcript.recv(),
        });
        setProcessing(false);
      }
    })();
  }, [presentationJSON, setResult]);

  return (
    <div className="bg-slate-100 min-h-screen p-6 text-slate-800 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-6 text-slate-700">
        TLSNotary React TypeScript Demo{' '}
      </h1>
      <div className="mb-4 text-base font-light max-w-2xl">
        <p>
          This demo showcases how to use TLSNotary in a React/TypeScript app
          with the tlsn-js library. We will fetch JSON data from the Star Wars
          API, notarize the TLS request using TLSNotary, and verify the proof.
          The demo runs entirely in the browser.
        </p>
        <p>
          <a
            href="https://tlsnotary.org/docs/quick_start/tlsn-js/"
            className="text-blue-500 hover:underline"
          >
            More info
          </a>
        </p>
        <table className="table-auto w-full mt-4">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left">Demo Settings</th>
              <th className="px-4 py-2 text-left">URL</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-4 py-2">Server</td>
              <td className="border px-4 py-2">{serverUrl}</td>
            </tr>
            <tr>
              <td className="border px-4 py-2">Notary Server</td>
              <td className="border px-4 py-2">{notaryUrl}</td>
            </tr>
            <tr>
              <td className="border px-4 py-2">WebSocket Proxy</td>
              <td className="border px-4 py-2">{websocketProxyUrl}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-base font-light">
          There are two versions of the demo: one with a normal config and one
          with a helper method.
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={!processing ? onClick : undefined}
            disabled={processing || !initialized}
            className={`px-4 py-2 rounded-md text-white shadow-md font-semibold
        ${processing || !initialized ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}`}
          >
            Start Demo (Normal config)
          </button>
          <button
            onClick={!processing ? onAltClick : undefined}
            disabled={processing || !initialized}
            className={`px-4 py-2 rounded-md text-white shadow-md font-semibold
        ${processing || !initialized ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}`}
          >
            Start Demo 2 (With helper method)
          </button>
        </div>
      </div>
      {processing && (
        <div className="mt-6 flex justify-center items-center">
          <Watch
            visible={true}
            height="40"
            width="40"
            radius="48"
            color="#1E293B"
            ariaLabel="watch-loading"
            wrapperStyle={{}}
            wrapperClass=""
          />
        </div>
      )}
      <div className="flex flex-col gap-6 w-full max-w-4xl">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-4">
          <b className="text-slate-600">Proof: </b>
          {!processing && !presentationJSON ? (
            <i className="text-slate-500">not started</i>
          ) : !presentationJSON ? (
            <div className="flex flex-col items-start space-y-2">
              <span>Proving data from {serverDns}...</span>
              <span className="text-slate-500">
                Open <i>Developer tools</i> to follow progress
              </span>
            </div>
          ) : (
            <details className="bg-slate-50 border border-slate-200 rounded p-2">
              <summary className="cursor-pointer text-slate-600">
                View Proof
              </summary>
              <pre data-testid="proof-data"
                className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-800 overflow-auto"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
              >
                {JSON.stringify(presentationJSON, null, 2)}
              </pre>
            </details>
          )}
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-4">
          <b className="text-slate-600">Verification: </b>
          {!presentationJSON ? (
            <i className="text-slate-500">not started</i>
          ) : !result ? (
            <i className="text-slate-500">verifying</i>
          ) : (
            <pre data-testid="verify-data"
              className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-800 overflow-auto"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

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
