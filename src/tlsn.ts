import init, {
  initThreadPool,
  prover,
  verify,
  set_log_level_filter
} from '../wasm/prover/pkg/tlsn_extension_rs';

export default class TLSN {
  private startPromise: any;
  private resolveStart: any;

  constructor() {
    this.startPromise = new Promise((resolve) => {
      this.resolveStart = resolve;
    });
    this.start();
  }

  async start() {
    // console.log('start');
    const numConcurrency = navigator.hardwareConcurrency;
    // console.log('!@# navigator.hardwareConcurrency=', numConcurrency);
    await init();
    // const res = await init();
    // console.log('!@# res.memory=', res.memory);
    // 6422528 ~= 6.12 mb
    // console.log('!@# res.memory.buffer.length=', res.memory.buffer.byteLength);
    await initThreadPool(numConcurrency);
    this.resolveStart();

    await set_log_level_filter("trace");
  }

  async waitForStart() {
    return this.startPromise;
  }

  async set_log_level_filter(level: string) {
    await set_log_level_filter(level);
  }

  async prove(
    url: string,
    options?: {
      method?: string;
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
    // console.log('worker', url, {
    //   ...options,
    //   notaryUrl: options?.notaryUrl,
    //   websocketProxyUrl: options?.websocketProxyUrl,
    // });
    const resProver = await prover(
      url,
      {
        ...options,
        notaryUrl: options?.notaryUrl,
        websocketProxyUrl: options?.websocketProxyUrl,
      },
      options?.secretHeaders || [],
      options?.secretResps || [],
    );
    const resJSON = JSON.parse(resProver);
    // console.log('!@# resProver,resJSON=', { resProver, resJSON });
    // console.log('!@# resAfter.memory=', resJSON.memory);
    // 1105920000 ~= 1.03 gb
    // console.log(
    //   '!@# resAfter.memory.buffer.length=',
    //   resJSON.memory?.buffer?.byteLength,
    // );

    return resJSON;
  }

  async verify(proof: any, pubkey: string) {
    await this.waitForStart();
    const raw = await verify(JSON.stringify(proof), pubkey);
    return JSON.parse(raw);
  }
}
