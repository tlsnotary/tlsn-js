export interface Proof {
  session: Session
  substrings: Substrings
}

export interface Session {
  header: Header
  server_name: ServerName
  signature: Signature
  handshake_data_decommitment: HandshakeDataDecommitment
}

export interface Header {
  encoder_seed: number[]
  merkle_root: number[]
  sent_len: number
  recv_len: number
  handshake_summary: HandshakeSummary
}

export interface HandshakeSummary {
  time: number
  server_public_key: ServerPublicKey
  handshake_commitment: number[]
}

export interface ServerPublicKey {
  group: string
  key: number[]
}

export interface ServerName {
  Dns: string
}

export interface Signature {
  P256: string
}

export interface HandshakeDataDecommitment {
  nonce: number[]
  data: Data
}

export interface Data {
  server_cert_details: ServerCertDetails
  server_kx_details: ServerKxDetails
  client_random: number[]
  server_random: number[]
}

export interface ServerCertDetails {
  cert_chain: number[][]
  ocsp_response: any[]
  scts: any
}

export interface ServerKxDetails {
  kx_params: number[]
  kx_sig: KxSig
}

export interface KxSig {
  scheme: string
  sig: number[]
}

export interface Substrings {
  openings: Openings
  inclusion_proof: InclusionProof
}

export interface Openings {
  "0": N0[]
  "1": N1[]
  "2": N2[]
  "3": N3[]
  "4": N4[]
  "5": N5[]
  "6": N6[]
  "7": N7[]
  "8": N8[]
  "9": N9[]
  "10": N10[]
  "11": N11[]
  "12": N12[]
  "13": N13[]
  "14": N14[]
  "15": N15[]
  "16": N16[]
  "17": N17[]
  "35": N35[]
}

export interface N0 {
  kind?: string
  ranges?: Range[]
  direction?: string
  Blake3?: Blake3
}

export interface Range {
  start: number
  end: number
}

export interface Blake3 {
  data: number[]
  nonce: number[]
}

export interface N1 {
  kind?: string
  ranges?: Range2[]
  direction?: string
  Blake3?: Blake32
}

export interface Range2 {
  start: number
  end: number
}

export interface Blake32 {
  data: number[]
  nonce: number[]
}

export interface N2 {
  kind?: string
  ranges?: Range3[]
  direction?: string
  Blake3?: Blake33
}

export interface Range3 {
  start: number
  end: number
}

export interface Blake33 {
  data: number[]
  nonce: number[]
}

export interface N3 {
  kind?: string
  ranges?: Range4[]
  direction?: string
  Blake3?: Blake34
}

export interface Range4 {
  start: number
  end: number
}

export interface Blake34 {
  data: number[]
  nonce: number[]
}

export interface N4 {
  kind?: string
  ranges?: Range5[]
  direction?: string
  Blake3?: Blake35
}

export interface Range5 {
  start: number
  end: number
}

export interface Blake35 {
  data: number[]
  nonce: number[]
}

export interface N5 {
  kind?: string
  ranges?: Range6[]
  direction?: string
  Blake3?: Blake36
}

export interface Range6 {
  start: number
  end: number
}

export interface Blake36 {
  data: number[]
  nonce: number[]
}

export interface N6 {
  kind?: string
  ranges?: Range7[]
  direction?: string
  Blake3?: Blake37
}

export interface Range7 {
  start: number
  end: number
}

export interface Blake37 {
  data: number[]
  nonce: number[]
}

export interface N7 {
  kind?: string
  ranges?: Range8[]
  direction?: string
  Blake3?: Blake38
}

export interface Range8 {
  start: number
  end: number
}

export interface Blake38 {
  data: number[]
  nonce: number[]
}

export interface N8 {
  kind?: string
  ranges?: Range9[]
  direction?: string
  Blake3?: Blake39
}

export interface Range9 {
  start: number
  end: number
}

export interface Blake39 {
  data: number[]
  nonce: number[]
}

export interface N9 {
  kind?: string
  ranges?: Range10[]
  direction?: string
  Blake3?: Blake310
}

export interface Range10 {
  start: number
  end: number
}

export interface Blake310 {
  data: number[]
  nonce: number[]
}

export interface N10 {
  kind?: string
  ranges?: Range11[]
  direction?: string
  Blake3?: Blake311
}

export interface Range11 {
  start: number
  end: number
}

export interface Blake311 {
  data: number[]
  nonce: number[]
}

export interface N11 {
  kind?: string
  ranges?: Range12[]
  direction?: string
  Blake3?: Blake312
}

export interface Range12 {
  start: number
  end: number
}

export interface Blake312 {
  data: number[]
  nonce: number[]
}

export interface N12 {
  kind?: string
  ranges?: Range13[]
  direction?: string
  Blake3?: Blake313
}

export interface Range13 {
  start: number
  end: number
}

export interface Blake313 {
  data: number[]
  nonce: number[]
}

export interface N13 {
  kind?: string
  ranges?: Range14[]
  direction?: string
  Blake3?: Blake314
}

export interface Range14 {
  start: number
  end: number
}

export interface Blake314 {
  data: number[]
  nonce: number[]
}

export interface N14 {
  kind?: string
  ranges?: Range15[]
  direction?: string
  Blake3?: Blake315
}

export interface Range15 {
  start: number
  end: number
}

export interface Blake315 {
  data: number[]
  nonce: number[]
}

export interface N15 {
  kind?: string
  ranges?: Range16[]
  direction?: string
  Blake3?: Blake316
}

export interface Range16 {
  start: number
  end: number
}

export interface Blake316 {
  data: number[]
  nonce: number[]
}

export interface N16 {
  kind?: string
  ranges?: Range17[]
  direction?: string
  Blake3?: Blake317
}

export interface Range17 {
  start: number
  end: number
}

export interface Blake317 {
  data: number[]
  nonce: number[]
}

export interface N17 {
  kind?: string
  ranges?: Range18[]
  direction?: string
  Blake3?: Blake318
}

export interface Range18 {
  start: number
  end: number
}

export interface Blake318 {
  data: number[]
  nonce: number[]
}

export interface N35 {
  kind?: string
  ranges?: Range19[]
  direction?: string
  Blake3?: Blake319
}

export interface Range19 {
  start: number
  end: number
}

export interface Blake319 {
  data: number[]
  nonce: number[]
}

export interface InclusionProof {
  proof: number[]
  total_leaves: number
}
