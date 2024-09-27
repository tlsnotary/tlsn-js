import initWasm, {
  initThreadPool,
  init_logging,
  LoggingLevel,
  LoggingConfig,
  SignedSession as WasmSignedSession,
  Transcript,
  verify_attestation_document,
  type Commit,
  type Reveal,
  Verifier as WasmVerifier,
  Prover as WasmProver,
  type ProverConfig,
  type Method,
  VerifierConfig,
} from '../wasm/pkg/tlsn_wasm';
import { arrayToHex, expect, headerToMap } from './utils';
import type { ParsedTranscriptData, ProofData } from './types';

let LOGGING_LEVEL: LoggingLevel = 'Info';

function debug(...args: any[]) {
  if (['Debug', 'Trace'].includes(LOGGING_LEVEL)) {
    console.log('tlsn-js DEBUG', ...args);
  }
}

export interface RemoteAttestation {
  protected: string;
  payload: string;
  signature: string;
  certificate: string;
  payload_object: Payload;
}

export interface Payload {
  module_id: string;
  timestamp: number;
  digest: string;
  pcrs: Map<number, string>;
  certificate: Uint8Array;
  cabundle: Uint8Array[];
  public_key: Buffer;
  user_data: Uint8Array | null;
  nonce: string | null;
}

/**
 * It generates a random nonce of length 40 using hexadecimal characters.
 * This nonce is used to ensure the uniqueness of the attestation.
 * @returns {string} The generated nonce.
 */

export function generateNonce() {
  return Array.from({ length: 40 }, () =>
    Math.floor(Math.random() * 16).toString(16),
  ).join('');
}

export async function verify_attestation(
  remote_attestation_base64: string,
  nonce: string,
  pcrs: string[],
  timestamp: number = Math.floor(Date.now() / 1000),
) {
  console.log('remote_attestation_base64', remote_attestation_base64);
  return await verify_attestation_document(
    remote_attestation_base64,
    nonce,
    pcrs,
    BigInt(timestamp),
  );
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

  return true;
}

export class Prover {
  #prover: WasmProver;
  #config: ProverConfig;

  static async notarize(options: {
    url: string;
    notaryUrl: string;
    websocketProxyUrl: string;
    method?: Method;
    headers?: {
      [name: string]: string;
    };
    body?: any;
    maxSentData?: number;
    maxRecvData?: number;
    id: string;
    commit?: Commit;
  }) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      maxSentData,
      maxRecvData,
      notaryUrl,
      websocketProxyUrl,
      id,
      commit: _commit,
    } = options;
    const hostname = new URL(url).hostname;
    const notary = NotaryServer.from(notaryUrl);
    const prover = new WasmProver({
      id,
      server_dns: hostname,
      max_sent_data: maxSentData,
      max_recv_data: maxRecvData,
    });

    await prover.setup(await notary.sessionUrl(maxSentData, maxRecvData));

    await prover.send_request(websocketProxyUrl + `?token=${hostname}`, {
      uri: url,
      method,
      headers: headerToMap(headers),
      body,
    });

    return await prover.notarize();
  }

  constructor(config: {
    id?: string;
    serverDns: string;
    maxSentData?: number;
    maxRecvData?: number;
  }) {
    this.#config = {
      id: config.id || String(Date.now()),
      server_dns: config.serverDns,
      max_recv_data: config.maxRecvData,
      max_sent_data: config.maxSentData,
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
    body?: string;
  }> {
    const { url, method = 'GET', headers = {}, body } = request;
    const hostname = new URL(url).hostname;
    const headerMap = headerToMap({
      Host: hostname,
      Connection: 'close',
      ...headers,
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
      body: resp.body,
    };
  }

  async notarize(): Promise<{
    signedSession: string;
    signature: string;
    attestation: string;
    applicationData: string;
  }> {
    const signedSessionString = await this.#prover.notarize();

    const signedSession = signedSessionString.split('\r\n');

    return {
      signature: signedSession[0],
      signedSession: '',
      attestation: signedSession[1],
      applicationData: signedSession[2],
    };
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

  async connect(proverUrl: string): Promise<void> {
    return this.#verifier.connect(proverUrl);
  }
}

export class SignedSession {
  #session: WasmSignedSession;

  constructor(serializedSessionHex: string) {
    this.#session = WasmSignedSession.deserialize(
      new Uint8Array(Buffer.from(serializedSessionHex, 'hex')),
    );
  }

  async free() {
    return this.#session.free();
  }

  async serialize() {
    return arrayToHex(this.#session.serialize());
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
    const url = new URL(this.#url);
    const protocol = url.protocol === 'https:' ? 'wss' : 'ws';
    const pathname = url.pathname;
    return `${protocol}://${url.host}${pathname === '/' ? '' : pathname}/notarize?sessionId=${sessionId!}`;
  }
}

export {
  type ParsedTranscriptData,
  type ProofData,
  type LoggingLevel,
  type LoggingConfig,
  type Transcript,
  type Commit,
  type Reveal,
  type ProverConfig,
};
