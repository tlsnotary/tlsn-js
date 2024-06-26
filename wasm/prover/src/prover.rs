use anyhow::bail;
use futures::AsyncWriteExt;
use gloo_net::http::{Headers, Request as BrowserRequest};
use std::ops::Range;
use tlsn_prover::tls::{Prover, ProverConfig};
use web_time::Instant;

use ws_stream_wasm::*;

use crate::hyper_io::FuturesIo;
use crate::request_opt::RequestOptions;
use crate::requests::{ClientType, NotarizationSessionRequest, NotarizationSessionResponse};
use crate::{spawn_rayon_with_handle, spawn_with_handle};

pub use wasm_bindgen_rayon::init_thread_pool;

pub use crate::request_opt::VerifyResult;
use http_body_util::{BodyExt, Full};
use hyper::{body::Bytes, Request, StatusCode};

use strum::EnumMessage;
use tlsn_core::proof::TlsProof;
use url::Url;
use wasm_bindgen::prelude::*;
use web_sys::RequestMode;

use tracing::{debug, info};

type Result<T, Error = JsError> = std::result::Result<T, Error>;

trait Io: futures::AsyncRead + futures::AsyncWrite + Send + Unpin + 'static {}
impl<T> Io for T where T: futures::AsyncRead + futures::AsyncWrite + Send + Unpin + 'static {}

#[derive(strum_macros::EnumMessage, Debug, Clone, Copy)]
#[allow(dead_code)]
enum ProverPhases {
    #[strum(message = "Connect application server with websocket proxy")]
    ConnectWsProxy,
    #[strum(message = "Build prover config")]
    BuildProverConfig,
    #[strum(message = "Set up prover")]
    SetUpProver,
    #[strum(message = "Bind the prover to the server connection")]
    BindProverToConnection,
    #[strum(message = "Spawn the prover thread")]
    SpawnProverThread,
    #[strum(message = "Attach the hyper HTTP client to the TLS connection")]
    AttachHttpClient,
    #[strum(message = "Spawn the HTTP task to be run concurrently")]
    SpawnHttpTask,
    #[strum(message = "Build request")]
    BuildRequest,
    #[strum(message = "Start MPC-TLS connection with the server")]
    StartMpcConnection,
    #[strum(message = "Received response from the server")]
    ReceivedResponse,
    #[strum(message = "Parsing response from the server")]
    ParseResponse,
    #[strum(message = "Close the connection to the server")]
    CloseConnection,
    #[strum(message = "Start notarization")]
    StartNotarization,
    #[strum(message = "Commit to data")]
    Commit,
    #[strum(message = "Finalize")]
    Finalize,
    #[strum(message = "Notarization complete")]
    NotarizationComplete,
    #[strum(message = "Create Proof")]
    CreateProof,
}

fn log_phase(phase: ProverPhases) {
    info!("tlsn-js {}: {}", phase as u8, phase.get_message().unwrap());
}

