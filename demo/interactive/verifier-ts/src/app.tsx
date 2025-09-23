import React, { ReactElement, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
import { Verifier as TVerifier } from 'tlsn-wasm';
import './app.scss';
import { HTTPParser } from 'http-parser-js';

const { init, Verifier }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

let consoleLogs: string[] = [];

const serverUrl = 'https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.12/crates/server-fixture/server/src/data/1kb.json';
// const websocketProxyUrl = `wss://notary.pse.dev/proxy`;
const proverProxyUrl = 'ws://localhost:9816/prove';

function App(): ReactElement {
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [consoleMessages, setConsoleMessages] = useState<string[]>([]);

  const addConsoleLog = useCallback((log: string) => {
    consoleLogs = consoleLogs.concat(
      `${new Date().toLocaleTimeString()} - ${log}`,
    );
    setConsoleMessages([...consoleLogs]);
  }, []);

  // Initialize TLSNotary
  React.useEffect(() => {
    (async () => {
      await init({ loggingLevel: 'Info' });
      setReady(true);
      addConsoleLog('TLSNotary initialized and ready');
    })();
  }, [addConsoleLog]);

  const onClick = useCallback(async () => {
    setProcessing(true);
    consoleLogs = [];
    setConsoleMessages([]);
    addConsoleLog('Starting verifier demo...');

    let verifier: TVerifier;
    try {
      addConsoleLog('Setting up Verifier');
      verifier = await new Verifier({
        maxSentData: 2048,
        maxRecvData: 4096
      });
      addConsoleLog('Verifier class instantiated');
      await verifier.connect(proverProxyUrl);
      addConsoleLog('Connecting verifier to p2p proxy: done');
    } catch (e: any) {
      addConsoleLog('Error setting up verifier: ' + e.message);
      addConsoleLog('Error connecting verifier to p2p proxy: ' + e.message);
      setProcessing(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 2000));

    addConsoleLog('Start verifier');
    // This needs to be called before we send the request
    // This starts the verifier and makes it wait for the prover to send the request
    const verified = verifier.verify();
    const result = await verified;
    addConsoleLog('Verification completed');

    const sent_b = result.transcript?.sent || [];
    const recv_b = result.transcript?.recv || [];

    let recv = bytesToUtf8(substituteRedactions(recv_b, '*'));
    let sent = bytesToUtf8(substituteRedactions(sent_b, '*'));

    addConsoleLog('Verified data received');
    addConsoleLog(`Transcript sent: ${sent.substring(0, 100)}${sent.length > 100 ? '...' : ''}`);
    addConsoleLog(`Transcript received: ${recv.substring(0, 100)}${recv.length > 100 ? '...' : ''}`);

    addConsoleLog('Ready - verification completed successfully');

    setResult(
      recv,
    );

    setProcessing(false);
  }, [setResult, setProcessing, addConsoleLog]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-100 overflow-hidden">
      <div className="w-full p-4 bg-slate-800 text-white flex-shrink-0 shadow-md">
        <h1 className="text-xl font-bold">TLSNotary Interactive Verifier Demo</h1>
        <span className="text-sm mt-1">
          Interactive Verifier Demo
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 p-4 flex-grow">
        <div className="flex flex-col bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Demo Controls</h2>
          
          <div className="text-center text-gray-700 mb-6">
            <p>
              Before clicking the <span className="font-semibold">Verify</span>{' '}
              button, make sure the <i>interactive Prover</i> is running.<br />
              (This demo does not require a proxy server.)
            </p>
            <p>
              Check the{' '}
              <a href="README.md" className="text-blue-600 hover:underline">
                README
              </a>{' '}
              for the details.
            </p>
            <table className="text-left table-auto w-full mt-4">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">Demo Settings</th>
                  <th className="px-4 py-2 text-left">URL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border px-4 py-2">Server</td>
                  <td className="border px-4 py-2">{serverUrl}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">Prover</td>
                  <td className="border px-4 py-2">{proverProxyUrl}</td>
                </tr>
                <tr>
                  <td className="border px-4 py-2">Verifier</td>
                  <td className="border px-4 py-2">This browser</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button
            onClick={!processing && ready ? onClick : undefined}
            disabled={processing || !ready}
            className={`px-6 py-2 rounded-lg font-medium text-white mb-4
              ${processing || !ready ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}
            `}
          >
            {ready ? 'Verify Prover Server' : 'Initializing...'}
          </button>

          <div className="w-full text-center">
            <b className="text-lg font-medium text-gray-800">Verified data: </b>
            {!processing && !result ? (
              <i className="text-gray-500">Not started yet</i>
            ) : !result ? (
              <div className="flex flex-col items-center justify-center">
                <p className="text-gray-700 mb-2">Verifying data from Prover...</p>
                <Watch
                  visible={true}
                  height="40"
                  width="40"
                  radius="48"
                  color="#4A5568"
                  ariaLabel="watch-loading"
                  wrapperStyle={{}}
                  wrapperClass=""
                />
              </div>
            ) : (
              <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg mt-4">
                <pre data-testid="proof-data" className="text-left text-sm text-gray-800 whitespace-pre-wrap overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Console Log</h2>
          <div className="flex flex-col text-sm bg-slate-50 border border-slate-200 w-full flex-grow py-2 overflow-y-auto rounded">
            {consoleMessages.map((m, index) => (
              <span
                key={index}
                data-testid="console-log"
                className="px-3 py-1 text-slate-600 break-all"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseHttpMessage(buffer: Buffer, type: 'request' | 'response') {
  const parser = new HTTPParser(
    type === 'request' ? HTTPParser.REQUEST : HTTPParser.RESPONSE,
  );
  const body: Buffer[] = [];
  let complete = false;
  let headers: string[] = [];

  parser.onBody = (t) => {
    body.push(t);
  };

  parser.onHeadersComplete = (res) => {
    headers = res.headers;
  };

  parser.onMessageComplete = () => {
    complete = true;
  };

  parser.execute(buffer);
  parser.finish();

  if (!complete) throw new Error(`Could not parse ${type.toUpperCase()}`);

  return {
    info: buffer.toString('utf-8').split('\r\n')[0] + '\r\n',
    headers,
    body,
  };
}

function substituteRedactions(
  array: number[],
  redactedSymbol: string = "*",
): number[] {
  const replaceCharByte = redactedSymbol.charCodeAt(0);
  return array.map((byte) => (byte === 0 ? replaceCharByte : byte));
}

function bytesToUtf8(array: number[]): string {
  return Buffer.from(array).toString("utf8");
}