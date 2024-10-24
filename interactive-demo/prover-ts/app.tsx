import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
import {
  Prover as TProver,
} from 'tlsn-js';
import { type Method } from 'tlsn-wasm';

const { init, Prover, NotarizedSession, TlsProof }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

function App(): ReactElement {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<String | null>(null);
  const [proofHex, setProofHex] = useState<null | string>(null);

  const onClick = useCallback(async () => {
    setProcessing(true);

    let url = "https://swapi.dev/api/people/1";
    let method: Method = 'GET';
    let headers = {
      'secret': "TLSNotary's private key",
      'Content-Type': 'application/json',
    };
    let body = {};
    // let websocketProxyUrl = 'wss://notary.pse.dev/proxy';
    let websocketProxyUrl = 'ws://localhost:55688';
    let verifierProxyUrl = 'ws://localhost:9816/verify';
    const hostname = new URL(url).hostname;

    console.time('setup');

    await init({ loggingLevel: 'Info' });

    console.log("Setting up Prover for", hostname)
    const prover = await new Prover({ serverDns: hostname }) as TProver;
    console.log("Setting up Prover: 1/2")
    await prover.setup(verifierProxyUrl);
    console.log("Setting up Prover: done")

    console.timeEnd('setup');

    console.time('request');
    console.log("Sending request to proxy")
    const resp = await prover.sendRequest(
      `${websocketProxyUrl}?token=${hostname}`, { url, method, headers, body, }
    );
    console.log("Response:", resp);

    console.log("Wait for transcript")
    const transcript = await prover.transcript();
    console.log("Transcript:", transcript);

    console.timeEnd('request');

    console.time('reveal');
    const reveal = {
      sent: [
        transcript.ranges.sent.info!,
        transcript.ranges.sent.headers!['connection'],
        transcript.ranges.sent.headers!['host'],
        transcript.ranges.sent.headers!['content-type'],
        transcript.ranges.sent.headers!['content-length'],
        ...transcript.ranges.sent.lineBreaks,
      ],
      recv: [
        transcript.ranges.recv.info!,
        transcript.ranges.recv.headers['server'],
        transcript.ranges.recv.headers['date'],
        transcript.ranges.recv.headers['content-type'],
        transcript.ranges.recv.json!['name'],
        transcript.ranges.recv.json!['eye_color'],
        transcript.ranges.recv.json!['gender'],
        ...transcript.ranges.recv.lineBreaks,
      ],
    };
    console.log("Start reveal:", reveal);
    await prover.reveal(reveal);
    console.timeEnd('reveal');

    console.log("Ready");

    console.log("Unredacted data:", { sent: transcript.sent, received: transcript.recv })

    setResult("Unredacted data successfully revealed to Verifier.");

    setProcessing(false);
  }, [setResult, setProcessing]);

  return (
    <div>
      <h1>TLSNotary interactive prover demo</h1>
      <div>
        Before clicking the start button, make sure the <i>interactive verifier</i> is running: <pre>cd interactive-demo/verifier; cargo run --release</pre>
        You also need a websocket proxy.
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
