# Quick Start Guide

There is a simple react/typescript demo app in `./demo/react-ts-webpack`. The directory contains a webpack configuration file that allows you to quickly bootstrap a webpack app using tlsn-js. 

## Run a local notary server and websocket proxy

### Websocket Proxy <a name="proxy"></a>

Since a web browser doesn't have the ability to make TCP connection, we need to use a websocket proxy server.

To run your own websocket proxy for `https://raw.githubusercontent.com` **locally**:

1. Install [wstcp](https://github.com/sile/wstcp):

    | Tool   | Command                       |
    | ------ | ----------------------------- |
    | cargo  | `cargo install wstcp`         |
    | brew   | `brew install wstcp`          |
    | source | https://github.com/sile/wstcp |

2. Run a websocket proxy for `https://raw.githubusercontent.com`:
```sh
wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443
```

Note the `raw.githubusercontent.com:443` argument on the last line, this is the server we will use in this quick start.

### Run a Local Notary Server <a name="local-notary"></a>

For this demo, we also need to run a local notary server.

* Use docker
    ```sh
    npm run notary
    ```
* Or, compile and run the notary server natively:
     ```sh
     # Clone the TLSNotary repository:
     git clone https://github.com/tlsnotary/tlsn.git --branch "v0.1.0-alpha.11"
     cd tlsn/crates/notary/server/
     # Run the notary server
     cargo run --release
     ```

The notary server will now be running in the background waiting for connections.

## `tlsn-js` in a React/Typescript app

1. Compile tlns-js
    ```sh
    npm i
    npm run build
    ```
2. Go to the demo folder
    ```sh
    cd demo/react-ts-webpack
    ```
3. Install dependencies
    ```sh
    npm i
    ```
4. Start Webpack Dev Server:
    ```
    npm run dev
    ```
5. Open `http://localhost:8080` in your browser
6. Click the **start demo** button
7. Open developer tools and monitor the console logs
