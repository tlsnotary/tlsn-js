use crate::hyper_io::FuturesIo;
use crate::request_opt::InteractiveRequestOptions;
pub use crate::request_opt::VerifyResult;
use crate::requests::{ClientType, NotarizationSessionRequest, NotarizationSessionResponse};
use crate::{fetch_as_json_string, setup_tracing_web};
use futures::channel::oneshot;
use futures::AsyncWriteExt;
use http_body_util::{BodyExt, Empty, Full};
use hyper::{body::Bytes, Request, StatusCode, Uri};
use js_sys::Array;
use regex::Regex;
use std::ops::Range;
use strum::EnumMessage;
use tlsn_core::proof::TlsProof;
use tlsn_core::{proof::SessionInfo, Direction, RedactedTranscript};
use tlsn_prover::tls::{state::Prove, Prover, ProverConfig};
use tracing::instrument;
use url::Url;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
pub use wasm_bindgen_rayon::init_thread_pool;
use web_sys::{Headers, RequestInit, RequestMode};
use web_time::Instant;
use ws_stream_wasm::*;

use tracing::{debug, info};

const SECRET: &str = "TLSNotary's private key 🤡";

#[tracing::instrument]
#[wasm_bindgen]
pub async fn interactive_prover(
    url: String,
    val: JsValue,
) -> Result<String, JsValue> {
    let url = url.parse::<Uri>().unwrap();
    assert_eq!(url.scheme().unwrap().as_str(), "https");
    let server_domain = url.authority().unwrap().host();

    let options: InteractiveRequestOptions = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Could not deserialize options: {:?}", e)))?;

    info!(
        "Interactive proof: {}, {}, {} ,{} ",
        options.websocket_proxy_url, options.verifier_proxy_url, url, options.id
    );

    let test = format!("{}/verify", options.verifier_proxy_url);
    let (_, verifier_ws_stream) = WsMeta::connect(test, None)
        .await
        .expect_throw("assume the verifier ws connection succeeds");
    let verifier_ws_stream_into = verifier_ws_stream.into_io();

    // Create prover and connect to verifier.
    let prover = Prover::new(
        ProverConfig::builder()
            .id(options.id)
            .server_dns(server_domain)
            .build()
            .unwrap(),
    )
    .setup(verifier_ws_stream_into)
    .await
    .unwrap();

    // Connect to TLS Server.
    debug!("Connect to websocket proxy {}", options.websocket_proxy_url);
    let (_, client_ws_stream) = WsMeta::connect(options.websocket_proxy_url, None)
        .await
        .expect_throw("assume the client ws connection succeeds");
    let (mpc_tls_connection, prover_fut) =
        prover.connect(client_ws_stream.into_io()).await.unwrap();
    let mpc_tls_connection = unsafe { FuturesIo::new(mpc_tls_connection) };
    let (prover_sender, prover_receiver) = oneshot::channel();
    let handled_prover_fut = async {
        let result = prover_fut.await;
        let _ = prover_sender.send(result);
    };
    spawn_local(handled_prover_fut);

    // Attach the hyper HTTP client to the TLS connection
    let (mut request_sender, connection) =
        hyper::client::conn::http1::handshake(mpc_tls_connection)
            .await
            .map_err(|e| JsValue::from_str(&format!("Could not handshake: {:?}", e)))?;

    // Spawn the HTTP task to be run concurrently
    let (connection_sender, connection_receiver) = oneshot::channel();
    let connection_fut = connection.without_shutdown();
    let handled_connection_fut = async {
        let result = connection_fut.await;
        let _ = connection_sender.send(result);
    };
    spawn_local(handled_connection_fut);

    // MPC-TLS: Send Request and wait for Response.
    let mut req = Request::builder()
        .uri(url.clone())
        .method("GET")
        .header("Host", server_domain)
        .header("Connection", "close")
        .header("Secret", SECRET);

    for (key, value) in options.headers {
        info!("adding header: {} - {}", key.as_str(), value.as_str());
        req = req.header(key.as_str(), value.as_str());
    }

    let req_with_body = req.body(Full::new(Bytes::default()));

    let unwrapped_request = req_with_body
        .map_err(|e| JsValue::from_str(&format!("Could not build request: {:?}", e)))?;

    let response = request_sender.send_request(unwrapped_request).await.unwrap();

    assert!(response.status() == StatusCode::OK);

    // Close TLS Connection.
    // let mut client_socket = connection_receiver
    //     .await
    //     .map_err(|e| {
    //         JsValue::from_str(&format!(
    //             "Could not receive from connection_receiver: {:?}",
    //             e
    //         ))
    //     })?
    //     .map_err(|e| JsValue::from_str(&format!("Could not get TlsConnection: {:?}", e)))?
    //     .io
    //     .into_inner();
    // client_socket
    //     .close()
    //     .await
    //     .map_err(|e| JsValue::from_str(&format!("Could not close socket: {:?}", e)))?;

    // Create proof for the Verifier.
    let prover = prover_receiver
        .await
        .map_err(|e| {
            JsValue::from_str(&format!("Could not receive from prover_receiver: {:?}", e))
        })?
        .map_err(|e| JsValue::from_str(&format!("Could not get Prover: {:?}", e)))?;
    let mut prover = prover.start_prove();
    redact_and_reveal_sent_data(&mut prover);
    redact_and_reveal_received_data(&mut prover);
    prover.prove().await.unwrap();

    // Finalize.
    let _ = prover.finalize().await;

    Ok(r#"{"result": "success"}"#.to_string())
}

/// Redacts and reveals received data to the verifier.
fn redact_and_reveal_received_data(prover: &mut Prover<Prove>) {
    let recv_transcript_len = prover.recv_transcript().data().len();

    // Get the homeworld from the received data.
    let received_string = String::from_utf8(prover.recv_transcript().data().to_vec()).unwrap();
    debug!("Received data: {}", received_string);
    let re = Regex::new(r#""homeworld"\s?:\s?"(.*?)""#).unwrap();
    let commit_hash_match = re.captures(&received_string).unwrap().get(1).unwrap();

    // Reveal everything except for the commit hash.
    _ = prover.reveal(0..commit_hash_match.start(), Direction::Received);
    _ = prover.reveal(
        commit_hash_match.end()..recv_transcript_len,
        Direction::Received,
    );
}

/// Redacts and reveals sent data to the verifier.
fn redact_and_reveal_sent_data(prover: &mut Prover<Prove>) {
    let sent_transcript_len = prover.sent_transcript().data().len();

    let sent_string = String::from_utf8(prover.sent_transcript().data().to_vec()).unwrap();
    let secret_start = sent_string.find(SECRET).unwrap();
    debug!("Send data: {}", sent_string);

    // Reveal everything except for the SECRET.
    _ = prover.reveal(0..secret_start, Direction::Sent);
    _ = prover.reveal(
        secret_start + SECRET.len()..sent_transcript_len,
        Direction::Sent,
    );
}
