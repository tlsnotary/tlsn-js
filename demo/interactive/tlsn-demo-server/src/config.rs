use http::Uri;
/// Configuration constants for the TLSNotary demo server

/// Maximum number of bytes that can be sent from prover to server
pub const MAX_SENT_DATA: usize = 2048;

/// Maximum number of bytes that can be received by prover from server
pub const MAX_RECV_DATA: usize = 4096;

/// Secret key used in demo requests (should be redacted in proofs)
pub const SECRET: &str = "TLSNotary's private key 🤡";

/// Default server configuration
pub struct Config {
    pub ws_host: String,       // Address for WebSocket server
    pub ws_port: u16,          // Port for WebSocket server
    pub server_uri: Uri,       // URI of the server from which data is proven with TLSNotary
    pub wstcp_proxy_port: u16, // Port for the wstcp proxy server
}

impl Default for Config {
    fn default() -> Self {
        Self {
            ws_host: "0.0.0.0".into(),
            ws_port: 9816,
            server_uri:
                "https://raw.githubusercontent.com/tlsnotary/tlsn/refs/tags/v0.1.0-alpha.12/crates/server-fixture/server/src/data/1kb.json".parse::<Uri>().unwrap(),
            wstcp_proxy_port: 55688,
        }
    }
}
impl Config {
    pub fn server_domain(&self) -> String {
        self.server_uri
            .host()
            .expect("Server URL must have a valid domain")
            .to_string()
    }
}
