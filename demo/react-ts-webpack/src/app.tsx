import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
import TLSN from '../../../src/lib';

const WrappedTLSN: any = Comlink.wrap(
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
    const tlsn = (await new WrappedTLSN({ loggingLevel: 'Debug' })) as TLSN;

    const prover = await tlsn.sendNotaryRequest(
      {
        url: 'https://swapi.dev/api/people/1',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        notaryUrl: `http://localhost:7047`,
        proxyUrl: 'ws://localhost:55688',
      },
    );

    console.log(prover);

    logRecv(prover.ranges.recv);
    logRecv(prover.ranges.recv.info);
    Object.values(prover.ranges.recv.headers!).forEach(logRecv);
    logRecv(prover.ranges.recv.body);
    Object.values(prover.ranges.recv.json!).forEach(logRecv);

    logSent(prover.ranges.sent);
    logSent(prover.ranges.sent.info);
    Object.values(prover.ranges.sent.headers!).forEach(logSent);
    // logSent(prover.ranges.sent.body);
    // Object.values(prover.ranges.sent.json!).forEach(logSent);

    function logRecv(data: any) {
      console.log(prover.transcript.recv.slice(data.start, data.end));
    }

    function logSent(data: any) {
      console.log(prover.transcript.sent.slice(data.start, data.end));
    }
    // const session = await prover.notarize();
    // setProof(p);
    // console.log(session);
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
