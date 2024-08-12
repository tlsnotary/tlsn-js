/* tslint:disable */
/* eslint-disable */
/**
* Initializes logging.
* @param {LoggingConfig | undefined} [config]
*/
export function init_logging(config?: LoggingConfig): void;
/**
* @param {number} num_threads
* @returns {Promise<any>}
*/
export function initThreadPool(num_threads: number): Promise<any>;
/**
* @param {number} receiver
*/
export function wbg_rayon_start_worker(receiver: number): void;
export type Body = JsonValue;

export type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface HttpRequest {
    uri: string;
    method: Method;
    headers: Map<string, number[]>;
    body: Body | undefined;
}

export interface HttpResponse {
    status: number;
    headers: [string, number[]][];
}

export interface Transcript {
    sent: number[];
    recv: number[];
}

export interface Commit {
    sent: { start: number; end: number }[];
    recv: { start: number; end: number }[];
}

export interface Reveal {
    sent: { start: number; end: number }[];
    recv: { start: number; end: number }[];
}

export type KeyType = "P256";

export interface NotaryPublicKey {
    typ: KeyType;
    key: string;
}

export interface ProofData {
    time: number;
    server_dns: string;
    sent: number[];
    sent_auth_ranges: { start: number; end: number }[];
    received: number[];
    received_auth_ranges: { start: number; end: number }[];
}

export interface VerifierData {
    server_dns: string;
    sent: number[];
    sent_auth_ranges: { start: number; end: number }[];
    received: number[];
    received_auth_ranges: { start: number; end: number }[];
}

export interface CrateLogFilter {
    level: LoggingLevel;
    name: string;
}

export interface LoggingConfig {
    level: LoggingLevel | undefined;
    crate_filters: CrateLogFilter[] | undefined;
    span_events: SpanEvent[] | undefined;
}

export type SpanEvent = "New" | "Close" | "Active";

export type LoggingLevel = "Trace" | "Debug" | "Info" | "Warn" | "Error";

export interface VerifierConfig {
    id: string;
    max_sent_data: number | undefined;
    max_received_data: number | undefined;
}

export interface ProverConfig {
    id: string;
    server_dns: string;
    max_sent_data: number | undefined;
    max_recv_data: number | undefined;
}

/**
*/
export class NotarizedSession {
  free(): void;
/**
* Builds a new proof.
* @param {Reveal} reveal
* @returns {TlsProof}
*/
  proof(reveal: Reveal): TlsProof;
/**
* Returns the transcript.
* @returns {Transcript}
*/
  transcript(): Transcript;
/**
* Serializes to a byte array.
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* Deserializes from a byte array.
* @param {Uint8Array} bytes
* @returns {NotarizedSession}
*/
  static deserialize(bytes: Uint8Array): NotarizedSession;
}
/**
*/
export class Prover {
  free(): void;
/**
* @param {ProverConfig} config
*/
  constructor(config: ProverConfig);
/**
* Set up the prover.
*
* This performs all MPC setup prior to establishing the connection to the
* application server.
* @param {string} verifier_url
* @returns {Promise<void>}
*/
  setup(verifier_url: string): Promise<void>;
/**
* Send the HTTP request to the server.
* @param {string} ws_proxy_url
* @param {HttpRequest} request
* @returns {Promise<HttpResponse>}
*/
  send_request(ws_proxy_url: string, request: HttpRequest): Promise<HttpResponse>;
/**
* Returns the transcript.
* @returns {Transcript}
*/
  transcript(): Transcript;
/**
* Runs the notarization protocol.
* @param {Commit} commit
* @returns {Promise<NotarizedSession>}
*/
  notarize(commit: Commit): Promise<NotarizedSession>;
/**
* Reveals data to the verifier and finalizes the protocol.
* @param {Reveal} reveal
* @returns {Promise<void>}
*/
  reveal(reveal: Reveal): Promise<void>;
}
/**
*/
export class TlsProof {
  free(): void;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* @param {Uint8Array} bytes
* @returns {TlsProof}
*/
  static deserialize(bytes: Uint8Array): TlsProof;
/**
* Verifies the proof using the provided notary public key.
* @param {NotaryPublicKey} notary_key
* @returns {ProofData}
*/
  verify(notary_key: NotaryPublicKey): ProofData;
}
/**
*/
export class Verifier {
  free(): void;
/**
* @param {VerifierConfig} config
*/
  constructor(config: VerifierConfig);
/**
* Connect to the prover.
* @param {string} prover_url
* @returns {Promise<void>}
*/
  connect(prover_url: string): Promise<void>;
/**
* Verifies the connection and finalizes the protocol.
* @returns {Promise<VerifierData>}
*/
  verify(): Promise<VerifierData>;
}
/**
*/
export class wbg_rayon_PoolBuilder {
  free(): void;
/**
* @returns {number}
*/
  numThreads(): number;
/**
* @returns {number}
*/
  receiver(): number;
/**
*/
  build(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_notarizedsession_free: (a: number) => void;
  readonly notarizedsession_proof: (a: number, b: number, c: number) => void;
  readonly notarizedsession_transcript: (a: number) => number;
  readonly notarizedsession_serialize: (a: number, b: number) => void;
  readonly notarizedsession_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_tlsproof_free: (a: number) => void;
  readonly tlsproof_serialize: (a: number, b: number) => void;
  readonly tlsproof_deserialize: (a: number, b: number, c: number) => void;
  readonly tlsproof_verify: (a: number, b: number, c: number) => void;
  readonly __wbg_verifier_free: (a: number) => void;
  readonly verifier_new: (a: number) => number;
  readonly verifier_connect: (a: number, b: number, c: number) => number;
  readonly verifier_verify: (a: number) => number;
  readonly init_logging: (a: number) => void;
  readonly __wbg_prover_free: (a: number) => void;
  readonly prover_new: (a: number) => number;
  readonly prover_setup: (a: number, b: number, c: number) => number;
  readonly prover_send_request: (a: number, b: number, c: number, d: number) => number;
  readonly prover_transcript: (a: number, b: number) => void;
  readonly prover_notarize: (a: number, b: number) => number;
  readonly prover_reveal: (a: number, b: number) => number;
  readonly __wbg_wbg_rayon_poolbuilder_free: (a: number) => void;
  readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number;
  readonly wbg_rayon_poolbuilder_receiver: (a: number) => number;
  readonly wbg_rayon_poolbuilder_build: (a: number) => void;
  readonly initThreadPool: (a: number) => number;
  readonly wbg_rayon_start_worker: (a: number) => void;
  readonly ring_core_0_17_8_bn_mul_mont: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly memory: WebAssembly.Memory;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h55b2cafb95688ebd: (a: number, b: number) => void;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hd2e6f08741139974: (a: number, b: number, c: number) => void;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h6f377bea5980efdf: (a: number, b: number, c: number) => void;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h71d6551dc02f3cc7: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__h0a86b19f1fa78a2d: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_thread_destroy: (a?: number, b?: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
* @param {WebAssembly.Memory} maybe_memory
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput, maybe_memory?: WebAssembly.Memory): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
* @param {WebAssembly.Memory} maybe_memory
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>, maybe_memory?: WebAssembly.Memory): Promise<InitOutput>;
