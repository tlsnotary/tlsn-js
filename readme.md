![MIT licensed][mit-badge]
![Apache licensed][apache-badge]

[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

# tlsn-js

NPM Modules for proving and verifying using TLSNotary in the browser.

The prover requires a [notary-server](https://github.com/tlsnotary/notary-server) and a websocket proxy.

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

## Examples

`tlsn-js` can be used in many different modes, depending on your use case.

The `./demo` folder contains three demos of `tlsn-js`:

* `react-ts-webpack`: create an attestation with a Notary and render the result.
* `interactive-demo`: prove data interactively to a Verifier.
* `web-to-web-p2p`: prove data between two peers, in the browser.

## Running a local websocket proxy

In the demos, we attest data from the `https://swapi.dev` website. Because the browser does not allow for TCP connections, you need to set up a websocket proxy:

1. Install [websocat](https://github.com/vi/websocat):

    | Tool   | Command                        |
    | ------ | ------------------------------ |
    | cargo  | `cargo install websocat`       |
    | brew   | `brew install websocat`        |
    | source | https://github.com/vi/websocat |

2. Run a websocket proxy for `https://swapi.dev`:
```sh
websocat --binary -v ws-l:0.0.0.0:55688 tcp:swapi.dev:443
```

## Install as NPM Package

```sh
npm install tlsn-js
```

## Development

```sh
# make sure you have rust installed
# https://www.rust-lang.org/tools/install
npm install

# this serves a page that will execute the example code at http://localhost:3001
npm run dev
```

## Build for NPM

```sh
npm install
npm run build
```

## Adding a new test
1. Create a new `new-test.spec.ts` file in the `test/` directory.
2. Add your spec file to the entry object in `webpack.web.dev.config.js`.
3. Add a new `div` block to `test/test.ejs` like this: `<div>Testing "new-test":<div id="new-test"></div></div>`. The `div` id must be the same as the filename.


