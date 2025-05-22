# Playwright React-TS-Webpack Testing

1. Build TLSN
```
../../; npm i && npm run build
```
2. Run Proxy
```
wstcp --bind-addr 127.0.0.1:55688 raw.githubusercontent.com:443
```
3. Run Server

Clone or cd into [tlsn](https://github.com/tlsnotary/tlsn)
```
cd tlsn/crates/notary/server && cargo run --release --tls-enabled false
```

4. Start React Demo
```
cd react-ts-webpack; npx run test
```
5. Navigate to localhost:8080
