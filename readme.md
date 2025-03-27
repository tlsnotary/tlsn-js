![MIT licensed][mit-badge]
![Apache licensed][apache-badge]

[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

# tlsn-js

NPM Modules for proving and verifying using TLSNotary in the browser.

The prover requires a [notary-server](https://github.com/tlsnotary/notary-server) and a websocket proxy

> [!IMPORTANT]
> The primary purpose of `tlsn-js` is to support the development of the [TLSNotary browser extension](https://github.com/tlsnotary/tlsn-extension/).  
> **Please do not treat this as a public API (yet).**

> [!IMPORTANT]
> `tlsn-js` is developed for the usage of TLSNotary **in the Browser**. This module does not work in `nodejs`.

## License
This repository is licensed under either of

- [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)
- [MIT license](http://opensource.org/licenses/MIT)

at your option.

## Example
```ts
// worker.ts
import * as Comlink from 'comlink';
import init, { Prover, NotarizedSession, TlsProof } from 'tlsn-js';

Comlink.expose({
  init,
  Prover,
  NotarizedSession,
  TlsProof,
});

```
```ts
// app.ts
import { NotaryServer, subtractRanges, mapStringToRange } from 'tlsn-js';
const { init, Prover, NotarizedSession, TlsProof }: any = Comlink.wrap(
  new Worker(new URL('./worker.ts', import.meta.url)),
);

// To create a proof
await init({ loggingLevel: 'Debug '});
const notary = NotaryServer.from(`http://localhost:7047`);
const prover = await new Prover({ serverDns: 'swapi.dev' });

// Connect to verifier
await prover.setup(await notary.sessionUrl());

// Submit request
await prover.sendRequest('ws://localhost:55688', {
  url: 'https://swapi.dev/api/people/1',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  body: {
    hello: 'world',
    one: 1,
  },
});

// Get transcript and precalculated ranges
const transcript = await prover.transcript();

// Select ranges to commit 
const commit: Commit = {
  sent: subtractRanges(
    { start: 0, end: transcript.sent.length },
    mapStringToRange(
      ['secret: test_secret'],
      Buffer.from(transcript.sent).toString('utf-8'),
    ),
  ),
  recv: [
    { start: 0, end: transcript.recv.length },
  ],
};

// Notarize selected ranges
const serializedSession = await prover.notarize(commit);

// Instantiate NotarizedSession
// note: this is necessary because workers can only post messages in serializable values
const notarizedSession = await new NotarizedSession(serializedSession);


// Create proof for commited ranges
// note: this will reveal the selected ranges
const serializedProof = await notarizedSession.proof(commit);

// Instantiate Proof
// note: necessary due to limitation with workers
const proof = await new TlsProof(serializedProof);

// Verify a proof
const proofData = await proof.verify({
  typ: 'P256',
  key: await notary.publicKey(),
});
```

## Running a local websocket proxy for `https://swapi.dev`

1. Install [websocat](https://github.com/vi/websocat):

    | tool   | command                        |
    | ------ | ------------------------------ |
    | cargo  | `cargo install websocat`       |
    | brew   | `brew install websocat`        |
    | source | https://github.com/vi/websocat |

2. Run a websocket proxy for `https://swapi.dev`:
```sh
websocat --binary -v ws-l:0.0.0.0:55688 tcp:swapi.dev:443
```

## Install as NPM Package

```
npm install tlsn-js
```

# Development

This library is a JS wrapper for `tlsn-wasm`.

To work on `tlsn-wasm` and `tlsn-js` at the same time, replace the "tlsn-wasm" dependency in `package.json` with:
```
    "tlsn-wasm": "./tlsn-wasm/pkg"
```
and run `npm run build:wasm` to build `tlsn-wasm` locally.

Next, run:
```
npm install
npm run test
```

Note: if you want to switch back to a build with the version from npm, make sure to reset/remove `package-lock.json`, or it will keep using the local link.

## Build for NPM

```
npm install
npm run build
```

## Adding a new test
1. Create a new `new-test.spec.ts` file in the `test/` directory
2. Add your spec file to the entry object fin `webpack.web.dev.config.js`
3. Add a new `div` block to `test/test.ejs` like this: `<div>Testing "new-test":<div id="new-test"></div></div>`. The div id must be the same as the filename.


