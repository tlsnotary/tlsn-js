use axum::{
    extract::{Request, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum_websocket::{WebSocket, WebSocketUpgrade};
use eyre::eyre;
use hyper::{body::Incoming, server::conn::http1};
use hyper_util::rt::TokioIo;
use std::{
    net::{IpAddr, SocketAddr},
    sync::Arc,
};
use tlsn_common::config::ProtocolConfigValidator;
use tlsn_core::{VerifierOutput, VerifyConfig};
use tlsn_verifier::{Verifier, VerifierConfig};

use tokio::{
    io::{AsyncRead, AsyncWrite},
    net::TcpListener,
};
use tokio_util::compat::TokioAsyncReadCompatExt;
use tower_service::Service;
use tracing::{debug, error, info};
use ws_stream_tungstenite::WsStream;

mod axum_websocket;

// Maximum number of bytes that can be sent from prover to server
const MAX_SENT_DATA: usize = 1 << 12;
// Maximum number of bytes that can be received by prover from server
const MAX_RECV_DATA: usize = 1 << 14;

/// Global data that needs to be shared with the axum handlers
#[derive(Clone, Debug)]
struct VerifierGlobals {
    pub server_domain: String,
}

pub async fn run_server(
    verifier_host: &str,
    verifier_port: u16,
    server_domain: &str,
) -> Result<(), eyre::ErrReport> {
    let verifier_address = SocketAddr::new(
        IpAddr::V4(verifier_host.parse().map_err(|err| {
            eyre!("Failed to parse verifier host address from server config: {err}")
        })?),
        verifier_port,
    );
    let listener = TcpListener::bind(verifier_address)
        .await
        .map_err(|err| eyre!("Failed to bind server address to tcp listener: {err}"))?;

    info!("Listening for TCP traffic at {}", verifier_address);

    let protocol = Arc::new(http1::Builder::new());
    let router = Router::new()
        .route("/verify", get(ws_handler))
        .with_state(VerifierGlobals {
            server_domain: server_domain.to_string(),
        });

    loop {
        let stream = match listener.accept().await {
            Ok((stream, _)) => stream,
            Err(err) => {
                error!("Failed to connect to prover: {err}");
                continue;
            }
        };
        debug!("Received a prover's TCP connection");

        let tower_service = router.clone();
        let protocol = protocol.clone();

        tokio::spawn(async move {
            info!("Accepted prover's TCP connection",);
            // Reference: https://github.com/tokio-rs/axum/blob/5201798d4e4d4759c208ef83e30ce85820c07baa/examples/low-level-rustls/src/main.rs#L67-L80
            let io = TokioIo::new(stream);
            let hyper_service = hyper::service::service_fn(move |request: Request<Incoming>| {
                tower_service.clone().call(request)
            });
            // Serve different requests using the same hyper protocol and axum router
            let _ = protocol
                .serve_connection(io, hyper_service)
                // use with_upgrades to upgrade connection to websocket for websocket clients
                // and to extract tcp connection for tcp clients
                .with_upgrades()
                .await;
        });
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(verifier_globals): State<VerifierGlobals>,
) -> impl IntoResponse {
    info!("Received websocket request");
    ws.on_upgrade(|socket| handle_socket(socket, verifier_globals))
}

async fn handle_socket(socket: WebSocket, verifier_globals: VerifierGlobals) {
    debug!("Upgraded to websocket connection");
    let stream = WsStream::new(socket.into_inner());

    match verifier(stream, &verifier_globals.server_domain).await {
        Ok((sent, received)) => {
            info!("Successfully verified {}", &verifier_globals.server_domain);
            info!("Verified sent data:\n{}", sent,);
            println!("Verified received data:\n{received}",);
        }
        Err(err) => {
            error!("Failed verification using websocket: {err}");
        }
    }
}

async fn verifier<T: AsyncWrite + AsyncRead + Send + Unpin + 'static>(
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

    let verify_config = VerifyConfig::default();
    let VerifierOutput {
        server_name,
        transcript,
        ..
    } = verifier
        .verify(socket.compat(), &verify_config)
        .await
        .unwrap();

    let transcript = transcript.expect("prover should have revealed transcript data");

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
    if let Some(server_name) = server_name {
        if server_name.as_str() != server_domain {
            return Err(eyre!("Verification failed: server name mismatches"));
        }
    } else {
        // TODO: https://github.com/tlsnotary/tlsn-js/issues/110
        // return Err(eyre!("Verification failed: server name is missing"));
    }

    let sent_string = bytes_to_redacted_string(&sent)?;
    let received_string = bytes_to_redacted_string(&received)?;

    Ok((sent_string, received_string))
}

/// Render redacted bytes as `🙈`.
fn bytes_to_redacted_string(bytes: &[u8]) -> Result<String, eyre::ErrReport> {
    Ok(String::from_utf8(bytes.to_vec())
        .map_err(|err| eyre!("Failed to parse bytes to redacted string: {err}"))?
        .replace('\0', "🙈"))
}
