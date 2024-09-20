/* tslint:disable */
/* eslint-disable */
/**
* Initializes logging.
* @param {LoggingConfig | undefined} [config]
*/
export function init_logging(config?: LoggingConfig): void;
/**
* Builds a presentation.
* @param {Attestation} attestation
* @param {Secrets} secrets
* @param {Reveal} reveal
* @returns {Presentation}
*/
export function build_presentation(attestation: Attestation, secrets: Secrets, reveal: Reveal): Presentation;
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

export type TlsVersion = "V1_2" | "V1_3";

export interface TranscriptLength {
    sent: number;
    recv: number;
}

export interface ConnectionInfo {
    time: number;
    version: TlsVersion;
    transcript_length: TranscriptLength;
}

export interface Transcript {
    sent: number[];
    recv: number[];
}

export interface PartialTranscript {
    sent: number[];
    sent_authed: { start: number; end: number }[];
    recv: number[];
    recv_authed: { start: number; end: number }[];
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

export interface PresentationOutput {
    attestation: Attestation;
    server_name: string | undefined;
    connection_info: ConnectionInfo;
    transcript: PartialTranscript | undefined;
}

export interface NotarizationOutput {
    attestation: Attestation;
    secrets: Secrets;
}

export interface VerifierOutput {
    server_name: string;
    connection_info: ConnectionInfo;
    transcript: PartialTranscript;
}

export interface VerifyingKey {
    alg: number;
    data: number[];
}

export interface VerifierConfig {
    max_sent_data: number;
    max_recv_data: number;
}

export interface ProverConfig {
    server_name: string;
    max_sent_data: number;
    max_recv_data_online: number | undefined;
    max_recv_data: number;
    defer_decryption_from_start: boolean | undefined;
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

/**
*/
export class Attestation {
  free(): void;
/**
* @returns {VerifyingKey}
*/
  verifying_key(): VerifyingKey;
/**
* Serializes to a byte array.
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* Deserializes from a byte array.
* @param {Uint8Array} bytes
* @returns {Attestation}
*/
  static deserialize(bytes: Uint8Array): Attestation;
}
/**
*/
export class Presentation {
  free(): void;
/**
* Verifies the presentation.
* @returns {PresentationOutput}
*/
  verify(): PresentationOutput;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* @param {Uint8Array} bytes
* @returns {Presentation}
*/
  static deserialize(bytes: Uint8Array): Presentation;
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
* @returns {Promise<NotarizationOutput>}
*/
  notarize(commit: Commit): Promise<NotarizationOutput>;
/**
* Reveals data to the verifier and finalizes the protocol.
* @param {Reveal} reveal
* @returns {Promise<void>}
*/
  reveal(reveal: Reveal): Promise<void>;
}
/**
*/
export class Secrets {
  free(): void;
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
* @returns {Secrets}
*/
  static deserialize(bytes: Uint8Array): Secrets;
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
* @returns {Promise<VerifierOutput>}
*/
  verify(): Promise<VerifierOutput>;
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
  readonly __wbg_attestation_free: (a: number) => void;
  readonly attestation_verifying_key: (a: number) => number;
  readonly attestation_serialize: (a: number, b: number) => void;
  readonly attestation_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_secrets_free: (a: number) => void;
  readonly secrets_transcript: (a: number) => number;
  readonly secrets_serialize: (a: number, b: number) => void;
  readonly __wbg_presentation_free: (a: number) => void;
  readonly presentation_verify: (a: number, b: number) => void;
  readonly presentation_serialize: (a: number, b: number) => void;
  readonly presentation_deserialize: (a: number, b: number, c: number) => void;
  readonly secrets_deserialize: (a: number, b: number, c: number) => void;
  readonly __wbg_verifier_free: (a: number) => void;
  readonly verifier_new: (a: number) => number;
  readonly verifier_connect: (a: number, b: number, c: number) => number;
  readonly verifier_verify: (a: number) => number;
  readonly init_logging: (a: number) => void;
  readonly build_presentation: (a: number, b: number, c: number, d: number) => void;
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
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hc0e5bb67f3c02103: (a: number, b: number, c: number) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h554e67a0479894ff: (a: number, b: number) => void;
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
