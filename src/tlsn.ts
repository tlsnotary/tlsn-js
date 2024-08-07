import init, {
  initThreadPool,
  init_logging,
  Prover,
  Method,
  LoggingLevel,
  Transcript,
  Commit,
  NotarizedSession,
} from '../wasm/pkg/tlsn_wasm';
import { processTranscript, stringToBuffer } from './utils';

export default class TLSN {
  private startPromise: Promise<void>;

  private resolveStart!: () => void;

  private loggingLevel: LoggingLevel;

  private sessions: Map<string, Prover> = new Map();

  /**
   * Initializes a new instance of the TLSN class.
   *
   * @param config.loggingLevel - Optional logging filter string.
   *                              Defaults to 'Info'
   */
  constructor(config: { loggingLevel?: LoggingLevel }) {
    this.loggingLevel = config?.loggingLevel || 'Info';

    this.startPromise = new Promise((resolve) => {
      this.resolveStart = resolve;
    });
    this.start();
  }

  private debug(...args: any[]) {
    switch (this.loggingLevel) {
      case 'Error':
        break;
      case 'Info':
        break;
      case 'Warn':
        break;
      case 'Debug':
      case 'Trace':
        console.log('tlsn-js DEBUG', ...args);
        break;
    }
  }

  async start() {
    const numConcurrency = navigator.hardwareConcurrency;

    this.debug('navigator.hardwareConcurrency=', numConcurrency);

    const res = await init();

    init_logging({
      level: this.loggingLevel,
      crate_filters: undefined,
      span_events: undefined,
    });

    // 6422528 ~= 6.12 mb
    this.debug('res.memory=', res.memory);
    this.debug('res.memory.buffer.length=', res.memory.buffer.byteLength);
    this.debug('initialize thread pool');
    await initThreadPool(numConcurrency);
    this.debug('initialized thread pool');

    this.resolveStart();
  }

  async waitForStart() {
    return this.startPromise;
  }

  private async getNotarySessionKey(
    notaryUrl: string,
    maxRecvData?: number,
    maxSentData?: number,
  ): Promise<string> {
    const resp = await fetch(`${notaryUrl}/session`, {
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
    return sessionId!;
  }

  async getNotaryPublicKey(notaryUrl: string) {
    const res = await fetch(notaryUrl + '/info');
    const { publicKey } = await res.json();
    return publicKey!;
  }

  async sendNotaryRequest(
    requestConfig: {
      url: string;
      method?: Method;
      headers?: { [key: string]: string };
      body?: any;
    },
    proverConfig: {
      notaryUrl: string;
      proxyUrl: string;
      id?: string;
      maxSentData?: number;
      maxRecvData?: number;
    },
  ) {
    await this.waitForStart();

    const { url, headers = {}, method = 'GET', body } = requestConfig;
    const {
      id = String(Date.now()),
      maxSentData,
      maxRecvData,
      notaryUrl,
      proxyUrl,
    } = proverConfig;

    const session = await this.getNotarySessionKey(
      notaryUrl,
      maxRecvData,
      maxSentData,
    );
    const notarySessionUrl = `${notaryUrl}/notarize?sessionId=${session}`;
    const hostname = new URL(url).hostname;

    const prover = new Prover({
      id,
      server_dns: hostname,
      max_recv_data: maxRecvData,
      max_sent_data: maxSentData,
    });

    await prover.setup(notarySessionUrl);

    this.sessions.set(id, prover);

    const headerMap: Map<string, number[]> = new Map();

    headerMap.set('Host', stringToBuffer(hostname));
    headerMap.set('Connection', stringToBuffer('close'));
    Object.entries(headers).forEach(([key, value]) => {
      headerMap.set(key, stringToBuffer(value));
    });

    await prover.send_request(proxyUrl, {
      uri: url,
      method: method,
      headers: headerMap,
      body,
    });

    const transcript = prover.transcript();

    const recv = Buffer.from(transcript.recv).toString();
    const sent = Buffer.from(transcript.sent).toString();

    // console.log(
    //   recvCommits.map(({ value, start, end }) => {
    //     return [name || path, recv.slice(start, end), start, end];
    //   }),
    // );
    //
    // console.log(
    //   sentCommits.map(({ name, path, start, end }) => {
    //     return [name || path, sent.slice(start, end), start, end];
    //   }),
    // );

    return {
      id,
      transcript: { recv, sent },
      ranges: {
        recv: processTranscript(recv),
        sent: processTranscript(sent),
      },
    };
  }

  // async verify(
  //   proof: any,
  //   pubkey: string,
  //   config?: {
  //     maxSentData?: number;
  //     maxRecvData?: number;
  //   },
  // ) {
  //   // await this.waitForStart();
  //   // const verifier = new Verifier({
  //   //   id: 'test',
  //   //   max_received_data: config?.maxRecvData || undefined,
  //   //   max_sent_data: config?.maxSentData || undefined,
  //   // });
  //   // const raw = await verify(JSON.stringify(proof), pubkey);
  //   // return JSON.parse(raw);
  // }
}

// class NotaryProver {
//   #prover: Prover;
//   #transcript: Transcript;
//
//   constructor(prover: Prover) {
//     this.#prover = prover;
//     this.#transcript = prover.transcript();
//   }
//
//   get transcript() {
//     return this.#transcript;
//   }
//
//   #calculateCommitments(): Commit {
//     const recv = Buffer.from(this.transcript.recv).toString();
//     const sent = Buffer.from(this.transcript.sent).toString();
//     const recvCommits = processTranscript(recv);
//     const sentCommits = processTranscript(sent);
//
//     console.log(
//       recvCommits.map(({ name, path, start, end }) => {
//         return [name || path, recv.slice(start, end), start, end];
//       }),
//     );
//
//     console.log(
//       sentCommits.map(({ name, path, start, end }) => {
//         return [name || path, sent.slice(start, end), start, end];
//       }),
//     );
//
//     return {
//       sent: [{ start: 0, end: this.transcript.sent.length }, ...sentCommits],
//       recv: [{ start: 0, end: this.transcript.recv.length }, ...recvCommits],
//     };
//   }
//
//   async notarize(commit?: Commit): Promise<NotarizedSession> {
//     const session = await this.#prover.notarize(
//       commit || this.#calculateCommitments(),
//     );
//
//     return session;
//     // const proof = resp.proof({
//     //   sent: [{ start: 0, end: this.transcript.sent.length }],
//     //   recv: [{ start: 0, end: this.transcript.recv.length }],
//     // });
//     //
//     // return {
//     //   version: '0.1.0-alpha.6',
//     //   meta: {
//     //     notaryUrl: notaryUrl,
//     //     proxyUrl: proxyUrl,
//     //   },
//     //   proof: Buffer.from(proof.serialize()).toString('hex'),
//     // };
//   }
// }
