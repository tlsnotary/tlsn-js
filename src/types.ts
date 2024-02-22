export interface Proof {
  session: Session;
  substrings: Substrings;
  notaryUrl: string;
}

export interface Session {
  header: Header;
  signature: Signature;
  session_info: SessionInfo;
}

export interface SessionInfo {
  server_name: ServerName;
  handshake_decommitment: HandshakeDecommitment;
}

export interface HandshakeDecommitment {
  nonce: number[];
  data: Data;
}

export interface Data {
  server_cert_details: ServerCERTDetails;
  server_kx_details: ServerKxDetails;
  client_random: number[];
  server_random: number[];
}

export interface ServerCERTDetails {
  cert_chain: Array<number[]>;
  ocsp_response: number[];
  scts: null;
}

export interface ServerKxDetails {
  kx_params: number[];
  kx_sig: KxSig;
}

export interface KxSig {
  scheme: string;
  sig: number[];
}

export interface Header {
  encoder_seed: number[];
  merkle_root: number[];
  sent_len: number;
  recv_len: number;
  handshake_summary: HandshakeSummary;
}

export interface HandshakeSummary {
  time: number;
  server_public_key: ServerPublicKey;
  handshake_commitment: number[];
}

export interface ServerPublicKey {
  group: string;
  key: number[];
}

export interface ServerName {
  Dns: string;
}

export interface Signature {
  P256: string;
}

export interface Substrings {
  openings: { [key: string]: Opening[] };
  inclusion_proof: InclusionProof;
}

export interface InclusionProof {
  proof: any[];
  total_leaves: number;
}

export interface Opening {
  kind?: string;
  ranges?: Range[];
  direction?: string;
  Blake3?: Blake3;
}

export interface Blake3 {
  data: number[];
  nonce: number[];
}

export interface Range {
  start: number;
  end: number;
}
