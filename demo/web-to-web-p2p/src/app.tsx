import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Watch } from 'react-loader-spinner';
import * as Comlink from 'comlink';
import {
  Prover as TProver,
  Verifier as TVerifier,
  Commit,
  Transcript,
} from 'tlsn-js';
import './app.scss';
import WebSocketStream from './stream';

const { init, Prover, Verifier }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

let proverLogs: string[] = [];
let verifierLogs: string[] = [];

const p2pProxyUrl = 'ws://localhost:3001';
const serverDns = 'swapi.dev';
const webSocketProxy = `wss://notary.pse.dev/proxy?token=${serverDns}`;
const requestUrl = `https://swapi.dev/api/people/1`;

function App(): ReactElement {
  const [ready, setReady] = useState(false);
  const [proverMessages, setProverMessages] = useState<string[]>([]);
  const [verifierMessages, setVerifierMessages] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  // Initialize TLSNotary
  useEffect(() => {
    (async () => {
      await init({ loggingLevel: 'Debug' });
      setReady(true);
    })();
  }, []);

  // Set up streams for prover and verifier
  // This is just for demo purposes. In the future we want to pass in the stream to the
  // prover instead of using the websocket url.
  useEffect(() => {
    (async () => {
      (async () => {
        const proverStream = new WebSocketStream(`${p2pProxyUrl}?id=prover`);
        const reader = await proverStream.reader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('stream finished');
            break;
          }
          console.log(`Received data from stream:`, await value.text());
        }
      })();

      // Set up stream for verifier
      (async () => {
        const verifierStream = new WebSocketStream(
          `${p2pProxyUrl}?id=verifier`,
        );
        const writer = await verifierStream.writer();
        writer.write('Hello');
        writer.write('World!');
        writer.close();
      })();
    })();
  }, []);

  const addProverLog = useCallback((log: string) => {
    proverLogs = proverLogs.concat(
      `${new Date().toLocaleTimeString()} - ${log}`,
    );
    setProverMessages(proverLogs);
  }, []);

  const addVerifierLog = useCallback((log: string) => {
    verifierLogs = verifierLogs.concat(
      `${new Date().toLocaleTimeString()} - ${log}`,
    );
    setVerifierMessages(verifierLogs);
  }, []);

  const start = useCallback(async () => {
    if (!ready) return;
    setStarted(true);
    addProverLog('Instantiate Prover class');
    const prover: TProver = await new Prover({
      serverDns: serverDns,
    });
    addProverLog('Prover class instantiated');

    addVerifierLog('Instantiate Verifier class');
    const verifier: TVerifier = await new Verifier({});
    addVerifierLog('Verifier class instantiated');

    addVerifierLog('Connect verifier to p2p proxy');
    // TODO tlsn-wasm: we want to pass in the stream here instead of the websocket url
    // The stream is both readable and writable (duplex)
    try {
      await verifier.connect(`${p2pProxyUrl}?id=verifier`);
    } catch (e: any) {
      addVerifierLog('Error connecting verifier to p2p proxy');
      addVerifierLog(e.message);
      return;
    }
    addVerifierLog('Verifier connected to p2p proxy');

    addProverLog('Set up prover and connect to p2p proxy');
    // TODO: we also want to pass in the stream here
    const proverSetup = prover.setup(`${p2pProxyUrl}?id=prover`);
    addProverLog('Prover connected to p2p proxy');

    // Wait for prover to finish setting up websocket
    // TODO: Make the setup better and avoid this wait
    await new Promise((r) => setTimeout(r, 2000));

    addVerifierLog('Start verifier');
    // This needs to be called before we send the request
    // This starts the verifier and makes it wait for the prover to send the request
    const verified = verifier.verify();

    await proverSetup;
    addProverLog('Finished prover setup');

    addProverLog('Send request');
    try {
      await prover.sendRequest(webSocketProxy, {
        url: requestUrl,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          hello: 'world',
          one: 1,
        },
      });
    } catch (e: any) {
      addProverLog(`Error sending request to ${requestUrl}`);
      addProverLog(e.message);
      return;
    }
    addProverLog('Request sent');
    const transcript = await prover.transcript();

    addProverLog('Response received');
    addProverLog('Transcript sent');
    addProverLog(transcript.sent);
    addProverLog('Transcript received');
    addProverLog(transcript.recv);

    addProverLog('Revealing data to verifier');
    // Prover only reveals parts the transcript to the verifier
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
    await prover.reveal(commit);
    addProverLog('Data revealed to verifier');

    const result = await verified;
    addVerifierLog('Verification completed');

    const t = new Transcript({
      sent: result.transcript.sent,
      recv: result.transcript.recv,
    });

    addVerifierLog('Verified data:');
    addVerifierLog(`transcript.sent: ${t.sent()}`);
    addVerifierLog(`transcript.recv: ${t.recv()}`);
    setStarted(false);
  }, [ready]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Header */}
      <div className="w-full p-4 bg-slate-800 text-white flex-shrink-0 shadow-md">
        <h1 className="text-xl font-bold">Web-to-Web P2P Demo</h1>
        <p className="text-sm mt-1">
          This demo showcases peer-to-peer communication between a web prover and
          a web verifier using TLSNotary. The prover fetches data from{' '}
          <a
            href="https://swapi.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400 hover:text-blue-300"
          >
            swapi.dev
          </a>{' '}
          and proves it to the verifier.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-rows-2 grid-cols-2 gap-4 p-4 flex-grow">
        {/* Prover Section */}
        <div className="flex flex-col items-center border border-slate-300 bg-white rounded-lg shadow-md row-span-1 col-span-1 p-4 gap-2">
          <div className="font-semibold text-slate-700 text-lg">Prover</div>
          <div className="flex flex-col text-sm bg-slate-50 border border-slate-200 w-full flex-grow py-2 overflow-y-auto rounded">
            {proverMessages.map((m, index) => (
              <span
                key={index}
                className="px-3 py-1 text-slate-600 break-words"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Verifier Section */}
        <div className="flex flex-col items-center border border-slate-300 bg-white rounded-lg shadow-md row-span-1 col-span-1 p-4 gap-2">
          <div className="font-semibold text-slate-700 text-lg">Verifier</div>
          <div className="flex flex-col text-sm bg-slate-50 border border-slate-200 w-full flex-grow py-2 overflow-y-auto rounded">
            {verifierMessages.map((m, index) => (
              <span
                key={index}
                className="px-3 py-1 text-slate-600 break-words"
              >
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Start Button Section */}
        <div className="flex flex-row justify-center items-center row-span-1 col-span-2">
          <Button
            className="bg-slate-800 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:bg-slate-700 disabled:opacity-50"
            disabled={!ready || started}
            onClick={start}
          >
            <div className="flex items-center">
              {ready && !started ? (
                <>Start Demo</>
              ) : (
                <Watch
                  visible={true}
                  height="40"
                  width="40"
                  radius="48"
                  color="#ffffff"
                  ariaLabel="watch-loading"
                />
              )}
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}

if ((module as any).hot) {
  (module as any).hot.accept();
}

function Button(props: any) {
  const { className = '', ...p } = props;
  return (
    <button
      className={`px-4 py-2 bg-slate-300 rounded transition-colors border border-b-slate-400 border-r-slate-400  border-t-white border-l-white hover:bg-slate-200 active:bg-slate-300 active:border-t-slate-400 active:border-l-slate-400  active:border-b-white active:border-r-white disabled:opacity-50 disabled:bg-slate-200 ${className}`}
      {...p}
    />
  );
}
