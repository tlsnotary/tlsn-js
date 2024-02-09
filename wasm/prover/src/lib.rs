mod request_opt;
mod requests;

use std::ops::Range;
use std::panic;
use web_time::Instant;

use futures::channel::oneshot;
use futures::AsyncWriteExt;
use hyper::{body::to_bytes, Body, Request, StatusCode};
use tlsn_prover::tls::{Prover, ProverConfig};

use tokio_util::compat::FuturesAsyncReadCompatExt;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;

use ws_stream_wasm::*;

use crate::request_opt::{RequestOptions, VerifyResult};
use crate::requests::{ClientType, NotarizationSessionRequest, NotarizationSessionResponse};

pub use wasm_bindgen_rayon::init_thread_pool;

use js_sys::{Array, JSON};
use url::Url;
use wasm_bindgen_futures::JsFuture;
use web_sys::{Headers, Request as WebsysRequest, RequestInit, RequestMode, Response};

use elliptic_curve::pkcs8::DecodePublicKey;
use std::time::Duration;
use tlsn_core::proof::{SessionProof, TlsProof};

// A macro to provide `println!(..)`-style syntax for `console.log` logging.
macro_rules! log {
    ( $( $t:tt )* ) => {
        web_sys::console::log_1(&format!( $( $t )* ).into());
    }
}

extern crate console_error_panic_hook;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = self)]
    fn fetch(request: &web_sys::Request) -> js_sys::Promise;
}

async fn fetch_as_json_string(url: &str, opts: &RequestInit) -> Result<String, JsValue> {
    let request = WebsysRequest::new_with_str_and_init(url, opts)?;
    let promise = fetch(&request);
    let future = JsFuture::from(promise);
    let resp_value = future.await?;
    let resp: Response = resp_value.dyn_into()?;
    let json = JsFuture::from(resp.json()?).await?;
    let stringified = JSON::stringify(&json)?;
    stringified
        .as_string()
        .ok_or_else(|| JsValue::from_str("Could not stringify JSON"))
}

