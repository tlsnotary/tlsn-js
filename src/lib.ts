import initWasm, {
  initThreadPool,
  init_logging,
  LoggingLevel,
  LoggingConfig,
  NotarizedSession as WasmNotarizedSession,
  Transcript,
  TlsProof as WasmTlsProof,
  type Commit,
  type Reveal,
  Verifier as WasmVerifier,
  Prover as WasmProver,
  type ProverConfig,
  type Method,
} from '../wasm/pkg/tlsn_wasm';
import { arrayToHex, processTranscript, stringToBuffer } from './utils';
import { ParsedTranscriptData } from './types';

let LOGGING_LEVEL: LoggingLevel = 'Info';

function debug(...args: any[]) {
  if (['Debug', 'Trace'].includes(LOGGING_LEVEL)) {
    console.log('tlsn-js DEBUG', ...args);
  }
}

export default async function init(config?: {
  loggingLevel?: LoggingLevel;
  hardwareConcurrency?: number;
}) {
  const {
    loggingLevel = 'Info',
    hardwareConcurrency = navigator.hardwareConcurrency,
  } = config || {};

  LOGGING_LEVEL = loggingLevel;

  const res = await initWasm();

  init_logging({
    level: loggingLevel,
    crate_filters: undefined,
    span_events: undefined,
  });

  // 6422528 ~= 6.12 mb
  debug('res.memory=', res.memory);
  debug('res.memory.buffer.length=', res.memory.buffer.byteLength);
  debug('DEBUG', 'initialize thread pool');

  await initThreadPool(hardwareConcurrency);
  debug('initialized thread pool');
}

export class Prover {
  #prover: WasmProver;
  #config: ProverConfig;

  constructor(
    config: Omit<ProverConfig, 'id'> & {
      id?: string;
    },
  ) {
    this.#config = {
      id: config.id || String(Date.now()),
      ...config,
    };
    this.#prover = new WasmProver(this.#config);
  }

  get id() {
    return this.#config.id;
  }

  private async getNotarySessionUrl(verifierUrl: string): Promise<string> {
    const { max_sent_data, max_recv_data } = this.#config;
    const resp = await fetch(`${verifierUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientType: 'Websocket',
        maxRecvData: max_recv_data,
        maxSentData: max_sent_data,
      }),
    });
    const { sessionId } = await resp.json();

    return `${verifierUrl}/notarize?sessionId=${sessionId!}`;
  }

  async free() {
    return this.#prover.free();
  }

  async setup(
    verifierUrl: string,
    config?: { isNotary: boolean },
  ): Promise<void> {
    const { isNotary = true } = config || {};
    const url = isNotary
      ? await this.getNotarySessionUrl(verifierUrl)
      : verifierUrl;
    return this.#prover.setup(url);
  }

  async transcript(): Promise<{
    sent: string;
    recv: string;
    ranges: { recv: ParsedTranscriptData; sent: ParsedTranscriptData };
  }> {
    const transcript = this.#prover.transcript();
    const recv = Buffer.from(transcript.recv).toString();
    const sent = Buffer.from(transcript.sent).toString();
    return {
      recv,
      sent,
      ranges: {
        recv: processTranscript(recv),
        sent: processTranscript(sent),
      },
    };
  }

  async sendRequest(
    wsProxyUrl: string,
    request: {
      url: string;
      method?: Method;
      headers?: { [key: string]: string };
      body?: any;
    },
  ): Promise<{
    status: number;
    headers: { [key: string]: string };
  }> {
    const { url, method = 'GET', headers = {}, body } = request;
    const hostname = new URL(url).hostname;
    const headerMap: Map<string, number[]> = new Map();

    headerMap.set('Host', stringToBuffer(hostname));
    headerMap.set('Connection', stringToBuffer('close'));
    Object.entries(headers).forEach(([key, value]) => {
      headerMap.set(key, stringToBuffer(value));
    });

    const resp = await this.#prover.send_request(wsProxyUrl, {
      uri: url,
      method,
      headers: headerMap,
      body,
    });
    debug('prover.sendRequest', resp);

    return {
      status: resp.status,
      headers: resp.headers.reduce(
        (acc: { [key: string]: string }, [name, arr]) => {
          acc[name] = Buffer.from(arr).toString();
          return acc;
        },
        {},
      ),
    };
  }

  async notarize(commit: Commit): Promise<string> {
    const notarizedSession = await this.#prover.notarize(commit);
    return arrayToHex(notarizedSession.serialize());
  }
}

export class NotarizedSession {
  #session: WasmNotarizedSession;

  constructor(serializedSessionHex: string) {
    this.#session = WasmNotarizedSession.deserialize(
      new Uint8Array(Buffer.from(serializedSessionHex, 'hex')),
    );
  }

  async free() {
    return this.#session.free();
  }

  async proof(reveal: Reveal) {
    const proof = this.#session.proof(reveal);
    return arrayToHex(proof.serialize());
  }

  async serialize() {
    return arrayToHex(this.#session.serialize());
  }
}

export class TlsProof {
  #proof: WasmTlsProof;

  constructor(serializedProofHex: string) {
    this.#proof = WasmTlsProof.deserialize(
      new Uint8Array(Buffer.from(serializedProofHex, 'hex')),
    );
  }

  async free() {
    return this.#proof.free();
  }

  async serialize() {
    return arrayToHex(this.#proof.serialize());
  }

  async verify(notaryKey: string) {
    const result = this.#proof.verify(
      new Uint8Array(stringToBuffer(notaryKey)),
    );
    debug(result);
  }
}

export {
  // init,
  // initThreadPool,
  // init_logging,
  // TlsProof,
  // Verifier,
  // NotarizedSession,
  type LoggingLevel,
  type LoggingConfig,
  type Transcript,
  type Commit,
  type Reveal,
  type ProverConfig,
};
