# Web-to-Web P2P Demo

This project demonstrates a peer-to-peer (P2P) communication between two web clients using TLSNotary.
The web prover will get data from <https://swapi.dev> and prove it to the web verifier.

In this demo, the two web clients run in the same browser page (`./src/app.tsx`) and communicate via a simple websocket server (`./server/index.js`)

## Run the demo

1. Run the demo:
```
    npm i
    npm run dev
```
2. Open <http://localhost:3456/>
3. Click the **Start Demo** button

The Prover window logs the Prover's output, the Verifier logs the Verifier's output. In the console view you can see the websocket log.
You can also open the Browser developer tools (F12) to see more TLSNotary protocol logs.

## Project Structure

- `src/`: Contains the source code for the demo.
- `server/`: Contains the WebSocket server code.