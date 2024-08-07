import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import TLSN from '../../../src/tlsn';
import { Watch } from 'react-loader-spinner';

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
    const tlsn = new TLSN({ loggingLevel: 'Debug' });

    const prover = await tlsn.createNotaryProver(
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

    const session = await prover.notarize();
    // setProof(p);
    console.log(session);
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
