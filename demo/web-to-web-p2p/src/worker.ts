import * as Comlink from 'comlink';
import init, { Prover, Attestation, Presentation, Verifier } from 'tlsn-js';

Comlink.expose({
  init,
  Prover,
  Verifier,
  Presentation,
  Attestation,
});
