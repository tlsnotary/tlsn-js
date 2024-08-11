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
  VerifierConfig,
  VerifierData,
  NotaryPublicKey,
} from '../wasm/pkg/tlsn_wasm';
import { arrayToHex, processTranscript, stringToBuffer, expect } from './utils';
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

  async free() {
    return this.#prover.free();
  }

  async setup(verifierUrl: string): Promise<void> {
    return this.#prover.setup(verifierUrl);
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

export class Verifier {
  #config: VerifierConfig;
  #verifier: WasmVerifier;

  constructor(config: VerifierConfig) {
    this.#config = config;
    this.#verifier = new WasmVerifier(this.#config);
  }

  get id() {
    return this.#config.id;
  }

  async verify(): Promise<VerifierData> {
    return this.#verifier.verify();
  }

  async connect(proverUrl: string): Promise<void> {
    return this.#verifier.connect(proverUrl);
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

  async verify(
    notaryPublicKey: NotaryPublicKey,
    redactedSymbol = '*',
  ): Promise<{
    time: number;
    server_dns: string;
    sent: string;
    sent_auth_ranges: { start: number; end: number }[];
    recv: string;
    recv_auth_ranges: { start: number; end: number }[];
  }> {
    const { received, received_auth_ranges, sent, ...rest } =
      this.#proof.verify(notaryPublicKey);

    return {
      ...rest,
      recv_auth_ranges: received_auth_ranges,
      recv: received.reduce((recv: string, num) => {
        recv =
          recv + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
        return recv;
      }, ''),
      sent: sent.reduce((sent: string, num) => {
        sent =
          sent + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
        return sent;
      }, ''),
    };
  }
}

export class NotaryServer {
  #url: string;

  static from(url: string) {
    return new NotaryServer(url);
  }

  constructor(url: string) {
    this.#url = url;
  }

  get url() {
    return this.#url;
  }

  async publicKey(): Promise<string> {
    const res = await fetch(this.#url + '/info');
    const { publicKey } = await res.json();
    expect(
      typeof publicKey === 'string' && !!publicKey.length,
      'invalid public key',
    );
    return publicKey!;
  }

  async sessionUrl(
    maxSentData?: number,
    maxRecvData?: number,
  ): Promise<string> {
    const resp = await fetch(`${this.#url}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientType: 'Websocket',
        maxRecvData,
        maxSentData,
      }),
    });
    const { sessionId } = await resp.json();
    expect(
      typeof sessionId === 'string' && !!sessionId.length,
      'invalid session id',
    );
    return `${this.#url}/notarize?sessionId=${sessionId!}`;
  }
}

export {
  type LoggingLevel,
  type LoggingConfig,
  type Transcript,
  type Commit,
  type Reveal,
  type ProverConfig,
};
