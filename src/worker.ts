import * as Comlink from 'comlink';
import init, {
  initThreadPool,
  prover,
  verify,
} from '../wasm/prover/pkg/tlsn_extension_rs';
import {Proof} from "./types";

export class TLSN {
  private startPromise: any;
  private resolveStart: any;

  constructor() {
    this.startPromise = new Promise((resolve) => {
      this.resolveStart = resolve;
    });
    this.start();
  }

  async start() {
    const numConcurrency = navigator.hardwareConcurrency;
    const res = await init();
    await initThreadPool(numConcurrency);
    this.resolveStart();
  }

  async waitForStart() {
    return this.startPromise;
  }

  async prover(
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
  ): Promise<Proof> {
    await this.waitForStart();

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

    return JSON.parse(resProver);
  }

  async verify(proof: Proof, pubkey: string) {
    await this.waitForStart();
    const raw = await verify(JSON.stringify(proof), pubkey);
    return JSON.parse(raw);
  }
}

Comlink.expose(TLSN);
