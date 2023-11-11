import * as Comlink from 'comlink';

const TLSN: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

let _tlsn: any | null = null;

async function getTLSN(): Promise<any | null> {
  if (_tlsn) return _tlsn;
  _tlsn = await new TLSN();
  return _tlsn;
}

export const prove = async (
  options: {
    url: string,
    method?: string;
    headers?: { [key: string]: string };
    body?: string;
    maxTranscriptSize?: number;
    notaryUrl: string;
    websocketProxyUrl: string;
    secretHeaders?: string[];
    secretResps?: string[];
  },
) => {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    secretHeaders = [],
    secretResps = [],
    maxTranscriptSize = 20000,
    notaryUrl,
    websocketProxyUrl,
  } = options;

  const tlsn = await getTLSN();

  const proof = await tlsn.prover(url, {
    method,
    headers,
    body,
    maxTranscriptSize,
    notaryUrl,
    websocketProxyUrl,
    secretHeaders,
    secretResps,
  });

  return JSON.parse(proof);
}