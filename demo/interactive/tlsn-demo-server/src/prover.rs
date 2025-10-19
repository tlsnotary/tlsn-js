use http_body_util::Empty;
use hyper::{body::Bytes, Request, StatusCode, Uri};
use hyper_util::rt::TokioIo;
use rangeset::RangeSet;
use spansy::{
    http::parse_response,
    json::{self},
    Spanned,
};

use crate::config::{MAX_RECV_DATA, MAX_SENT_DATA, SECRET};
use tlsn::config::ProtocolConfig;
use tlsn::connection::ServerName;
use tlsn::prover::{ProveConfig, ProveConfigBuilder, Prover, ProverConfig};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio_util::compat::{FuturesAsyncReadCompatExt, TokioAsyncReadCompatExt};
use tracing::{debug, info};

pub async fn prover<T: AsyncWrite + AsyncRead + Send + Unpin + 'static>(
    verifier_socket: T,
    server_uri: &Uri,
) -> Result<(), eyre::ErrReport> {
    debug!("Starting proving...");

    assert_eq!(server_uri.scheme().unwrap().as_str(), "https");
    let server_domain = server_uri.authority().unwrap().host();
    let server_port = server_uri.port_u16().unwrap_or(443);

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
        .uri(server_uri.clone())
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
    
        info!(
        "server signature: {:?}",
        prover.tls_transcript().server_signature().unwrap().scheme,
    );
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