#[wasm_bindgen]
pub async fn prover(
    target_url_str: &str,
    val: JsValue,
    secret_headers: JsValue,
    secret_body: JsValue,
) -> Result<String, JsError> {
    debug!("target_url: {}", target_url_str);
    let target_url = Url::parse(target_url_str)?;
    let target_host = target_url
        .host()
        .ok_or(JsError::new("target url missing host"))?
        .to_string();

    debug!("target_url.host: {}", &target_host);

    let options: RequestOptions = serde_wasm_bindgen::from_value(val)?;
    debug!("options.notary_url: {}", options.notary_url.as_str());

    let secret_headers: Vec<String> = serde_wasm_bindgen::from_value(secret_headers)?;
    let secret_body: Vec<String> = serde_wasm_bindgen::from_value(secret_body)?;

    let start_time = Instant::now();

    let proof = spawn_rayon_with_handle(move || async move {
        let (session_id, notary_io) = connect_notary(
            &options.notary_url,
            options.max_sent_data,
            options.max_recv_data,
        )
        .await?;

        // Basic default prover config
        let mut builder = ProverConfig::builder();

        builder.id(session_id).server_dns(target_host);

        if let Some(max_sent_data) = options.max_sent_data {
            builder.max_sent_data(max_sent_data);
        }
        if let Some(max_recv_data) = options.max_recv_data {
            builder.max_recv_data(max_recv_data);
        }

        let prover = Prover::new(builder.build()?).setup(notary_io).await?;

        let (_, server_io) = WsMeta::connect(&options.websocket_proxy_url, None)
            .await
            .expect_throw("assume the client ws connection succeeds");

        let (tls_connection, prover_fut) = prover.connect(server_io.into_io()).await?;
        let tls_connection = unsafe { FuturesIo::new(tls_connection) };

        let prover_ctrl = prover_fut.control();

        log_phase(ProverPhases::SpawnProverThread);
        let prover_handle = spawn_with_handle(prover_fut);

        // Attach the hyper HTTP client to the TLS connection
        log_phase(ProverPhases::AttachHttpClient);
        let (mut request_sender, connection) =
            hyper::client::conn::http1::handshake(tls_connection).await?;

        // Spawn the HTTP task to be run concurrently
        log_phase(ProverPhases::SpawnHttpTask);
        let connection_handle = spawn_with_handle(connection.without_shutdown());

        log_phase(ProverPhases::BuildRequest);
        let mut req_with_header = Request::builder()
            .uri(target_url.as_str())
            .method(options.method.as_str());

        for (key, value) in &options.headers {
            info!("adding header: {} - {}", key.as_str(), value.as_str());
            req_with_header = req_with_header.header(key.as_str(), value.as_str());
        }

        let req_with_body = if options.body.is_empty() {
            info!("empty body");
            req_with_header.body(Full::new(Bytes::default()))
        } else {
            info!("added body - {}", options.body.as_str());
            req_with_header.body(Full::from(options.body.clone()))
        };

        let unwrapped_request = req_with_body?;

        log_phase(ProverPhases::StartMpcConnection);

        // Defer decryption of the response.
        prover_ctrl.defer_decryption().await?;

        // Send the request to the Server and get a response via the MPC TLS connection
        let response = request_sender.send_request(unwrapped_request).await?;

        log_phase(ProverPhases::ReceivedResponse);
        if response.status() != StatusCode::OK {
            bail!("Response status is not OK: {:?}", response.status());
        }

        log_phase(ProverPhases::ParseResponse);
        // Pretty printing :)
        let payload = response.into_body().collect().await?.to_bytes();
        let parsed = serde_json::from_str::<serde_json::Value>(&String::from_utf8_lossy(&payload))?;
        let response_pretty = serde_json::to_string_pretty(&parsed)?;
        info!("Response: {}", response_pretty);

        // Close the connection to the server
        log_phase(ProverPhases::CloseConnection);
        let mut tls_connection = connection_handle.await?.io.into_inner();
        tls_connection.close().await?;

        // The Prover task should be done now, so we can grab it.
        log_phase(ProverPhases::StartNotarization);
        let prover = prover_handle.await?;
        let mut prover = prover.start_notarize();

        let secret_headers_slices: Vec<&[u8]> = secret_headers
            .iter()
            .map(|header| header.as_bytes())
            .collect();

        // Identify the ranges in the transcript that contain revealed_headers
        let (sent_public_ranges, sent_private_ranges) = find_ranges(
            prover.sent_transcript().data(),
            secret_headers_slices.as_slice(),
        );

        let secret_body_slices: Vec<&[u8]> =
            secret_body.iter().map(|body| body.as_bytes()).collect();

        // Identify the ranges in the transcript that contain the only data we want to reveal later
        let (recv_public_ranges, recv_private_ranges) = find_ranges(
            prover.recv_transcript().data(),
            secret_body_slices.as_slice(),
        );

        log_phase(ProverPhases::Commit);

        let _recv_len = prover.recv_transcript().data().len();

        let builder = prover.commitment_builder();

        // Commit to the outbound and inbound transcript, isolating the data that contain secrets
        let sent_pub_commitment_ids = sent_public_ranges
            .iter()
            .map(|range| builder.commit_sent(range))
            .collect::<Result<Vec<_>, _>>()?;

        sent_private_ranges
            .iter()
            .try_for_each(|range| builder.commit_sent(range).map(|_| ()))?;

        let recv_pub_commitment_ids = recv_public_ranges
            .iter()
            .map(|range| builder.commit_recv(range))
            .collect::<Result<Vec<_>, _>>()?;

        recv_private_ranges
            .iter()
            .try_for_each(|range| builder.commit_recv(range).map(|_| ()))?;

        // Finalize, returning the notarized session
        log_phase(ProverPhases::Finalize);
        let notarized_session = prover.finalize().await?;

        log_phase(ProverPhases::NotarizationComplete);

        // Create a proof for all committed data in this session
        log_phase(ProverPhases::CreateProof);
        let session_proof = notarized_session.session_proof();

        let mut proof_builder = notarized_session.data().build_substrings_proof();

        // Reveal everything except the redacted stuff (which for the response it's everything except the screen_name)
        sent_pub_commitment_ids
            .iter()
            .chain(recv_pub_commitment_ids.iter())
            .try_for_each(|id| proof_builder.reveal_by_id(*id).map(|_| ()))?;

        let substrings_proof = proof_builder.build()?;

        let proof = TlsProof {
            session: session_proof,
            substrings: substrings_proof,
        };

        Ok::<_, anyhow::Error>(proof)
    })
    .await
    .map_err(|e| JsError::new(&e.to_string()))?;

    let res = serde_json::to_string_pretty(&proof)?;

    let duration = start_time.elapsed();

    info!("!@# request took {} seconds", duration.as_secs());

    Ok(res)
}

