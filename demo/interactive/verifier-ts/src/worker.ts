import * as Comlink from 'comlink';
import initWasm, { LoggingLevel, initialize, Verifier } from 'tlsn-wasm';

Comlink.expose({
  init,
  Verifier,
});

export default async function init(config?: {
  loggingLevel?: LoggingLevel;
  hardwareConcurrency?: number;
}) {
  const {
    loggingLevel = 'Info',
    hardwareConcurrency = navigator.hardwareConcurrency,
  } = config || {};


  const res = await initWasm();


  await initialize(
    {
      level: loggingLevel,
      crate_filters: undefined,
      span_events: undefined,
    },
    hardwareConcurrency,
  );


}
