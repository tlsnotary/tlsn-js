import * as Comlink from 'comlink';
import init, { Prover, Presentation, Attestation } from '../src/lib';

Comlink.expose({
  init,
  Prover,
  Presentation,
  Attestation,
});
