import * as Comlink from 'comlink';
import init, { Prover, SignedSession, verify_attestation } from 'tlsn-js';

Comlink.expose({
  init,
  Prover,
  SignedSession,
  verify_attestation,
});
