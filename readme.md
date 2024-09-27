![MIT licensed][mit-badge]
![Apache licensed][apache-badge]

[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

# tlsn-js

NPM Modules for proving and verifying using TLSNotary in the browser.

The prover requires a [notary-server](https://github.com/tlsnotary/notary-server) and a websocket proxy

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
import { NotaryServer } from 'tlsn-js';
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
  sent: [
    transcript.ranges.sent.info!,
    transcript.ranges.sent.headers!['content-type'],
    transcript.ranges.sent.headers!['host'],
    ...transcript.ranges.sent.lineBreaks,
  ],
  recv: [
    transcript.ranges.recv.info!,
    transcript.ranges.recv.headers!['server'],
    transcript.ranges.recv.headers!['date'],
    transcript.ranges.recv.json!['name'],
    transcript.ranges.recv.json!['gender'],
    ...transcript.ranges.recv.lineBreaks,
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

    | tool   | command                       |
    |--------|-------------------------------|
    | cargo  | `cargo install websocat`      |
    | brew   | `brew install websocat`       |
    | source | https://github.com/vi/websocat|

2. Run a websocket proxy for `https://swapi.dev`:
```sh
websocat --binary -v ws-l:0.0.0.0:55688 tcp:swapi.dev:443
```

## Install as NPM Package

```
npm install tlsn-js
```

## Development

> [!IMPORTANT]
> **Note on Rust-to-WASM Compilation**: This project requires compiling Rust into WASM, which needs [`clang`](https://clang.llvm.org/) version 16.0.0 or newer. MacOS users, be aware that Xcode's default `clang` might be older. If you encounter the error `No available targets are compatible with triple "wasm32-unknown-unknown"`, it's likely due to an outdated `clang`. Updating `clang` to a newer version should resolve this issue.

```
# make sure you have rust installed
# https://www.rust-lang.org/tools/install
npm install

# this serve a page that will execute the example code at http://localhost:3001 
npm run dev
```

## Build for NPM

```
npm install
npm run build
```
Note: if compilation doesn't work check file 'workerHelpers.worker.js' and replace path to '../../../tlsn_wasm.js'

## Adding a new test
1. Create a new `new-test.spec.ts` file in the `test/` directory
2. Add your spec file to the entry object fin `webpack.web.dev.config.js`
3. Add a new `div` block to `test/test.ejs` like this: `<div>Testing "new-test":<div id="new-test"></div></div>`. The div id must be the same as the filename.


