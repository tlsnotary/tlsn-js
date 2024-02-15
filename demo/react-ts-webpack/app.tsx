import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { prove, verify } from '../../src';
import { Proof } from 'tlsn-js/build/types';

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
      notaryUrl: 'http://localhost:7047',
      websocketProxyUrl: 'ws://localhost:55688',
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
        Start
      </button>
      <div>
        <b>Proof: </b>
        <i>
          {!processing && !proof
            ? 'not started'
            : !proof
              ? 'proving'
              : JSON.stringify(proof, null, 2)}
        </i>
      </div>
      <div>
        <b>Verify: </b>
        <i>
          {!proof
            ? 'not started'
            : !result
              ? 'verifying'
              : JSON.stringify(result, null, 2)}
        </i>
      </div>
    </div>
  );
}
