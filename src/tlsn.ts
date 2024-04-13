import init, {
  initThreadPool,
  prover,
  interactive_prover,
  verify,
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
  }

  async waitForStart() {
    return this.startPromise;
  }

  async prove(
    url: string,
    options?: {
      method?: string;
      headers?: { [key: string]: string };
      body?: string;
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

    const sessionId = await getSessionId(options!.notaryUrl!);
    const resProver = await prover(
      url,
      {
        ...options,
        notaryUrl: options?.notaryUrl + `/notarize?sessionId=${sessionId}`,
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

  async interactive_prove(
    websocket_proxy_url: string,
    verifier_proxy_url: string,
    uri: string,
    id: string,
  ) {
    await this.waitForStart();
    const resProver = await interactive_prover(
      websocket_proxy_url,
      verifier_proxy_url,
      uri,
      id,
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

async function getSessionId(notaryUrl: string) {
  const resp = await fetch(notaryUrl + '/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientType: 'Websocket',
    }),
  });
  const json = await resp.json();
  return json.session_id;
}
