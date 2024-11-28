# Test Rust Prover

1. Start the verifier:
```bash
cd verifier-rs; cargo run --release
```
2. Run the prover:
```bash
cd prover-rs; cargo run --release
```

# Test Browser Prover
1. Start the verifier:
```bash
cd verifier-rs; cargo run --release
```
2. Since a web browser doesn't have the ability to make TCP connection, we need to use a websocket proxy server to access <swapi.dev>.
```bash
cargo install wstcp

wstcp --bind-addr 127.0.0.1:55688 swapi.dev:443
```
3. Run the prover
    1. Build tlsn-js
        ```bash
        cd ..
        npm i
        npm run build
        npm link
        ```
    2. Build demo prover-ts
        ```bash
        cd prover-ts
        npm i
        npm link
        npm run dev
        ```
    3. Open <http://localhost:8080/> and click **Start Prover**

## Troubleshooting

* `Failed to connect to the server. CloseEvent...`:
  * Did you start the Verifier?
  * Did you start the Websocket Proxy?
  * Is the Server online?