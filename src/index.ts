import * as Comlink from 'comlink';
import type TLSN from './worker';
import { Proof } from './types';

const T = Comlink.wrap<TLSN>(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

let _tlsn: Comlink.Remote<TLSN>;

async function getTLSN(): Promise<Comlink.Remote<TLSN>> {
  if (_tlsn) return _tlsn;
  // @ts-ignore
  _tlsn = await new T();
  return _tlsn;
}

export const prove = async (
  url: string,
  options: {
    notaryUrl: string;
    websocketProxyUrl: string;
    method?: string;
    headers?: { [key: string]: string };
    body?: string;
    maxTranscriptSize?: number;
    secretHeaders?: string[];
    secretResps?: string[];
  },
): Promise<Proof> => {
  const {
    method,
    headers = {},
    body = '',
    maxTranscriptSize = 16384,
    notaryUrl,
    websocketProxyUrl,
    secretHeaders,
    secretResps,
  } = options;

  const tlsn = await getTLSN();

  headers['Host'] = new URL(url).host;
  headers['Connection'] = 'close';

  const proof = await tlsn.prove(url, {
    method,
    headers,
    body,
    maxTranscriptSize,
    notaryUrl,
    websocketProxyUrl,
    secretHeaders,
    secretResps,
  });

  return {
    ...proof,
    notaryUrl,
  };
};

export const verify = async (
  proof: Proof,
): Promise<{
  time: number;
  sent: string;
  recv: string;
  notaryUrl: string;
}> => {
  const res = await fetch(proof.notaryUrl + '/info');
  const json: any = await res.json();
  const publicKey = json.publicKey as string;
  const tlsn = await getTLSN();
  const result = await tlsn.verify(proof, publicKey);
  return {
    ...result,
    notaryUrl: proof.notaryUrl,
  };
};
