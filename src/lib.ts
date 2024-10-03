import initWasm, {
  initThreadPool,
  init_logging,
  LoggingLevel,
  LoggingConfig,
  Attestation as WasmAttestation,
  Secrets as WasmSecrets,
  type Commit,
  type Reveal,
  Verifier as WasmVerifier,
  Prover as WasmProver,
  type ProverConfig,
  type Method,
  VerifierConfig,
  VerifierOutput,
  VerifyingKey,
  Presentation as WasmPresentation,
  build_presentation,
  ConnectionInfo,
  PartialTranscript,
} from '../wasm/pkg/tlsn_wasm';
import {
  arrayToHex,
  processTranscript,
  expect,
  headerToMap,
  hexToArray,
} from './utils';
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
    maxRecvDataOnline?: number;
    deferDecryptionFromStart?: boolean;
    commit?: Commit;
  }) {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      maxSentData = 1024,
      maxRecvData = 1024,
      maxRecvDataOnline,
      deferDecryptionFromStart,
      notaryUrl,
      websocketProxyUrl,
      commit: _commit,
    } = options;
    const hostname = new URL(url).hostname;
    const notary = NotaryServer.from(notaryUrl);
    const prover = new WasmProver({
      server_name: hostname,
      max_sent_data: maxSentData,
      max_recv_data: maxRecvData,
      max_recv_data_online: maxRecvDataOnline,
      defer_decryption_from_start: deferDecryptionFromStart,
    });

    await prover.setup(await notary.sessionUrl(maxSentData, maxRecvData));

    const headerMap = Prover.getHeaderMap(url, body, headers);

    await prover.send_request(websocketProxyUrl + `?token=${hostname}`, {
      uri: url,
      method,
      headers: headerMap,
      body,
    });

    const transcript = prover.transcript();

    const commit = _commit || {
      sent: [{ start: 0, end: transcript.sent.length }],
      recv: [{ start: 0, end: transcript.recv.length }],
    };

    const { attestation, secrets } = await prover.notarize(commit);

    const presentation = build_presentation(attestation, secrets, commit);

    return arrayToHex(presentation.serialize());
  }

  constructor(config: {
    serverDns: string;
    maxSentData?: number;
    maxRecvData?: number;
    maxRecvDataOnline?: number;
    deferDecryptionFromStart?: boolean;
  }) {
    this.#config = {
      server_name: config.serverDns,
      max_recv_data: config.maxRecvData || 1024,
      max_sent_data: config.maxSentData || 1024,
      max_recv_data_online: config.maxRecvDataOnline,
      defer_decryption_from_start: config.deferDecryptionFromStart,
    };
    this.#prover = new WasmProver(this.#config);
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

  static getHeaderMap(
    url: string,
    body?: any,
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
      body?: any;
    },
  ): Promise<{
    status: number;
    headers: { [key: string]: string };
  }> {
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

  async notarize(
    commit?: Commit,
  ): Promise<{ attestation: string; secrets: string }> {
    const transcript = await this.transcript();
    const output = await this.#prover.notarize(
      commit || {
        sent: [{ start: 0, end: transcript.sent.length }],
        recv: [{ start: 0, end: transcript.recv.length }],
      },
    );
    return {
      attestation: arrayToHex(output.attestation.serialize()),
      secrets: arrayToHex(output.secrets.serialize()),
    };
  }

  async reveal(reveal: Reveal) {
    return this.#prover.reveal(reveal);
  }
}

export class Verifier {
  #config: VerifierConfig;
  #verifier: WasmVerifier;

  constructor(config: { maxSentData?: number; maxRecvData?: number }) {
    this.#config = {
      max_recv_data: config.maxRecvData || 1024,
      max_sent_data: config.maxSentData || 1024,
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

export class Presentation {
  #presentation: WasmPresentation;

  constructor(
    params:
      | {
          attestationHex: string;
          secretsHex: string;
          reveal?: Reveal;
        }
      | string,
  ) {
    if (typeof params === 'string') {
      this.#presentation = WasmPresentation.deserialize(hexToArray(params));
    } else {
      const attestation = WasmAttestation.deserialize(
        hexToArray(params.attestationHex),
      );
      const secrets = WasmSecrets.deserialize(hexToArray(params.secretsHex));
      const transcript = secrets.transcript();
      this.#presentation = build_presentation(
        attestation,
        secrets,
        params.reveal || {
          sent: [{ start: 0, end: transcript.sent.length }],
          recv: [{ start: 0, end: transcript.recv.length }],
        },
      );
    }
  }

  async free() {
    return this.#presentation.free();
  }

  async serialize() {
    return arrayToHex(this.#presentation.serialize());
  }

  async verifyingKey() {
    return this.#presentation.verifying_key();
  }

  async verify(): Promise<VerifierOutput> {
    const {
      server_name = '',
      connection_info,
      transcript = {
        sent: [],
        recv: [],
        recv_authed: [],
        sent_authed: [],
      },
    } = this.#presentation.verify();

    return {
      server_name: server_name,
      connection_info,
      transcript,
    };
  }
}

export class Attestation {
  #attestation: WasmAttestation;

  constructor(attestationHex: string) {
    this.#attestation = WasmAttestation.deserialize(hexToArray(attestationHex));
  }

  async free() {
    return this.#attestation.free();
  }

  async verifyingKey() {
    return this.#attestation.verifying_key();
  }

  async serialize() {
    return this.#attestation.serialize();
  }
}

export class Secrets {
  #secrets: WasmSecrets;

  constructor(secretsHex: string) {
    this.#secrets = WasmSecrets.deserialize(hexToArray(secretsHex));
  }

  async free() {
    return this.#secrets.free();
  }

  async serialize() {
    return this.#secrets.serialize();
  }

  async transcript() {
    return this.#secrets.transcript();
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

export class Transcript {
  #sent: number[];
  #recv: number[];

  constructor(params: { sent: number[]; recv: number[] }) {
    this.#recv = params.recv;
    this.#sent = params.sent;
  }

  static processRanges(text: string) {
    return processTranscript(text);
  }

  recv(redactedSymbol = '*') {
    return this.#recv.reduce((recv: string, num) => {
      recv =
        recv + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
      return recv;
    }, '');
  }

  sent(redactedSymbol = '*') {
    return this.#sent.reduce((sent: string, num) => {
      sent =
        sent + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
      return sent;
    }, '');
  }

  text = (redactedSymbol = '*') => {
    return {
      sent: this.sent(redactedSymbol),
      recv: this.recv(redactedSymbol),
    };
  };
}

export {
  type ParsedTranscriptData,
  type LoggingLevel,
  type LoggingConfig,
  type Commit,
  type Reveal,
  type ProverConfig,
  type VerifierConfig,
  type VerifyingKey,
  type VerifierOutput,
  type ConnectionInfo,
  type PartialTranscript,
};