#[wasm_bindgen]
pub async fn prover(
    target_url_str: &str,
    val: JsValue,
    secret_headers: JsValue,
    secret_body: JsValue,
) -> Result<String, JsValue> {
    log!("target_url: {}", target_url_str);
    let target_url = Url::parse(target_url_str)
        .map_err(|e| JsValue::from_str(&format!("Could not parse target_url: {:?}", e)))?;

    log!(
        "target_url.host: {}",
        target_url
            .host()
            .ok_or(JsValue::from_str("Could not get target host"))?
    );
    let options: RequestOptions = serde_wasm_bindgen::from_value(val)
        .map_err(|e| JsValue::from_str(&format!("Could not deserialize options: {:?}", e)))?;
    log!("done!");
    log!("options.notary_url: {}", options.notary_url.as_str());
    // let fmt_layer = tracing_subscriber::fmt::layer()
    // .with_ansi(false) // Only partially supported across browsers
    // .with_timer(UtcTime::rfc_3339()) // std::time is not available in browsers
    // .with_writer(MakeConsoleWriter); // write events to the console
    // let perf_layer = performance_layer()
    //     .with_details_from_fields(Pretty::default());

    // tracing_subscriber::registry()
    //     .with(tracing_subscriber::filter::LevelFilter::DEBUG)
    //     .with(fmt_layer)
    //     .with(perf_layer)
    //     .init(); // Install these as subscribers to tracing events

    // https://github.com/rustwasm/console_error_panic_hook
    panic::set_hook(Box::new(console_error_panic_hook::hook));

    let start_time = Instant::now();

    /*
     * Connect Notary with websocket
     */

    let mut opts = RequestInit::new();
    log!("method: {}", "POST");
    opts.method("POST");
    // opts.method("GET");
    opts.mode(RequestMode::Cors);

    // set headers
    let headers = Headers::new()
        .map_err(|e| JsValue::from_str(&format!("Could not create headers: {:?}", e)))?;
    let notary_url = Url::parse(options.notary_url.as_str())
        .map_err(|e| JsValue::from_str(&format!("Could not parse notary_url: {:?}", e)))?;
    let notary_ssl = notary_url.scheme() == "https" || notary_url.scheme() == "wss";
    let notary_host = notary_url.authority();

    headers
        .append("Host", notary_host)
        .map_err(|e| JsValue::from_str(&format!("Could not append Host header: {:?}", e)))?;
    headers
        .append("Content-Type", "application/json")
        .map_err(|e| {
            JsValue::from_str(&format!("Could not append Content-Type header: {:?}", e))
        })?;
    opts.headers(&headers);

    log!("notary_host: {}", notary_host);
    // set body
    let payload = serde_json::to_string(&NotarizationSessionRequest {
        client_type: ClientType::Websocket,
        max_transcript_size: Some(options.max_transcript_size),
    })
    .map_err(|e| JsValue::from_str(&format!("Could not serialize request: {:?}", e)))?;
    opts.body(Some(&JsValue::from_str(&payload)));

    // url
    let url = format!(
        "{}://{}/session",
        if notary_ssl { "https" } else { "http" },
        notary_host
    );
    log!("Request: {}", url);
    let rust_string = fetch_as_json_string(&url, &opts)
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not fetch session: {:?}", e)))?;
    let notarization_response =
        serde_json::from_str::<NotarizationSessionResponse>(&rust_string)
            .map_err(|e| JsValue::from_str(&format!("Could not deserialize response: {:?}", e)))?;
    log!("Response: {}", rust_string);

    log!("Notarization response: {:?}", notarization_response,);
    let notary_wss_url = format!(
        "{}://{}/notarize?sessionId={}",
        if notary_ssl { "wss" } else { "ws" },
        notary_host,
        notarization_response.session_id
    );
    let (_, notary_ws_stream) = WsMeta::connect(notary_wss_url, None)
        .await
        .expect_throw("assume the notary ws connection succeeds");
    let notary_ws_stream_into = notary_ws_stream.into_io();

    /*
       Connect Application Server with websocket proxy
    */

    let (_, client_ws_stream) = WsMeta::connect(options.websocket_proxy_url, None)
        .await
        .expect_throw("assume the client ws connection succeeds");
    let client_ws_stream_into = client_ws_stream.into_io();

    log!("!@# 0");

    let target_host = target_url
        .host_str()
        .ok_or(JsValue::from_str("Could not get target host"))?;
    // Basic default prover config
    let config = ProverConfig::builder()
        .id(notarization_response.session_id)
        .server_dns(target_host)
        .max_transcript_size(options.max_transcript_size)
        .build()
        .map_err(|e| JsValue::from_str(&format!("Could not build prover config: {:?}", e)))?;

    log!("!@# 1");

    // Create a Prover and set it up with the Notary
    // This will set up the MPC backend prior to connecting to the server.
    let prover = Prover::new(config)
        .setup(notary_ws_stream_into)
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not set up prover: {:?}", e)))?;

    // Bind the Prover to the server connection.
    // The returned `mpc_tls_connection` is an MPC TLS connection to the Server: all data written
    // to/read from it will be encrypted/decrypted using MPC with the Notary.
    let (mpc_tls_connection, prover_fut) = prover
        .connect(client_ws_stream_into)
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not connect prover: {:?}", e)))?;

    log!("!@# 3");

    // let prover_task = tokio::spawn(prover_fut);
    let (prover_sender, prover_receiver) = oneshot::channel();
    let handled_prover_fut = async {
        let result = prover_fut.await;
        let _ = prover_sender.send(result);
    };
    spawn_local(handled_prover_fut);
    log!("!@# 7");

    // Attach the hyper HTTP client to the TLS connection
    let (mut request_sender, connection) =
        hyper::client::conn::handshake(mpc_tls_connection.compat())
            .await
            .map_err(|e| JsValue::from_str(&format!("Could not handshake: {:?}", e)))?;
    log!("!@# 8");

    // Spawn the HTTP task to be run concurrently
    // let connection_task = tokio::spawn(connection.without_shutdown());
    let (connection_sender, connection_receiver) = oneshot::channel();
    let connection_fut = connection.without_shutdown();
    let handled_connection_fut = async {
        let result = connection_fut.await;
        let _ = connection_sender.send(result);
    };
    spawn_local(handled_connection_fut);
    log!(
        "!@# 9 - {} request to {}",
        options.method.as_str(),
        target_url_str
    );

    let mut req_with_header = Request::builder()
        .uri(target_url_str)
        .method(options.method.as_str());

    for (key, value) in options.headers {
        log!("adding header: {} - {}", key.as_str(), value.as_str());
        req_with_header = req_with_header.header(key.as_str(), value.as_str());
    }

    let req_with_body;

    if options.body.is_empty() {
        log!("empty body");
        req_with_body = req_with_header.body(Body::empty());
    } else {
        log!("added body - {}", options.body.as_str());
        req_with_body = req_with_header.body(Body::from(options.body));
    }

    let unwrapped_request = req_with_body
        .map_err(|e| JsValue::from_str(&format!("Could not build request: {:?}", e)))?;

    log!("Starting an MPC TLS connection with the server");

    // Send the request to the Server and get a response via the MPC TLS connection
    let response = request_sender
        .send_request(unwrapped_request)
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not send request: {:?}", e)))?;

    log!("Got a response from the server");

    if response.status() != StatusCode::OK {
        return Err(JsValue::from_str(&format!(
            "Response status is not OK: {:?}",
            response.status()
        )));
    }

    log!("Request OK");

    // Pretty printing :)
    let payload = to_bytes(response.into_body())
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not get response body: {:?}", e)))?
        .to_vec();
    let parsed = serde_json::from_str::<serde_json::Value>(&String::from_utf8_lossy(&payload))
        .map_err(|e| JsValue::from_str(&format!("Could not parse response: {:?}", e)))?;
    log!("!@# 10");
    let response_pretty = serde_json::to_string_pretty(&parsed)
        .map_err(|e| JsValue::from_str(&format!("Could not serialize response: {:?}", e)))?;
    log!("{}", response_pretty);
    log!("!@# 11");

    // Close the connection to the server
    // let mut client_socket = connection_task.await.unwrap().unwrap().io.into_inner();
    let mut client_socket = connection_receiver
        .await
        .map_err(|e| {
            JsValue::from_str(&format!(
                "Could not receive from connection_receiver: {:?}",
                e
            ))
        })?
        .map_err(|e| JsValue::from_str(&format!("Could not get TlsConnection: {:?}", e)))?
        .io
        .into_inner();
    log!("!@# 12");
    client_socket
        .close()
        .await
        .map_err(|e| JsValue::from_str(&format!("Could not close socket: {:?}", e)))?;
    log!("!@# 13");

    // The Prover task should be done now, so we can grab it.
    // let mut prover = prover_task.await.unwrap().unwrap();
    let prover = prover_receiver
        .await
        .map_err(|e| {
            JsValue::from_str(&format!("Could not receive from prover_receiver: {:?}", e))
        })?
        .map_err(|e| JsValue::from_str(&format!("Could not get Prover: {:?}", e)))?;
    let mut prover = prover.start_notarize();
    log!("!@# 14");

    let secret_headers_vecs = string_list_to_bytes_vec(&secret_headers)?;
    let secret_headers_slices: Vec<&[u8]> = secret_headers_vecs
        .iter()
        .map(|vec| vec.as_slice())
        .collect();

    // Identify the ranges in the transcript that contain revealed_headers
    let (sent_public_ranges, sent_private_ranges) = find_ranges(
        prover.sent_transcript().data(),
        secret_headers_slices.as_slice(),
    );

    let secret_body_vecs = string_list_to_bytes_vec(&secret_body)?;
    let secret_body_slices: Vec<&[u8]> =
        secret_body_vecs.iter().map(|vec| vec.as_slice()).collect();

    // Identify the ranges in the transcript that contain the only data we want to reveal later
    let (recv_public_ranges, recv_private_ranges) = find_ranges(
        prover.recv_transcript().data(),
        secret_body_slices.as_slice(),
    );
    log!("!@# 15");

    let _recv_len = prover.recv_transcript().data().len();

    let builder = prover.commitment_builder();

    // Commit to the outbound and inbound transcript, isolating the data that contain secrets
    let sent_pub_commitment_ids = sent_public_ranges
        .iter()
        .map(|range| {
            builder.commit_sent(range.clone()).map_err(|e| {
                JsValue::from_str(&format!("Error committing sent pub range: {:?}", e))
            })
        })
        .collect::<Result<Vec<_>, _>>()?;

    sent_private_ranges.iter().try_for_each(|range| {
        builder
            .commit_sent(range.clone())
            .map_err(|e| {
                JsValue::from_str(&format!("Error committing sent private range: {:?}", e))
            })
            .map(|_| ())
    })?;

    let recv_pub_commitment_ids = recv_public_ranges
        .iter()
        .map(|range| {
            builder.commit_recv(range.clone()).map_err(|e| {
                JsValue::from_str(&format!("Error committing recv public ranges: {:?}", e))
            })
        })
        .collect::<Result<Vec<_>, _>>()?;

    recv_private_ranges.iter().try_for_each(|range| {
        builder
            .commit_sent(range.clone())
            .map_err(|e| {
                JsValue::from_str(&format!("Error committing recv private range: {:?}", e))
            })
            .map(|_| ())
    })?;

    // Finalize, returning the notarized session
    let notarized_session = prover
        .finalize()
        .await
        .map_err(|e| JsValue::from_str(&format!("Error finalizing prover: {:?}", e)))?;

    log!("Notarization complete!");

    // Create a proof for all committed data in this session
    let session_proof = notarized_session.session_proof();

    let mut proof_builder = notarized_session.data().build_substrings_proof();

    // Reveal everything except the redacted stuff (which for the response it's everything except the screen_name)
    sent_pub_commitment_ids
        .iter()
        .chain(recv_pub_commitment_ids.iter())
        .try_for_each(|id| {
            proof_builder
                .reveal(*id)
                .map_err(|e| JsValue::from_str(&format!("Could not reveal commitment: {:?}", e)))
                .map(|_| ())
        })?;

    let substrings_proof = proof_builder
        .build()
        .map_err(|e| JsValue::from_str(&format!("Could not build proof: {:?}", e)))?;

    let proof = TlsProof {
        session: session_proof,
        substrings: substrings_proof,
    };

    let res = serde_json::to_string_pretty(&proof)
        .map_err(|e| JsValue::from_str(&format!("Could not serialize proof: {:?}", e)))?;

    let duration = start_time.elapsed();
    log!("!@# request takes: {} seconds", duration.as_secs());

    Ok(res)
}