async fn connect_notary(
    url: &str,
    max_sent_data: Option<usize>,
    max_recv_data: Option<usize>,
) -> Result<(String, impl Io), anyhow::Error> {
    // set headers
    let notary_url = Url::parse(url)?;
    let notary_ssl = notary_url.scheme() == "https" || notary_url.scheme() == "wss";
    let notary_host = notary_url.authority();
    let notary_path = notary_url.path();
    let notary_path_str = if notary_path == "/" { "" } else { notary_path };

    let headers = Headers::new();
    headers.append("Host", notary_host);
    headers.append("Content-Type", "application/json");

    let response = BrowserRequest::post(url)
        .mode(RequestMode::Cors)
        .headers(headers)
        .body(serde_json::to_string(&NotarizationSessionRequest {
            client_type: ClientType::Websocket,
            max_sent_data,
            max_recv_data,
        })?)?
        .send()
        .await?;

    let payload: NotarizationSessionResponse = response.json().await?;
    debug!("Notarization response: {:?}", &payload);

    let notary_wss_url = format!(
        "{}://{}{}/notarize?sessionId={}",
        if notary_ssl { "wss" } else { "ws" },
        notary_host,
        notary_path_str,
        &payload.session_id
    );

    let (_, notary_ws_stream) = WsMeta::connect(notary_wss_url, None)
        .await
        .expect_throw("assume the notary ws connection succeeds");

    Ok((payload.session_id, notary_ws_stream.into_io()))
}

/// Find the ranges of the public and private parts of a sequence.
///
/// Returns a tuple of `(public, private)` ranges.
fn find_ranges(seq: &[u8], private_seq: &[&[u8]]) -> (Vec<Range<usize>>, Vec<Range<usize>>) {
    let mut private_ranges = Vec::new();
    for s in private_seq {
        for (idx, w) in seq.windows(s.len()).enumerate() {
            if w == *s {
                private_ranges.push(idx..(idx + w.len()));
            }
        }
    }

    let mut sorted_ranges = private_ranges.clone();
    sorted_ranges.sort_by_key(|r| r.start);

    let mut public_ranges = Vec::new();
    let mut last_end = 0;
    for r in sorted_ranges {
        if r.start > last_end {
            public_ranges.push(last_end..r.start);
        }
        last_end = r.end;
    }

    if last_end < seq.len() {
        public_ranges.push(last_end..seq.len());
    }

    (public_ranges, private_ranges)
}
