import React, { ReactElement, useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Comlink from 'comlink';
import { Watch } from 'react-loader-spinner';
import { Prover as TProver } from 'tlsn-js';
import { type Method } from 'tlsn-wasm';
import './app.scss';
import { HTTPParser } from 'http-parser-js';
import { Reveal, mapStringToRange, subtractRanges } from 'tlsn-js';

const { init, Prover }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(<App />);

const serverUrl = 'https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.12/crates/server-fixture/server/src/data/1kb.json';
// const websocketProxyUrl = `wss://notary.pse.dev/proxy`;
const websocketProxyUrl = 'ws://localhost:55688';
const verifierProxyUrl = 'ws://localhost:9816/verify';

function App(): ReactElement {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onClick = useCallback(async () => {
    setProcessing(true);

    const url = serverUrl;
    const method: Method = 'GET';
    const headers = {
      secret: "TLSNotary's private key",
      'Content-Type': 'application/json',
    };
    const body = {};

    const hostname = new URL(url).hostname;

    let prover: TProver;
    try {
      console.time('setup');
      await init({ loggingLevel: 'Info' });
      console.log('Setting up Prover for', hostname);
      prover = (await new Prover({
        serverDns: hostname,
        maxRecvData: 2000
      })) as TProver;
      console.log('Setting up Prover: 1/2');
      await prover.setup(verifierProxyUrl);
      console.log('Setting up Prover: done');
      console.timeEnd('setup');
    } catch (error) {
      const msg = `Error setting up prover: ${error}`;
      console.error(msg);
      setResult(msg);
      setProcessing(false);
      return;
    }

    let transcript;
    try {
      console.time('request');
      console.log('Sending request to proxy');

      const resp = await prover.sendRequest(
        `${websocketProxyUrl}?token=${hostname}`,
        { url, method, headers, body },
      );
      console.log('Response:', resp);
      console.log('Wait for transcript');
      transcript = await prover.transcript();
      console.log('Transcript:', transcript);
      console.timeEnd('request');
    } catch (error) {
      const msg = `Error sending request: ${error}`;
      console.error(msg);
      setResult(msg);
      setProcessing(false);
      return;
    }

    try {
      const { sent, recv } = transcript;
      const {
        info: recvInfo,
        headers: recvHeaders,
        body: recvBody,
      } = parseHttpMessage(Buffer.from(recv), 'response');

      const body = JSON.parse(recvBody[0].toString());

      console.log("test", body.information.address.street);

      console.time('reveal');
      const reveal: Reveal = {
        sent: subtractRanges(
          { start: 0, end: sent.length },
          mapStringToRange(
            ['secret: test_secret'],
            Buffer.from(sent).toString('utf-8'),
          ),
        ),
        recv: [
          ...mapStringToRange(
            [
              recvInfo,
              `${recvHeaders[4]}: ${recvHeaders[5]}\r\n`,
              `${recvHeaders[6]}: ${recvHeaders[7]}\r\n`,
              `${recvHeaders[8]}: ${recvHeaders[9]}\r\n`,
              `${recvHeaders[10]}: ${recvHeaders[11]}\r\n`,
              `${recvHeaders[12]}: ${recvHeaders[13]}`,
              `${recvHeaders[14]}: ${recvHeaders[15]}`,
              `${recvHeaders[16]}: ${recvHeaders[17]}`,
              `${recvHeaders[18]}: ${recvHeaders[19]}`,
              `"name": "${body.information.name}"`,
              `"street": "${body.information.address.street}"`,
            ],
            Buffer.from(recv).toString('utf-8'),
          ),
        ],
        server_identity: true,
      };
      console.log('Start reveal:', reveal);
      await prover.reveal(reveal);
      console.timeEnd('reveal');
    } catch (error) {
      console.dir(error);
      console.error('Error during data reveal:', error);
      setResult(`${error}`);
      setProcessing(false);
      return;
    }

    console.log('Ready');

    console.log('Unredacted data:', {
      sent: transcript.sent,
      received: transcript.recv,
    });

    setResult(
      "Unredacted data successfully revealed to Verifier. Check the Verifier's console output to see what exactly was shared and revealed.",
    );

    setProcessing(false);
  }, [setResult, setProcessing]);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gray-50 p-4">
      <h1 className="text-4xl font-bold text-slate-500 mb-2">TLSNotary</h1>
      <span className="text-lg text-gray-600 mb-4">
        Interactive Prover Demo
      </span>

      <div className="text-center text-gray-700 mb-6">
        <p>
          Before clicking the <span className="font-semibold">Start</span>{' '}
          button, make sure the <i>interactive verifier</i> and the{' '}
          <i>web socket proxy</i> are running.
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
              <td className="border px-4 py-2">Verifier</td>
              <td className="border px-4 py-2">{verifierProxyUrl}</td>
            </tr>
            <tr>
              <td className="border px-4 py-2">WebSocket Proxy</td>
              <td className="border px-4 py-2">{websocketProxyUrl}</td>
            </tr>
            <tr>
              <td className="border px-4 py-2">Prover</td>
              <td className="border px-4 py-2">This browser</td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={!processing ? onClick : undefined}
        disabled={processing}
        className={`px-6 py-2 rounded-lg font-medium text-white
          ${processing ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-600 hover:bg-slate-700'}
        `}
      >
        Start Prover
      </button>

      <div className="mt-6 w-full max-w-3xl text-center">
        <b className="text-lg font-medium text-gray-800">Proof: </b>
        {!processing && !result ? (
          <i className="text-gray-500">Not started yet</i>
        ) : !result ? (
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-700 mb-2">Proving data from GitHub...</p>
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
            <p className="text-sm text-gray-500 mt-2">
              Open <i>Developer Tools</i> to follow progress
            </p>
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
