![MIT licensed][mit-badge]  
![Apache licensed][apache-badge]

[mit-badge]: https://img.shields.io/badge/license-MIT-blue.svg  
[apache-badge]: https://img.shields.io/github/license/saltstack/salt

# tlsn-js

NPM modules for proving and verifying using TLSNotary in the browser.

> [!IMPORTANT]
> `tlsn-js` is developed specifically for **browser environments** and does **not** work in Node.js.

> [!IMPORTANT]
> The primary goal of `tlsn-js` is to support the development of the [TLSNotary browser extension](https://github.com/tlsnotary/tlsn-extension/).  
> **Please do not treat this as a public API (yet).**

## License

This repository is licensed under either:

- [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)
- [MIT License](http://opensource.org/licenses/MIT)

...at your option.

## Examples

`tlsn-js` can be used in several modes depending on your use case.

The `./demo` folder contains three demos:

- `react-ts-webpack`: Create an attestation with a Notary and render the result.
- `interactive-demo`: Prove data interactively to a Verifier.
- `web-to-web-p2p`: Prove data between two browser peers.

## Running a Local WebSocket Proxy

In the demos, we attest data from `https://raw.githubusercontent.com`. Since browsers do not support raw TCP connections, a WebSocket proxy is required:

1. Install [wstcp](https://github.com/sile/wstcp):

    | Tool   | Command                       |
    | ------ | ----------------------------- |
    | cargo  | `cargo install wstcp`         |
    | brew   | `brew install wstcp`          |
    | source | https://github.com/sile/wstcp |

2. Run a WebSocket proxy for `https://raw.githubusercontent.com`:

    ```sh
    wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443
    ```

## Install as NPM Package

```sh
npm install tlsn-js
```

## Development

This library wraps the `tlsn-wasm` module.

To work on both `tlsn-wasm` and `tlsn-js` locally, update `package.json`:

```json
"tlsn-wasm": "./tlsn-wasm/pkg"
```

Then build `tlsn-wasm`:

```sh
npm run build:wasm
```

Next:

```sh
npm install
npm run test
```

> ℹ️ To switch back to the npm-published version of `tlsn-wasm`, delete or reset `package-lock.json` to remove the local path reference.

## Build for NPM

```sh
npm install
npm run build
```

## Testing

Testing is slightly complex due to the need for browser-based workers.

- Tests live in the `test/` directory.
- The `tests/` directory contains a Playwright test runner that opens a Chromium browser and runs the actual test page.

Some tests require a running Notary. You can start one via Docker:

```sh
npm run notary
```

### Adding a New `tlsn-js` Test

1. Create a `new-test.spec.ts` file in the `test/` directory.
2. Add your spec file to the `entry` object in `webpack.web.dev.config.js`.
3. Update `test/test.ejs` with a block like:

    ```html
    <div>
      Testing "new-test":
      <div id="new-test" data-testid="new-test"></div>
    </div>
    ```

    The `div` ID must match the filename.

4. Add an `expect()` call for it in `tests/test.spec.ts`.

### Testing the Demos

Playwright is also used to test the demos.

```sh
npm install
npm run test
```

- View tests in the browser:  
  ```sh
  npx playwright test --ui
  ```

- Debug tests:  
  ```sh
  npx playwright test --debug
  ```
