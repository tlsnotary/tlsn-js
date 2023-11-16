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

export const NOTARY_SERVER_PUBKEY = `-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBv36FI4ZFszJa0DQFJ3wWCXvVLFr\ncRzMG5kaTeHGoSzDu6cFqx3uEWYpFGo6C0EOUgf+mEgbktLrXocv5yHzKg==\n-----END PUBLIC KEY-----`;

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
) => {
  const {
    method,
    headers,
    body,
    maxTranscriptSize = 32768,
    notaryUrl,
    websocketProxyUrl,
    secretHeaders,
    secretResps,
  } = options;

  const tlsn = await getTLSN();
  return tlsn.prover(url, {
    method,
    headers,
    body,
    maxTranscriptSize,
    notaryUrl,
    websocketProxyUrl,
    secretHeaders,
    secretResps,
  });
};

export const verify = async (
  proof: { session: any; substrings: any },
  pubkey = NOTARY_SERVER_PUBKEY,
) => {
  const tlsn = await getTLSN();
  const result = await tlsn.verify(proof, pubkey);
  return result;
};
