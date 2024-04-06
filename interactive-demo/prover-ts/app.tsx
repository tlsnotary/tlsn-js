import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { interactive_prove, prove, verify } from 'tlsn-js';
import { Proof } from 'tlsn-js/build/types';
import { Watch } from 'react-loader-spinner';

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<String | null>(null);

  const onClick = useCallback(async () => {
    setProcessing(true);
    const result = await interactive_prove(
      'wss://notary.pse.dev/proxy?token=swapi.dev', //'ws://localhost:55688',
      'ws://localhost:9816',
      "https://swapi.dev/api/people/1",
      "interactive-verifier-demo");
    setResult(result);
    setProcessing(false);

  }, [setResult, setProcessing]);

  return (
    <div>
      <h1>TLSNotary interactive prover demo</h1>
      <div>
        Before clicking the start button, make sure the <i>interactive verifier</i> is running: <pre>cd interactive-demo/verifier; cargo run --release</pre>
      </div>
      <br />
      <button onClick={!processing ? onClick : undefined} disabled={processing}>
        Start Prover
      </button>
      <br />
      <div>
        <b>Proof: </b>
        {!processing && !result ? (
          <i>not started yet</i>
        ) : !result ? (
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
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </>
        )}
      </div>
    </div>
  );
}
