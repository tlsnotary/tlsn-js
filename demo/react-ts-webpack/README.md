# TLSNotary in React/TypeScript with `tlsn-js`

This demo shows how to use TLSNotary with a delegated verifier, also known as a **notary**.  
In this demo, we request JSON data from a GitHub page, use `tlsn-js` to notarize the TLS request with TLSNotary, and display the attestation and revealed data.

> **Note:**  
> This demo uses TLSNotary to notarize **public** data for simplicity. In real-world applications, TLSNotary is especially valuable for notarizing private and sensitive data.

---

## Setup

Before running the demo, you need to start a local notary server and a websocket proxy. If you prefer to use the hosted test servers from PSE, see the section below.

### Websocket Proxy

Browsers cannot make raw TCP connections, so a websocket proxy server is required.

1. **Install [wstcp](https://github.com/sile/wstcp):**
    ```sh
    cargo install wstcp
    ```
2. **Run a websocket proxy for `https://raw.githubusercontent.com`:**
    ```sh
    wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443
    ```
   > Note: The `raw.githubusercontent.com:443` argument specifies the server used in this quick start.

### Run a Local Notary Server

You also need to run a local notary server for this demo.

- **Using Git and Rust Cargo:**
    ```sh
    git clone https://github.com/tlsnotary/tlsn.git
    cargo run --release --bin notary-server
    ```
- **Using Docker (from the root of the tlsn-js repo):**
    ```sh
    npm run notary
    ```

The notary server will now be running in the background, waiting for connections.

---

### Use the PSE Web Proxy and Notary

If you want to use the hosted PSE notary and proxy:

1. Open `app.tsx` in your editor.
2. Replace the notary URL:
    ```ts
    notaryUrl: 'https://notary.pse.dev/v0.1.0-alpha.10',
    ```
    This uses the [PSE](https://pse.dev) notary server to notarize the API request. You can use a different or [local notary](#run-a-local-notary-server); a local server will be faster due to the high bandwidth and low network latency.
3. Replace the websocket proxy URL:
    ```ts
    websocketProxyUrl: 'wss://notary.pse.dev/proxy?token=raw.githubusercontent.com',
    ```
    This uses a proxy hosted by [PSE](https://pse.dev). You can use a different or local proxy if you prefer.

---

## Run the Demo

1. **Install dependencies:**
    ```sh
    npm i
    ```
2. **Start the Webpack Dev Server:**
    ```sh
    npm run dev
    ```
3. **Open the demo in your browser:**  
   Go to [http://localhost:8080](http://localhost:8080)
4. **Click the "Start demo" button**
5. **Open Developer Tools** and monitor the console logs
œœ