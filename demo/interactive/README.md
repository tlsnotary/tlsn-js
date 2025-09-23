# Interactive Verifier Demo

This demo shows how to use TLSNotary **without a notary**: a direct proof between a prover and a verifier, where the verifier checks both the TLS session and the revealed data.

There are two prover implementations:
- **Rust**
- **TypeScript** (browser)
The verifier is implemented in Rust.

---

## Interactive Verifier Demo with Rust Prover

1. **Start the verifier:**
    ```bash
    cd verifier-rs
    cargo run --release
    ```
2. **Run the prover:**
    ```bash
    cd prover-rs
    cargo run --release
    ```

---

## Interactive Verifier Demo with TypeScript Prover (Browser)

1. **Start the verifier:**
    ```bash
    cd verifier-rs
    cargo run --release
    ```
2. **Set up a websocket proxy for raw.githubusercontent.com**  
   Browsers cannot make raw TCP connections, so a websocket proxy is required:
    ```bash
    cargo install wstcp
    wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443
    ```
3. **Run the prover in the browser:**
    1. **Build tlsn-js**
        ```bash
        cd ..
        npm install
        npm run build
        ```
    2. **Build and start the TypeScript prover demo**
        ```bash
        cd prover-ts
        npm install
        npm run dev
        ```
    3. **Open the demo in your browser:**  
       Go to [http://localhost:8080/](http://localhost:8080/) and click **Start Prover**.

---

**Tip:**  
If you encounter issues, make sure all dependencies are installed and the websocket proxy is running before starting the browser demo.
