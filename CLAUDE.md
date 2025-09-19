# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building and Development
- `npm run build` - Build the library for production
- `npm run build:lib` - Build both source and TypeScript definitions
- `npm run build:src` - Build source with webpack
- `npm run build:types` - Compile TypeScript definitions
- `npm run build:wasm` - Build the WASM module (requires Rust and wasm-pack)
- `npm run dev` - Start development server with file watching
- `npm run watch:dev` - Watch mode for development builds

### Code Quality
- `npm run lint` - Run both TypeScript checking and ESLint
- `npm run lint:tsc` - TypeScript type checking
- `npm run lint:eslint` - ESLint with auto-fix

### Testing
- `npm test` - Run Playwright tests
- `npx playwright test --ui` - Run tests with browser UI
- `npx playwright test --debug` - Debug tests in browser
- `npm run notary` - Start local notary server for testing

### Infrastructure
- `npm run serve:test` - Serve test build on port 3001
- `wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443` - WebSocket proxy for demos

## Architecture Overview

### Core Library Structure
- **src/lib.ts** - Main library exports including `Prover`, `Verifier`, `Presentation`, `Attestation`, `Secrets`, and `NotaryServer` classes
- **src/types.ts** - TypeScript type definitions
- **src/transcript.ts** - Transcript processing utilities
- **src/utils.ts** - Utility functions for hex/array conversion and validation

### WASM Integration
- Built around `tlsn-wasm` module (Rust-based WebAssembly)
- WASM files are copied to build output via webpack configuration
- Requires browser environment (Web Workers) - does NOT work in Node.js
- Uses worker threads for cryptographic operations

### Key Classes and Their Roles

#### `Prover`
- Main class for creating TLS proofs/attestations
- `Prover.notarize()` - Static method for simple notarization workflow
- Requires WebSocket proxy for TCP connections from browser
- Supports client authentication and custom commit ranges

#### `Verifier` 
- Verifies proofs in interactive scenarios
- Connects to prover instances for real-time verification

#### `Presentation`
- Handles presentation of proofs with selective disclosure
- Can be constructed from attestation/secrets or serialized data
- Supports verification and transcript extraction

#### `NotaryServer`
- Utility for interacting with notary servers
- Handles session creation and key retrieval
- Normalizes URLs between HTTP/HTTPS and WS/WSS protocols

### Demo Applications
Three demo types showcase different usage patterns:
- **react-ts-webpack** - React app with notary server attestation
- **interactive-demo** - Real-time prover-verifier interaction  
- **web-to-web-p2p** - Peer-to-peer browser verification

### Build System
- **webpack.build.config.js** - Production library build targeting `webworker`
- **webpack.web.dev.config.js** - Development/test builds
- Uses UMD format for broad compatibility
- Copies WASM assets and snippets to build directory

### Testing Strategy
- **Playwright** for browser-based testing (configured in playwright.config.ts)
- Tests run against localhost:3001 with automatic build/serve
- Separate test specs in both `/test/` (actual tests) and `/playwright-test/` (runners)
- WebSocket proxy automatically started for tests
- Tests require running notary server for full integration

### Dependencies and Environment
- **Browser-only**: Uses Web Workers, WebSockets, and WASM
- **Rust toolchain**: Required for WASM builds via tlsn-wasm submodule
- **External services**: Requires WebSocket proxy (wstcp) and notary server
- **Version**: Currently alpha.12 with specific tlsn-wasm dependency

### WebSocket Proxy Requirement
Browsers cannot make raw TCP connections, so all demos require a WebSocket proxy:
- Install: `cargo install wstcp` or `brew install wstcp`
- Run: `wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443`
- Used in all demos for connecting to target servers

### Development Workflow
1. Build WASM if working on Rust code: `npm run build:wasm`
2. Install dependencies: `npm install`
3. For library development: `npm run dev` (watch mode)
4. For testing: Start notary server, then `npm test`
5. For demos: Navigate to demo directory and run `npm run dev`

### Important Notes
- This library is specifically designed for the TLSNotary browser extension
- API is not yet considered stable/public
- All cryptographic operations happen in Web Workers for performance
- Transcript data can be selectively revealed using commit/reveal patterns