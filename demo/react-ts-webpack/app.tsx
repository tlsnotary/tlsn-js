import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { prove, verify } from 'tlsn-js';
import { Proof } from 'tlsn-js/build/types';
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
  const [proof, setProof] = useState<Proof | null>(null);

  const onClick = useCallback(async () => {
    setProcessing(true);
    const p = await prove('https://swapi.dev/api/people/1', {
      method: 'GET',
      maxTranscriptSize: 16384,
      notaryUrl: 'https://notary.pse.dev',
      websocketProxyUrl: 'wss://notary.pse.dev/proxy?token=swapi.dev',
    });
    setProof(p);
  }, [setProof, setProcessing]);

  useEffect(() => {
    (async () => {
      if (proof) {
        const r = await verify(proof);
        setResult(r);
        setProcessing(false);
      }
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
