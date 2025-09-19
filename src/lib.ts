import initWasm, {
  initialize,
  LoggingLevel,
  LoggingConfig,
  type Commit,
  type Reveal,
  Verifier as WasmVerifier,
  Prover as WasmProver,
  type ProverConfig,
  type Method,
  NetworkSetting,
  VerifierConfig,
  VerifierOutput,
  ConnectionInfo,
  PartialTranscript,
} from 'tlsn-wasm';
import { arrayToHex, expect, headerToMap, hexToArray } from './utils';
import { PresentationJSON, } from './types';
import { Buffer } from 'buffer';
import { Transcript, subtractRanges, mapStringToRange } from './transcript';

let LOGGING_LEVEL: LoggingLevel = 'Info';

function debug(...args: unknown[]) {
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

  // 6422528 ~= 6.12 mb
  debug('res.memory', res.memory);
  debug('res.memory.buffer.length', res.memory.buffer.byteLength);
  debug('initialize thread pool');

  await initialize(
    {
      level: loggingLevel,
      crate_filters: undefined,
      span_events: undefined,
    },
    hardwareConcurrency,
  );

  debug('initialized thread pool');
}

export class Prover {
  #prover: WasmProver;
  #config: ProverConfig;
  #verifierUrl?: string;
  #websocketProxyUrl?: string;

  constructor(config: {
    serverDns: string;
    maxSentData?: number;
    maxSentRecords?: number,
    maxRecvData?: number;
    maxRecvDataOnline?: number;
    maxRecvRecordsOnline?: number,
    deferDecryptionFromStart?: boolean;
    network?: NetworkSetting
    clientAuth?: [number[][], number[]] | undefined,
  }) {
    this.#config = {
      server_name: config.serverDns,
      max_sent_data: config.maxSentData || 1024,
      max_sent_records: config.maxSentRecords,
      max_recv_data: config.maxRecvData || 1024,
      max_recv_data_online: config.maxRecvDataOnline,
      max_recv_records_online: config.maxRecvRecordsOnline,
      defer_decryption_from_start: config.deferDecryptionFromStart,
      network: config.network || 'Bandwidth',
      client_auth: config.clientAuth
    };
    this.#prover = new WasmProver(this.#config);
  }

  async free() {
    return this.#prover.free();
  }

  async setup(verifierUrl: string): Promise<void> {
    this.#verifierUrl = verifierUrl;
    return this.#prover.setup(verifierUrl);
  }

  async transcript(): Promise<{ sent: number[]; recv: number[] }> {
    const transcript = this.#prover.transcript();
    return { sent: transcript.sent, recv: transcript.recv };
  }

  static getHeaderMap(
    url: string,
    body?: unknown,
    headers?: { [key: string]: string },
  ) {
    const hostname = new URL(url).hostname;
    const h: { [name: string]: string } = {
      Host: hostname,
      Connection: 'close',
    };

    if (typeof body === 'string') {
      h['Content-Length'] = body.length.toString();
    } else if (typeof body === 'object') {
      h['Content-Length'] = JSON.stringify(body).length.toString();
    } else if (typeof body === 'number') {
      h['Content-Length'] = body.toString().length.toString();
    }

    const headerMap = headerToMap({
      ...h,
      ...headers,
    });

    return headerMap;
  }

  async sendRequest(
    wsProxyUrl: string,
    request: {
      url: string;
      method?: Method;
      headers?: { [key: string]: string };
      body?: unknown;
    },
  ): Promise<{
    status: number;
    headers: { [key: string]: string };
  }> {
    this.#websocketProxyUrl = wsProxyUrl;
    const { url, method = 'GET', headers = {}, body } = request;

    const headerMap = Prover.getHeaderMap(url, body, headers);

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

  async reveal(reveal: Reveal) {
    return this.#prover.reveal(reveal);
  }
}

export class Verifier {
  #config: VerifierConfig;
  #verifier: WasmVerifier;

  constructor(config: { maxSentData?: number; maxRecvData?: number; maxSentRecords?: number; maxRecvRecordsOnline?: number }) {
    this.#config = {
      max_recv_data: config.maxRecvData || 1024,
      max_sent_data: config.maxSentData || 1024,
      max_sent_records: config.maxSentRecords,
      max_recv_records_online: config.maxRecvRecordsOnline,
    };
    this.#verifier = new WasmVerifier(this.#config);
  }

  async verify(): Promise<VerifierOutput> {
    return this.#verifier.verify();
  }

  async connect(proverUrl: string): Promise<void> {
    return this.#verifier.connect(proverUrl);
  }
}


export {
  type LoggingLevel,
  type LoggingConfig,
  type Commit,
  type Method,
  type Reveal,
  type ProverConfig,
  type VerifierConfig,
  type VerifierOutput,
  type ConnectionInfo,
  type PartialTranscript,
  Transcript,
  mapStringToRange,
  subtractRanges,
};
