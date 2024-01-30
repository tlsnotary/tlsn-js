import TLSN from './tlsn';
import { Proof } from './types';

let _tlsn: TLSN;

async function getTLSN(): Promise<TLSN> {
  if (_tlsn) return _tlsn;
  // @ts-ignore
  _tlsn = await new TLSN();
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
  publicKeyOverride?: string,
): Promise<{
  time: number;
  sent: string;
  recv: string;
  notaryUrl: string;
}> => {
  const publicKey =
    publicKeyOverride || (await fetchPublicKeyFromNotary(proof.notaryUrl));
  const tlsn = await getTLSN();
  const result = await tlsn.verify(proof, publicKey);
  return {
    ...result,
    notaryUrl: proof.notaryUrl,
  };
};

async function fetchPublicKeyFromNotary(notaryUrl: string) {
  const res = await fetch(notaryUrl + '/info');
  const json: any = await res.json();
  if (!json.publicKey) throw new Error('invalid response');
  return json.publicKey;
}
