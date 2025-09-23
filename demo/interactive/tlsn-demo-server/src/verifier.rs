use async_tungstenite::{tokio::connect_async_with_config, tungstenite::protocol::WebSocketConfig};
use eyre::eyre;
use tlsn::{
    config::ProtocolConfigValidator,
    connection::ServerName,
    verifier::{Verifier, VerifierConfig, VerifierOutput, VerifyConfig},
};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio_util::compat::TokioAsyncReadCompatExt;
use tracing::{debug, info};
use uuid;
use ws_stream_tungstenite::WsStream;

// Maximum number of bytes that can be sent from prover to server
const MAX_SENT_DATA: usize = 2048;
// Maximum number of bytes that can be received by prover from server
const MAX_RECV_DATA: usize = 4096;

/// Connect to prover via websocket and run verification
pub async fn run_verifier_test(
    prover_host: &str,
    prover_port: u16,
    server_domain: &str,
) -> Result<(), eyre::ErrReport> {
    info!("Sending websocket request to prover...");
    let request = http::Request::builder()
        .uri(format!("ws://{prover_host}:{prover_port}/prove"))
        .header("Host", prover_host)
        .header("Sec-WebSocket-Key", uuid::Uuid::new_v4().to_string())
        .header("Sec-WebSocket-Version", "13")
        .header("Connection", "Upgrade")
        .header("Upgrade", "Websocket")
        .body(())
        .unwrap();

    let (prover_ws_stream, _) =
        connect_async_with_config(request, Some(WebSocketConfig::default()))
            .await
            .map_err(|e| eyre!("Failed to connect to prover: {}", e))?;

    info!("Websocket connection established with prover!");
    let prover_ws_socket = WsStream::new(prover_ws_stream);
    verifier(prover_ws_socket, server_domain).await?;
    info!("Verification is successful!");
    Ok(())
}

/// Core verifier logic that validates the TLS proof
pub async fn verifier<T: AsyncWrite + AsyncRead + Send + Unpin + 'static>(
    socket: T,
    server_domain: &str,
) -> Result<(String, String), eyre::ErrReport> {
    debug!("Starting verification...");

    // Setup Verifier.
    let config_validator = ProtocolConfigValidator::builder()
        .max_sent_data(MAX_SENT_DATA)
        .max_recv_data(MAX_RECV_DATA)
        .build()
        .unwrap();

    let verifier_config = VerifierConfig::builder()
        .protocol_config_validator(config_validator)
        .build()
        .unwrap();
    let verifier = Verifier::new(verifier_config);

    // Receive authenticated data.
    debug!("Starting MPC-TLS verification...");

    let VerifierOutput {
        server_name,
        transcript,
        ..
    } = verifier
        .verify(socket.compat(), &VerifyConfig::default())
        .await
        .map_err(|e| eyre!("Verification failed: {}", e))?;

    let server_name =
        server_name.ok_or_else(|| eyre!("prover should have revealed server name"))?;
    let transcript =
        transcript.ok_or_else(|| eyre!("prover should have revealed transcript data"))?;

    // Check sent data: check host.
    debug!("Starting sent data verification...");
    let sent = transcript.sent_unsafe().to_vec();
    let sent_data = String::from_utf8(sent.clone()).expect("Verifier expected sent data");
    sent_data
        .find(server_domain)
        .ok_or_else(|| eyre!("Verification failed: Expected host {}", server_domain))?;

    // Check received data: check json and version number.
    debug!("Starting received data verification...");
    let received = transcript.received_unsafe().to_vec();
    let response = String::from_utf8(received.clone()).expect("Verifier expected received data");

    debug!("Received data: {:?}", response);
    response
        .find("123 Elm Street")
        .ok_or_else(|| eyre!("Verification failed: missing data in received data"))?;

    // Check Session info: server name.
    let ServerName::Dns(dns_name) = server_name;
    if dns_name.as_str() != server_domain {
        return Err(eyre!("Verification failed: server name mismatches"));
    }

    let sent_string = bytes_to_redacted_string(&sent)?;
    let received_string = bytes_to_redacted_string(&received)?;

    info!("============================================");
    info!("Verification successful!");
    info!("============================================");
    info!("Sent data: {:?}", sent_string);
    info!("Received data: {:?}", received_string);

    Ok((sent_string, received_string))
}

/// Render redacted bytes as `🙈`.
fn bytes_to_redacted_string(bytes: &[u8]) -> Result<String, eyre::ErrReport> {
    Ok(String::from_utf8(bytes.to_vec())
        .map_err(|err| eyre!("Failed to parse bytes to redacted string: {err}"))?
        .replace('\0', "🙈"))
}
