import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
// import init, { Prover, NotarizedSession, TlsProof } from '../../../src/lib';
import {
  Prover as TProver,
  NotarizedSession as TNotarizedSession,
  TlsProof as TTlsProof,
} from '../../../src/lib';

const { init, Prover, NotarizedSession, TlsProof }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{
    time: number;
    sent: string;
    recv: string;
    notaryUrl: string;
  } | null>(null);
  const [proof, setProof] = useState<null>(null);

  const onClick = useCallback(async () => {
    setProcessing(true);
    console.time('submit');
    await init({ loggingLevel: 'Info' });
    const prover = (await new Prover({
      server_dns: 'swapi.dev',
    })) as TProver;

    await prover.setup(`http://localhost:7047`);
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
    const session = await prover.notarize({
      sent: [
        transcript.ranges.sent.info!,
        transcript.ranges.sent.headers!['content-type'],
        transcript.ranges.sent.headers!['host'],
      ],
      recv: [
        transcript.ranges.recv.info!,
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['gender'],
      ],
    });
    console.timeEnd('commit');
    console.time('proof');

    const notarizedSession = (await new NotarizedSession(
      session,
    )) as TNotarizedSession;
    const proofHex = await notarizedSession.proof({
      sent: [
        transcript.ranges.sent.info!,
        transcript.ranges.sent.headers!['content-type'],
        transcript.ranges.sent.headers!['host'],
      ],
      recv: [
        transcript.ranges.recv.info!,
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['gender'],
      ],
    });

    console.timeEnd('proof');
    const notaryKey = `-----BEGIN PUBLIC KEY-----\\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr\\ncRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==\\n-----END PUBLIC KEY-----\\n`;
    const proof = (await new TlsProof(proofHex)) as TTlsProof;
    await proof.verify(notaryKey);
    // return resp;
  }, [setProof, setProcessing]);

  useEffect(() => {
    (async () => {
      // if (proof) {
      //   const r = await verify(proof);
      //   setResult(r);
      //   setProcessing(false);
      // }
    })();
  }, [proof, setResult]);

  return (
    <div>
      <button onClick={!processing ? onClick : undefined} disabled={processing}>
        Start demo
      </button>
      <div>
        <b>Proof: </b>
        {!processing && !proof ? (
          <i>not started</i>
        ) : !proof ? (
          <>
            Proving data from swapi...
            <Watch
              visible={true}
              height="40"
              width="40"
              radius="48"
              color="#000000"
              ariaLabel="watch-loading"
              wrapperStyle={{}}
              wrapperClass=""
            />
            Open <i>Developer tools</i> to follow progress
          </>
        ) : (
          <>
            <details>
              <summary>View Proof</summary>
              <pre>{JSON.stringify(proof, null, 2)}</pre>
            </details>
          </>
        )}
      </div>
      <div>
        <b>Verification: </b>
        {!proof ? (
          <i>not started</i>
        ) : !result ? (
          <i>verifying</i>
        ) : (
          <pre>{JSON.stringify(result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}
