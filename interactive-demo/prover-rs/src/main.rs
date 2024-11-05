use async_tungstenite::{tokio::connect_async_with_config, tungstenite::protocol::WebSocketConfig};
use http_body_util::Empty;
use hyper::{body::Bytes, Request, StatusCode, Uri};
use hyper_util::rt::TokioIo;
use regex::Regex;
use tlsn_common::config::ProtocolConfig;
use tlsn_core::transcript::Idx;
use tlsn_prover::{state::Prove, Prover, ProverConfig};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};
use tracing::{debug, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use ws_stream_tungstenite::WsStream;

const TRACING_FILTER: &str = "INFO";

const VERIFIER_HOST: &str = "localhost";
const VERIFIER_PORT: u16 = 9816;
// Maximum number of bytes that can be sent from prover to server
const MAX_SENT_DATA: usize = 1 << 12;
// Maximum number of bytes that can be received by prover from server
const MAX_RECV_DATA: usize = 1 << 14;

const SECRET: &str = "TLSNotary's private key 🤡";
/// Make sure the following url's domain is the same as SERVER_DOMAIN on the verifier side
const SERVER_URL: &str = "https://swapi.dev/api/people/1";

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| TRACING_FILTER.into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    run_prover(VERIFIER_HOST, VERIFIER_PORT, SERVER_URL).await;
}

async fn run_prover(verifier_host: &str, verifier_port: u16, server_uri: &str) {
    info!("Sending websocket request...");
    let request = http::Request::builder()
        .uri(format!("ws://{}:{}/verify", verifier_host, verifier_port,))
        .header("Host", verifier_host)
        .header("Sec-WebSocket-Key", uuid::Uuid::new_v4().to_string())
        .header("Sec-WebSocket-Version", "13")
        .header("Connection", "Upgrade")
        .header("Upgrade", "Websocket")
        .body(())
        .unwrap();

    let (verifier_ws_stream, _) =
        connect_async_with_config(request, Some(WebSocketConfig::default()))
            .await
            .unwrap();

    info!("Websocket connection established!");
    let verifier_ws_socket = WsStream::new(verifier_ws_stream);
    prover(verifier_ws_socket, server_uri).await;
    info!("Proving is successful!");
}

async fn prover<T: AsyncWrite + AsyncRead + Send + Unpin + 'static>(verifier_socket: T, uri: &str) {
    debug!("Starting proving...");

    let uri = uri.parse::<Uri>().unwrap();
    assert_eq!(uri.scheme().unwrap().as_str(), "https");
    let server_domain = uri.authority().unwrap().host();
    let server_port = uri.port_u16().unwrap_or(443);

    // Create prover and connect to verifier.
    //
    // Perform the setup phase with the verifier.
    let prover = Prover::new(
        ProverConfig::builder()
            .server_name(server_domain)
            .protocol_config(
                ProtocolConfig::builder()
                    .max_sent_data(MAX_SENT_DATA)
                    .max_recv_data(MAX_RECV_DATA)
                    .build()
                    .unwrap(),
            )
            .build()
            .unwrap(),
    )
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

    // Wrap the connection in a TokioIo compatibility layer to use it with hyper.
    let mpc_tls_connection = TokioIo::new(mpc_tls_connection.compat());

    // Spawn the Prover to run in the background.
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
    let mut prover = prover_task.await.unwrap().unwrap().start_prove();

    let idx_sent = redact_and_reveal_sent_data(&mut prover);
    let idx_recv = redact_and_reveal_received_data(&mut prover);

    // Reveal parts of the transcript
    prover.prove_transcript(idx_sent, idx_recv).await.unwrap();

    // Finalize.
    prover.finalize().await.unwrap()
}

/// Redacts and reveals received data to the verifier.
fn redact_and_reveal_received_data(prover: &mut Prover<Prove>) -> Idx {
    let recv_transcript = prover.transcript().received();
    let recv_transcript_len = recv_transcript.len();

    // Get the homeworld from the received data.
    let received_string = String::from_utf8(recv_transcript.to_vec()).unwrap();
    debug!("Received data: {}", received_string);
    let re = Regex::new(r#""homeworld"\s?:\s?"(.*?)""#).unwrap();
    let homeworld_match = re.captures(&received_string).unwrap().get(1).unwrap();

    // Reveal everything except for the homeworld.
    let start = homeworld_match.start();
    let end = homeworld_match.end();
    Idx::new([0..start, end..recv_transcript_len])
}

/// Redacts and reveals sent data to the verifier.
fn redact_and_reveal_sent_data(prover: &mut Prover<Prove>) -> Idx {
    let sent_transcript = prover.transcript().sent();
    let sent_transcript_len = sent_transcript.len();

    let sent_string: String = String::from_utf8(sent_transcript.to_vec()).unwrap();
    let secret_start = sent_string.find(SECRET).unwrap();

    debug!("Send data: {}", sent_string);

    // Reveal everything except for the SECRET.
    Idx::new([
        0..secret_start,
        secret_start + SECRET.len()..sent_transcript_len,
    ])
}
