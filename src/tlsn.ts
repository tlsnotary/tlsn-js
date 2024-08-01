import init, {
  initThreadPool,
  init_logging,
  Prover,
  Method,
} from '../wasm/pkg/tlsn_wasm';
import { processTranscript } from './utils';

export const DEFAULT_LOGGING_FILTER: string = 'info,tlsn_extension_rs=debug';

export default class TLSN {
  private startPromise: Promise<void>;
  private resolveStart!: () => void;
  private logging_filter: string;

  /**
   * Initializes a new instance of the TLSN class.
   *
   * @param logging_filter - Optional logging filter string.
   *                         Defaults to DEFAULT_LOGGING_FILTER
   */
  constructor(logging_filter: string = DEFAULT_LOGGING_FILTER) {
    this.logging_filter = logging_filter;

    this.startPromise = new Promise((resolve) => {
      this.resolveStart = resolve;
    });
    this.start();
  }

  async start() {
    console.log('start');
    const numConcurrency = navigator.hardwareConcurrency;
    console.log('!@# navigator.hardwareConcurrency=', numConcurrency);
    const res = await init();
    // await init();
    init_logging();

    console.log('!@# res.memory=', res.memory);
    // 6422528 ~= 6.12 mb
    console.log('!@# res.memory.buffer.length=', res.memory.buffer.byteLength);
    await initThreadPool(numConcurrency);
    console.log('init thread pool');
    this.resolveStart();
  }

  async waitForStart() {
    return this.startPromise;
  }

  async prove(
    url: string,
    options?: {
      method?: Method;
      headers?: { [key: string]: string };
      body?: string;
      maxSentData?: number;
      maxRecvData?: number;
      maxTranscriptSize?: number;
      notaryUrl?: string;
      websocketProxyUrl?: string;
      secretHeaders?: string[];
      secretResps?: string[];
    },
  ) {
    await this.waitForStart();

    const prover = new Prover({
      id: 'test',
      server_dns: new URL(url).hostname || '',
      max_recv_data: options?.maxRecvData,
      max_sent_data: options?.maxSentData,
    });

    await prover.setup(options!.notaryUrl!);
    await prover.send_request(options!.websocketProxyUrl!, {
      uri: url,
      method: options?.method || 'GET',
      // @ts-ignore
      headers: new Map([
        ['Host', Buffer.from('swapi.dev').toJSON().data],
        ['Content-Type', Buffer.from('application/json').toJSON().data],
      ]),
      body: { a: 'apple', b: 'boy' },
    });

    const transcript = prover.transcript();

    const recv = Buffer.from(transcript.recv).toString();
    const sent = Buffer.from(transcript.sent).toString();
    console.log('recv: ', recv);
    console.log('sent: ', sent);

    const recvCommits = processTranscript(recv);
    const sentCommits = processTranscript(sent);

    console.log(
      recvCommits.map(({ name, path, start, end }) => {
        return [name || path, recv.slice(start, end), start, end];
      }),
    );

    console.log(
      sentCommits.map(({ name, path, start, end }) => {
        return [name || path, sent.slice(start, end), start, end];
      }),
    );

    // const commit = {
    //   sent: [{ start: 0, end: transcript.sent.length }],
    //   recv: [{ start: 0, end: transcript.recv.length - 70 }],
    // };
    // const resp = await prover.notarize(commit);
    // const proof = await resp.proof({
    //   sent: [{ start: 0, end: transcript.sent.length }],
    //   recv: [{ start: 0, end: transcript.recv.length - 70 }],
    // });
    // console.log(proof);

    // const resProver = await prover(
    //   url,
    //   {
    //     ...options,
    //     notaryUrl: options?.notaryUrl,
    //     websocketProxyUrl: options?.websocketProxyUrl,
    //   },
    //   options?.secretHeaders || [],
    //   options?.secretResps || [],
    // );
    // const resJSON = JSON.parse(resProver);
    // console.log('!@# resProver,resJSON=', { resProver, resJSON });
    // console.log('!@# resAfter.memory=', resJSON.memory);
    // 1105920000 ~= 1.03 gb
    // console.log(
    //   '!@# resAfter.memory.buffer.length=',
    //   resJSON.memory?.buffer?.byteLength,
    // );

    // return resp;
  }

  async verify(proof: any, pubkey: string) {
    // await this.waitForStart();
    // const raw = await verify(JSON.stringify(proof), pubkey);
    // return JSON.parse(raw);
  }
}

function expect(cond: any, msg = 'invalid assertion') {
  if (!cond) throw Error(msg);
}
