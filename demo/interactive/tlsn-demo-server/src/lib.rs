use axum::{
    extract::{Request, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum_websocket::{WebSocket, WebSocketUpgrade};
use eyre::eyre;
use http::Uri;
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
pub mod config;
pub mod prover;
pub mod verifier;
use prover::prover;
use verifier::verifier;

/// Global data that needs to be shared with the axum handlers
#[derive(Clone, Debug)]
struct ServerGlobals {
    pub server_uri: Uri,
}

/// Enum to differentiate between prover and verifier socket handling
#[derive(Clone, Debug)]
enum SocketType {
    Prover,
    Verifier,
}

pub async fn run_ws_server(config: &config::Config) -> Result<(), eyre::ErrReport> {
    let ws_server_address = SocketAddr::new(
        IpAddr::V4(config.ws_host.parse().map_err(|err| {
            eyre!("Failed to parse websocket host address from server config: {err}")
        })?),
        config.ws_port,
    );
    let listener = TcpListener::bind(ws_server_address)
        .await
        .map_err(|err| eyre!("Failed to bind server address to tcp listener: {err}"))?;

    info!("Listening for TCP traffic at {}", ws_server_address);

    let protocol = Arc::new(http1::Builder::new());
    let router = Router::new()
        .route(
            "/prove",
            get(|ws, state| ws_handler(ws, state, SocketType::Prover)),
        )
        .route(
            "/verify",
            get(|ws, state| ws_handler(ws, state, SocketType::Verifier)),
        )
        .with_state(ServerGlobals {
            server_uri: config.server_uri.clone(),
        });

    loop {
        let stream = match listener.accept().await {
            Ok((stream, _)) => stream,
            Err(err) => {
                error!("Failed to accept TCP connection: {err}");
                continue;
            }
        };
        debug!("Received TCP connection");

        let tower_service = router.clone();
        let protocol = protocol.clone();

        tokio::spawn(async move {
            info!("Accepted TCP connection");
            // Reference: https://github.com/tokio-rs/axum/blob/5201798d4e4d4759c208ef83e30ce85820c07baa/examples/low-level-rustls/src/main.rs#L67-L80
            let io = TokioIo::new(stream);
            let hyper_service = hyper::service::service_fn(move |request: Request<Incoming>| {
                tower_service.clone().call(request)
            });
            // Serve different requests using the same hyper protocol and axum router
            if let Err(err) = protocol
                .serve_connection(io, hyper_service)
                // use with_upgrades to upgrade connection to websocket for websocket clients
                // and to extract tcp connection for tcp clients
                .with_upgrades()
                .await
            {
                error!("Connection serving failed: {err}");
            }
        });
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(globals): State<ServerGlobals>,
    socket_type: SocketType,
) -> impl IntoResponse {
    let operation = match socket_type {
        SocketType::Prover => "proving",
        SocketType::Verifier => "verification",
    };
    info!("Received websocket request for {}", operation);
    ws.on_upgrade(move |socket| handle_socket(socket, globals, socket_type))
}

async fn handle_socket(socket: WebSocket, globals: ServerGlobals, socket_type: SocketType) {
    let stream = WsStream::new(socket.into_inner());

    async fn handle_operation_result<T>(
        result: Result<T, eyre::ErrReport>,
        operation: &str,
        on_success: impl FnOnce(T),
    ) {
        match result {
            Ok(value) => {
                info!("============================================");
                info!("{} successful!", operation);
                info!("============================================");
                on_success(value);
            }
            Err(err) => {
                error!("{} failed: {err}", operation);
            }
        }
    }

    match socket_type {
        SocketType::Prover => {
            let result = prover(stream, &globals.server_uri).await;
            handle_operation_result(result, "Proving", |_| {}).await;
        }
        SocketType::Verifier => {
            let domain = globals
                .server_uri
                .authority()
                .ok_or_else(|| error!("Failed to extract domain from server URI"))
                .unwrap()
                .host();

            let result = verifier(stream, domain).await;
            handle_operation_result(result, "Verification", |(sent, received)| {
                info!("Successfully verified {}", domain);
                info!("Verified sent data:\n{}", sent);
                info!("Verified received data:\n{}", received);
            })
            .await;
        }
    }
}
