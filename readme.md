# tlsn-js

NPM Modules for proving and verifying using TLSNotary in the browser.

The prover requires a [notary-server](https://github.com/tlsnotary/notary-server) and a websocket proxy

> [!IMPORTANT]
> `tlsn-js` is developed for the usage of TLSNotary **in the Browser**. This module does not work in `nodejs`.

## Example
```ts
import { prove, verify } from '../src';

// To create a proof
const proof = await prove('https://swapi.dev/api/people/1', {
    method: 'GET',
    headers: {
      Connection: 'close',
      Accept: 'application/json',
      'Accept-Encoding': 'identity',
    },
    body: '',
    maxTranscriptSize: 20000,
    notaryUrl: 'https://127.0.0.1:7047',
    websocketProxyUrl: 'ws://127.0.0.1:55688',
});

// To verify a proof
const result = await verify(proof);
console.log(result);
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
websocat --binary ws-l:0.0.0.0:55688 tcp:swapi.dev:443
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

## Adding a new test
1. Create a new `new-test.spec.ts` file in the `test/` directory
2. Add your spec file to the entry object fin `webpack.web.dev.config.js`
3. Add a new `div` block to `test/test.ejs` like this: `<div>Testing "new-test":<div id="new-test"></div></div>`. The div id must be the same as the filename.