#[wasm_bindgen]
pub async fn verify(proof: &str, notary_pubkey_str: &str) -> Result<String, JsValue> {
    log!("!@# proof {}", proof);
    let proof: TlsProof = serde_json::from_str(proof)
        .map_err(|e| JsValue::from_str(&format!("Could not deserialize proof: {:?}", e)))?;

    let TlsProof {
        // The session proof establishes the identity of the server and the commitments
        // to the TLS transcript.
        session,
        // The substrings proof proves select portions of the transcript, while redacting
        // anything the Prover chose not to disclose.
        substrings,
    } = proof;

    log!(
        "!@# notary_pubkey {}, {}",
        notary_pubkey_str,
        notary_pubkey_str.len()
    );
    session
        .verify_with_default_cert_verifier(get_notary_pubkey(notary_pubkey_str)?)
        .map_err(|e| JsValue::from_str(&format!("Session verification failed: {:?}", e)))?;

    let SessionProof {
        // The session header that was signed by the Notary is a succinct commitment to the TLS transcript.
        header,
        // This is the server name, checked against the certificate chain shared in the TLS handshake.
        server_name,
        ..
    } = session;

    // The time at which the session was recorded
    let time = chrono::DateTime::UNIX_EPOCH + Duration::from_secs(header.time());

    // Verify the substrings proof against the session header.
    //
    // This returns the redacted transcripts
    let (mut sent, mut recv) = substrings
        .verify(&header)
        .map_err(|e| JsValue::from_str(&format!("Could not verify substrings: {:?}", e)))?;

    // Replace the bytes which the Prover chose not to disclose with 'X'
    sent.set_redacted(b'X');
    recv.set_redacted(b'X');

    log!("-------------------------------------------------------------------");
    log!(
        "Successfully verified that the bytes below came from a session with {:?} at {}.",
        server_name,
        time
    );
    log!("Note that the bytes which the Prover chose not to disclose are shown as X.");
    log!("Bytes sent:");
    log!(
        "{}",
        String::from_utf8(sent.data().to_vec()).map_err(|e| JsValue::from_str(&format!(
            "Could not convert sent data to string: {:?}",
            e
        )))?
    );
    log!("Bytes received:");
    log!(
        "{}",
        String::from_utf8(recv.data().to_vec()).map_err(|e| JsValue::from_str(&format!(
            "Could not convert recv data to string: {:?}",
            e
        )))?
    );
    log!("-------------------------------------------------------------------");

    let result = VerifyResult {
        server_name: String::from(server_name.as_str()),
        time: header.time(),
        sent: String::from_utf8(sent.data().to_vec()).map_err(|e| {
            JsValue::from_str(&format!("Could not convert sent data to string: {:?}", e))
        })?,
        recv: String::from_utf8(recv.data().to_vec()).map_err(|e| {
            JsValue::from_str(&format!("Could not convert recv data to string: {:?}", e))
        })?,
    };
    let res = serde_json::to_string_pretty(&result)
        .map_err(|e| JsValue::from_str(&format!("Could not serialize result: {:?}", e)))?;

    Ok(res)
}

#[allow(unused)]
fn print_type_of<T: ?Sized>(_: &T) {
    log!("{}", std::any::type_name::<T>());
}

/// Returns a Notary pubkey trusted by this Verifier
fn get_notary_pubkey(pubkey: &str) -> Result<p256::PublicKey, JsValue> {
    p256::PublicKey::from_public_key_pem(pubkey)
        .map_err(|e| JsValue::from_str(&format!("Could not get notary pubkey: {:?}", e)))
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

fn string_list_to_bytes_vec(secrets: &JsValue) -> Result<Vec<Vec<u8>>, JsValue> {
    let array: Array = Array::from(secrets);
    let length = array.length();
    let mut byte_slices: Vec<Vec<u8>> = Vec::new();

    for i in 0..length {
        let secret_js: JsValue = array.get(i);
        let secret_str: String = secret_js
            .as_string()
            .ok_or(JsValue::from_str("Could not convert secret to string"))?;
        let secret_bytes = secret_str.into_bytes();
        byte_slices.push(secret_bytes);
    }
    Ok(byte_slices)
}
