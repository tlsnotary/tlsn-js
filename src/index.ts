import TLSN from "./worker";

const tlsn = new TLSN();

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
  const result = await tlsn.verify(proof, pubkey);
  return result;
};
