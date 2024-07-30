import init, {
  initThreadPool,
  init_logging,
  Prover,
  Method,
} from '../wasm/pkg/tlsn_wasm';

const json = `{"name":"Luke Skywalker","height":"172","mass":"77","hair_color":"blond","skin_color":"fair","eye_color":"blue","birth_year":"19BBY","gender":"male","homeworld":"https://swapi.dev/api/planets/1/","films":["https://swapi.dev/api/films/1/","https://swapi.dev/api/films/2/","https://swapi.dev/api/films/3/","https://swapi.dev/api/films/6/"],"species":[],"vehicles":["https://swapi.dev/api/vehicles/14/","https://swapi.dev/api/vehicles/30/"],"starships":["https://swapi.dev/api/starships/12/","https://swapi.dev/api/starships/22/"],"created":"2014-12-09T13:50:51.644000Z","edited":"2014-12-20T21:17:56.891000Z","url":"https://swapi.dev/api/people/1/"}`;

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
    // await this.waitForStart();
    //
    // const prover = new Prover({
    //   id: 'test',
    //   server_dns: new URL(url).hostname || '',
    //   max_recv_data: options?.maxRecvData,
    //   max_sent_data: options?.maxSentData,
    // });
    // console.log('worker', url, {
    //   ...options,
    //   notaryUrl: options?.notaryUrl,
    //   websocketProxyUrl: options?.websocketProxyUrl,
    // });
    // await prover.setup(options!.notaryUrl!);
    // console.log(Buffer.from('swapi.dev').toJSON().data);
    // await prover.send_request(options!.websocketProxyUrl!, {
    //   uri: url,
    //   method: options?.method || 'GET',
    //   // @ts-ignore
    //   headers: new Map([
    //     ['Host', Buffer.from('swapi.dev').toJSON().data],
    //     ['Content-Type', Buffer.from('application/json').toJSON().data],
    //   ]),
    //   // [['Host', Buffer.from('swapi.dev').values()]]
    //   body: undefined,
    // });
    //
    // const transcript = prover.transcript();
    // console.log({ transcript });
    // console.log(Buffer.from(transcript.recv).toString());
    // console.log(Buffer.from(transcript.sent).toString());
    //
    // const recv = Buffer.from(transcript.recv).toString();
    //
    // const commitments: [string, number, number][] = [];
    // const ret: any = {};
    // let text = '',
    //   ptr = -1;
    // for (let i = 0; i < recv.length; i++) {
    //   const char = recv.charAt(i);
    //
    //   if (char === '\r') {
    //     if (!text) continue;
    //     if (!isNaN(Number(text))) continue;
    //
    //     try {
    //       const json = JSON.parse(text);
    //       console.log({ json });
    //     } catch (e) {
    //       commitments.push([text, ptr, i]);
    //     }
    //     continue;
    //   }
    //
    //   if (char === '\n') {
    //     text = '';
    //     ptr = -1;
    //     continue;
    //   }
    //
    //   if (ptr === -1) {
    //     ptr = i;
    //   }
    //
    //   text = text + char;
    // }
    //
    // console.log(
    //   commitments.map((data) => {
    //     return [...data, recv.slice(data[1], data[2])];
    //   }),
    //   ret,
    // );

    let ptr = -1,
      data = '',
      isExpectingKey = false,
      isParsingKey = false,
      isExpectingValue = false,
      isParsingValue = false;
    const stack = [];
    const keys = [];
    const values: any = {};
    console.log(json);
    for (let i = 0; i < json.length; i++) {
      const char = json.charAt(i);
      const lastStack = stack[stack.length - 1];

      console.log(char);
      if (lastStack === '{') {
        expect(
          char === '"' || char === ':' || char === ',' || char === '}',
          `unexpected ${char}`,
        );
      }

      if (lastStack === ':') {
        expect(
          char === '"' || char === '[' || /^\d$/.test(char) || char === '{',
          `unexpected ${char}`,
        );
        stack.pop();
      }

      if (lastStack === '"') {
        if (char === '"') {
          stack.pop();
          continue;
        }
        data = data + char;
        continue;
      }

      if (lastStack === '[') {
        if (char === ']') {
          stack.pop();
          continue;
        }
      }

      if (char === '[') {
        stack.push(char);
        continue;
      }

      if (char === '{') {
        stack.push(char);
        continue;
      }

      if (char === '"') {
        if (ptr === -1) ptr = i;
        stack.push(char);
        continue;
      }

      if (char === ':') {
        stack.push(char);
        keys.push(data);
        data = '';
        continue;
      }

      if (char === '}' || (char === ',' && lastStack !== '[')) {
        values[keys.join('.')] = [data, ptr, i];
        keys.pop();
        data = '';
        ptr = -1;
        continue;
      }
    }

    console.log(keys, data);
    console.log(values);
    console.log(
      Object.values(values).map((val: any) => json.slice(val[1], val[2])),
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
