import React, { ReactElement, useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import {
  Prover as TProver,
  Verifier as TVerifier,
  Commit,
  Transcript,
} from 'tlsn-js';
import './app.scss';
import WebscoketStream from './stream';

const { init, Prover, Verifier }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

let pLogs: string[] = [];
let vLogs: string[] = [];

function App(): ReactElement {
  const [ready, setReady] = useState(false);
  const [proverMessages, setProverMessages] = useState<string[]>([]);
  const [verifierMessages, setVerifierMessages] = useState<string[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    (async () => {
      await init({ loggingLevel: 'Debug' });
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      // Set up stream for prover
      (async () => {
        const proverStream = new WebscoketStream(
          'ws://localhost:3001?id=prover',
        );
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
        const verifierStream = new WebscoketStream(
          'ws://localhost:3001?id=verifier',
        );
        const writer = await verifierStream.writer();
        writer.write('Hello');
        writer.write('World!');
        writer.close();
      })();
    })();
  }, []);

  const addProverLog = useCallback((log: string) => {
    pLogs = pLogs.concat(`${new Date().toLocaleTimeString()} - ${log}`);
    setProverMessages(pLogs);
  }, []);

  const addVerifierLog = useCallback((log: string) => {
    vLogs = vLogs.concat(`${new Date().toLocaleTimeString()} - ${log}`);
    setVerifierMessages(vLogs);
  }, []);

  const start = useCallback(async () => {
    if (!ready) return;
    setStarted(true);
    addProverLog('instantiate Prover class');
    const prover: TProver = await new Prover({
      id: 'demo',
      serverDns: 'swapi.dev',
      maxSentData: 4096,
      maxRecvData: 16384,
    });
    addProverLog('Prover class instantiated');

    addVerifierLog('instantiate Verifier class');
    const verifier: TVerifier = await new Verifier({
      id: 'demo',
      maxSentData: 4096,
      maxRecvData: 16384,
    });
    addVerifierLog('Verifier class instantiated');

    addVerifierLog('connecting verifier');
    await verifier.connect('ws://localhost:3001?id=verifier');
    addVerifierLog('finished connecting verifier');

    addProverLog('setting up prover');
    const proverSetup = prover.setup('ws://localhost:3001?id=prover');

    await new Promise((r) => setTimeout(r, 2000));

    addVerifierLog('verifiying with prover');
    const verified = verifier.verify();

    await proverSetup;
    addProverLog('finished setting up prover');

    addProverLog('sending request');
    await prover.sendRequest(`wss://notary.pse.dev/proxy?token=swapi.dev`, {
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
    addProverLog('request sent');
    const transcript = await prover.transcript();

    addProverLog('response received');
    addProverLog('transcript.sent');
    addProverLog(transcript.sent);
    addProverLog('transcript.recv');
    addProverLog(transcript.recv);

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

    addProverLog('revealing to verifier');
    await prover.reveal(commit);
    addProverLog('revealed to verifier');

    const result = await verified;
    addVerifierLog('proof completed');

    const t = new Transcript({
      sent: result.transcript.sent,
      recv: result.transcript.recv,
    });

    addVerifierLog('transcript.sent');
    addVerifierLog(t.sent());
    addVerifierLog('transcript.recv');
    addVerifierLog(t.recv());
  }, [ready]);

  return (
    <div className="w-screen h-screen grid grid-rows-2 grid-cols-2 p-2 gap-2">
      <div className="flex flex-col items-center border border-slate-300 bg-slate-50 rounded row-span-1 col-span-1 p-4 gap-2">
        <div className="font-semibold">Prover</div>
        <div className="flex flex-col text-sm bg-white border border-slate-300 w-full flex-grow cursor-text py-1 overflow-y-auto">
          {proverMessages.map((m) => (
            <span className="px-2 py-1 text-slate-600 break-all">{m}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center border border-slate-300 bg-slate-100 rounded row-span-1 col-span-1 p-4 gap-2">
        <div className="font-semibold">Verifier</div>
        <div className="flex flex-col text-sm bg-white border border-slate-300 w-full flex-grow cursor-text py-1 overflow-y-auto">
          {verifierMessages.map((m) => (
            <span className="px-1 py-0.5 text-slate-600 break-all">{m}</span>
          ))}
        </div>
      </div>
      <div className="flex flex-row justify-center row-span-1 col-span-2">
        <Button className="h-fit" disabled={!ready || started} onClick={start}>
          Start Demo
        </Button>
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
