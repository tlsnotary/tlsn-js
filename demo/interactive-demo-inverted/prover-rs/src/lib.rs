use axum::{
    extract::{Request, State},
    response::IntoResponse,
    routing::get,
    Router,
};
use axum_websocket::{WebSocket, WebSocketUpgrade};
use eyre::eyre;
use http_body_util::Empty;
use hyper::{body::Bytes, body::Incoming, server::conn::http1, StatusCode, Uri};
use hyper_util::rt::TokioIo;
use rangeset::RangeSet;
use spansy::{
    http::parse_response,
    json::{self},
    Spanned,
};
use std::{
    net::{IpAddr, SocketAddr},
    sync::Arc,
};
use tlsn::{
    config::ProtocolConfig,
    connection::ServerName,
    prover::{ProveConfig, ProveConfigBuilder, Prover, ProverConfig},
};
use tokio::{
    io::{AsyncRead, AsyncWrite},
    net::TcpListener,
};
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};
use tower_service::Service;
use tracing::{debug, error, info};
use ws_stream_tungstenite::WsStream;

mod axum_websocket;

// Maximum number of bytes that can be sent from prover to server
const MAX_SENT_DATA: usize = 2048;
// Maximum number of bytes that can be received by prover from server
const MAX_RECV_DATA: usize = 4096;

const SECRET: &str = "TLSNotary's private key 🤡";

/// Global data that needs to be shared with the axum handlers
#[derive(Clone, Debug)]
struct ProverGlobals {
    pub server_url: String,
}

pub async fn run_server(
    prover_host: &str,
    prover_port: u16,
    server_url: &str,
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
        .route("/prove", get(ws_handler))
        .with_state(ProverGlobals {
            server_url: server_url.to_string(),
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

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(prover_globals): State<ProverGlobals>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, prover_globals))
}

async fn handle_socket(socket: WebSocket, prover_globals: ProverGlobals) {
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

async fn prover<T: AsyncWrite + AsyncRead + Send + Unpin + 'static>(
    verifier_socket: T,
    server_uri: &str,
) -> Result<(), eyre::ErrReport> {
    debug!("Starting proving...");

    let uri = server_uri.parse::<Uri>().unwrap();
    assert_eq!(uri.scheme().unwrap().as_str(), "https");
    let server_domain = uri.authority().unwrap().host();
    let server_port = uri.port_u16().unwrap_or(443);

    // Create prover and connect to verifier.
    let prover_config = ProverConfig::builder()
        .server_name(ServerName::Dns(server_domain.try_into().unwrap()))
        .protocol_config(
            ProtocolConfig::builder()
                .max_sent_data(MAX_SENT_DATA)
                .max_recv_data(MAX_RECV_DATA)
                .build()
                .unwrap(),
        )
        .build()
        .unwrap();

    // Perform the setup phase with the verifier.
    let prover = Prover::new(prover_config)
        .setup(verifier_socket.compat())
        .await
        .unwrap();

    // Connect to TLS Server.
    let tls_client_socket = tokio::net::TcpStream::connect((server_domain, server_port))
        .await
        .unwrap();

    // Pass server connection into the prover.
    let (mpc_tls_connection, prover_fut) =
        prover.connect(tls_client_socket.compat()).await.unwrap();
    let mpc_tls_connection = TokioIo::new(mpc_tls_connection.compat());

    // Spawn the prover task to be run concurrently in the background.
    let prover_task = tokio::spawn(prover_fut);

    // MPC-TLS Handshake.
    let (mut request_sender, connection) =
        hyper::client::conn::http1::handshake(mpc_tls_connection)
            .await
            .unwrap();

    tokio::spawn(connection);

    // MPC-TLS: Send Request and wait for Response.
    info!("Send Request and wait for Response");
    let request = Request::builder()
        .uri(uri.clone())
        .header("Host", server_domain)
        .header("Connection", "close")
        .header("Secret", SECRET)
        .method("GET")
        .body(Empty::<Bytes>::new())
        .unwrap();
    let response = request_sender.send_request(request).await.unwrap();

    debug!("TLS response: {:?}", response);
    assert!(response.status() == StatusCode::OK);

    // Create proof for the Verifier.
    let mut prover = prover_task.await.unwrap().unwrap();

    let mut builder: ProveConfigBuilder<'_> = ProveConfig::builder(prover.transcript());

    // Reveal the DNS name.
    builder.server_identity();

    let sent_rangeset = redact_and_reveal_sent_data(prover.transcript().sent());
    let _ = builder.reveal_sent(&sent_rangeset);

    let recv_rangeset = redact_and_reveal_received_data(prover.transcript().received());
    let _ = builder.reveal_recv(&recv_rangeset);

    let config = builder.build().unwrap();

    prover.prove(&config).await.unwrap();
    prover.close().await.unwrap();

    Ok(())
}

/// Redacts and reveals received data to the verifier.
fn redact_and_reveal_received_data(recv_transcript: &[u8]) -> RangeSet<usize> {
    // Get the some information from the received data.
    let received_string = String::from_utf8(recv_transcript.to_vec()).unwrap();
    debug!("Received data: {}", received_string);
    let resp = parse_response(recv_transcript).unwrap();
    let body = resp.body.unwrap();
    let mut json = json::parse_slice(body.as_bytes()).unwrap();
    json.offset(body.content.span().indices().min().unwrap());

    let name = json.get("information.name").expect("name field not found");

    let street = json
        .get("information.address.street")
        .expect("street field not found");

    let name_start = name.span().indices().min().unwrap() - 9; // 9 is the length of "name: "
    let name_end = name.span().indices().max().unwrap() + 1; // include `"`
    let street_start = street.span().indices().min().unwrap() - 11; // 11 is the length of "street: "
    let street_end = street.span().indices().max().unwrap() + 1; // include `"`

    [name_start..name_end + 1, street_start..street_end + 1].into()
}

/// Redacts and reveals sent data to the verifier.
fn redact_and_reveal_sent_data(sent_transcript: &[u8]) -> RangeSet<usize> {
    let sent_transcript_len = sent_transcript.len();

    let sent_string: String = String::from_utf8(sent_transcript.to_vec()).unwrap();
    let secret_start = sent_string.find(SECRET).unwrap();

    debug!("Send data: {}", sent_string);

    // Reveal everything except for the SECRET.
    [
        0..secret_start,
        secret_start + SECRET.len()..sent_transcript_len,
    ]
    .into()
}
