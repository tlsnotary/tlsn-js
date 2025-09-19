import * as Comlink from 'comlink';
import init, { Verifier } from 'tlsn-js';

Comlink.expose({
  init,
  Verifier,
});
