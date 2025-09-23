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
use tokio::net::TcpListener;
use tower_service::Service;
use tracing::{debug, error, info};
use ws_stream_tungstenite::WsStream;

mod axum_websocket;
pub mod prover;
pub mod verifier;
use prover::prover;
use verifier::verifier;

// Maximum number of bytes that can be sent from prover to server
const MAX_SENT_DATA: usize = 2048;
// Maximum number of bytes that can be received by prover from server
const MAX_RECV_DATA: usize = 4096;

const SECRET: &str = "TLSNotary's private key 🤡";

/// Global data that needs to be shared with the axum handlers
#[derive(Clone, Debug)]
struct ServerGlobals {
    pub server_url: String,
    pub server_domain: String,
}

pub async fn run_server(
    prover_host: &str,
    prover_port: u16,
    server_url: &str,
    server_domain: &str,
) -> Result<(), eyre::ErrReport> {
    let prover_address = SocketAddr::new(
        IpAddr::V4(prover_host.parse().map_err(|err| {
            eyre!("Failed to parse prover host address from server config: {err}")
        })?),
        prover_port,
    );
    let listener = TcpListener::bind(prover_address)
        .await
        .map_err(|err| eyre!("Failed to bind server address to tcp listener: {err}"))?;

    info!("Listening for TCP traffic at {}", prover_address);

    let protocol = Arc::new(http1::Builder::new());
    let router = Router::new()
        .route("/prove", get(ws_handler_prover))
        .route("/verify", get(ws_handler_verifier))
        .with_state(ServerGlobals {
            server_url: server_url.to_string(),
            server_domain: server_domain.to_string(),
        });

    loop {
        let stream = match listener.accept().await {
            Ok((stream, _)) => stream,
            Err(err) => {
                error!("Failed to connect to verifier: {err}");
                continue;
            }
        };
        debug!("Received a verifier's TCP connection");

        let tower_service = router.clone();
        let protocol = protocol.clone();

        tokio::spawn(async move {
            info!("Accepted verifier's TCP connection");
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

async fn ws_handler_prover(
    ws: WebSocketUpgrade,
    State(prover_globals): State<ServerGlobals>,
) -> impl IntoResponse {
    info!("Received websocket request");
    ws.on_upgrade(move |socket| handle_socket_prover(socket, prover_globals))
}

async fn ws_handler_verifier(
    ws: WebSocketUpgrade,
    State(prover_globals): State<ServerGlobals>,
) -> impl IntoResponse {
    info!("Received websocket request");
    ws.on_upgrade(move |socket| handle_socket_verifier(socket, prover_globals))
}

async fn handle_socket_prover(socket: WebSocket, prover_globals: ServerGlobals) {
    // Convert axum WebSocket to tungstenite WebSocketStream
    let socket = socket.into_inner();
    let socket = WsStream::new(socket);

    let result = prover(socket, &prover_globals.server_url).await;
    match result {
        Ok(()) => {
            info!("============================================");
            info!("Proving successful!");
            info!("============================================");
        }
        Err(err) => {
            error!("Proving failed: {err}");
        }
    }
}

async fn handle_socket_verifier(socket: WebSocket, prover_globals: ServerGlobals) {
    let stream = WsStream::new(socket.into_inner());

    match verifier(stream, &prover_globals.server_domain).await {
        Ok((sent, received)) => {
            info!("Successfully verified {}", &prover_globals.server_domain);
            info!("Verified sent data:\n{}", sent,);
            println!("Verified received data:\n{received}",);
        }
        Err(err) => {
            error!("Failed verification using websocket: {err}");
        }
    }
}
