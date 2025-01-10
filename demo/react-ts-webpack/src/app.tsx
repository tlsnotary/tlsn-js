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
} from 'tlsn-js';
import { PresentationJSON } from 'tlsn-js/build/types';
import './app.scss';

const { init, Prover, Presentation }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  const [initialized, setInitialized] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [presentationJSON, setPresentationJSON] =
    useState<null | PresentationJSON>(null);

  useEffect(() => {
    (async () => {
      await init({ loggingLevel: 'Info' });
      setInitialized(true);
    })();
  }, []);

  const onClick = useCallback(async () => {
    setProcessing(true);
    const notary = NotaryServer.from(`http://localhost:7047`);
    console.time('submit');
    const prover = (await new Prover({
      serverDns: 'swapi.dev',
    })) as TProver;

    await prover.setup(await notary.sessionUrl());
    const resp = await prover.sendRequest('ws://localhost:55688', {
      url: 'https://swapi.dev/api/people/1',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
    console.log(transcript);
    console.timeEnd('transcript');
    console.time('commit');
    const commit: Commit = {
      sent: [
        transcript.ranges.sent.info!,
        transcript.ranges.sent.headers!['content-type'],
        transcript.ranges.sent.headers!['host'],
        ...transcript.ranges.sent.lineBreaks,
      ],
      recv: [
        transcript.ranges.recv.info!,
        transcript.ranges.recv.headers!['server'],
        transcript.ranges.recv.headers!['date'],
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['gender'],
        ...transcript.ranges.recv.lineBreaks,
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

    setPresentationJSON(await presentation.json());
    console.timeEnd('proof');
  }, [setPresentationJSON, setProcessing]);

  const onAltClick = useCallback(async () => {
    setProcessing(true);
    const proof = await (Prover.notarize as typeof TProver.notarize)({
      notaryUrl: 'http://localhost:7047',
      websocketProxyUrl: 'ws://localhost:55688',
      url: 'https://swapi.dev/api/people/1',
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
        const notary = NotaryServer.from(`http://localhost:7047`);
        const notaryKey = await notary.publicKey('hex');
        const verifierOutput = await proof.verify();
        const transcript = new Transcript({
          sent: verifierOutput.transcript.sent,
          recv: verifierOutput.transcript.recv,
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
      <div className="mb-4">
        <button
          onClick={!processing ? onClick : undefined}
          disabled={processing || !initialized}
          className={`px-4 py-2 rounded-md text-white shadow-md font-semibold
            ${processing || !initialized ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}`}
        >
          Start Demo (Normal config)
        </button>
      </div>
      <div className="mb-4">
        <button
          onClick={!processing ? onAltClick : undefined}
          disabled={processing || !initialized}
          className={`px-4 py-2 rounded-md text-white shadow-md font-semibold
            ${processing || !initialized ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}`}
        >
          Start Demo 2 (With helper method)
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-4xl">
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded p-4">
          <b className="text-slate-600">Proof: </b>
          {!processing && !presentationJSON ? (
            <i className="text-slate-500">not started</i>
          ) : !presentationJSON ? (
            <div className="flex flex-col items-start space-y-2">
              <span>Proving data from swapi...</span>
              <span className="text-slate-500">
                Open <i>Developer tools</i> to follow progress
              </span>
            </div>
          ) : (
            <details className="bg-slate-50 border border-slate-200 rounded p-2">
              <summary className="cursor-pointer text-slate-600">
                View Proof
              </summary>
              <pre className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-800">
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
            <pre className="mt-2 p-2 bg-slate-100 rounded text-sm text-slate-800">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
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
    </div>
  );
}
