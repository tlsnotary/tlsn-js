/// Shared utilities for WebSocket connection handling

use uuid;

/// Create a WebSocket connection request with standard headers
/// This eliminates duplication of WebSocket request creation across modules
pub fn create_websocket_request(host: &str, port: u16, path: &str) -> http::Request<()> {
    http::Request::builder()
        .uri(format!("ws://{host}:{port}{path}"))
        .header("Host", host)
        .header("Sec-WebSocket-Key", uuid::Uuid::new_v4().to_string())
        .header("Sec-WebSocket-Version", "13")
        .header("Connection", "Upgrade")
        .header("Upgrade", "Websocket")
        .body(())
        .unwrap()
}